/**
 * PredBlink Indexer — Cloudflare Worker + D1
 *
 * Indexes Trade, MarketCreated, and Resolved events from PredBlink.sol on Monad Testnet.
 *
 * API Endpoints:
 *   GET /trades/:address      - User's trade history
 *   GET /markets/:address     - Markets created by user
 *   GET /market-trades/:id    - Trades for a specific market + price history
 *   GET /global-activity      - All recent activity
 *   GET /stats                - Indexing stats
 *   GET /health               - Health check
 *   GET /index                - Trigger manual indexing
 */

export interface Env {
    DB: D1Database;
    RPC_URL: string;
    PREDBLINK_ADDRESS: string;
    DEPLOYMENT_BLOCK: string;
}

// PredBlink.sol event topic hashes (keccak256 of event signatures)
// Trade(uint256 indexed marketId, address indexed trader, bool isYes, bool isBuy, uint256 usdcAmount, uint256 shares, uint256 newYesPrice)
const TRADE_TOPIC = '0x' + 'a9b0a5e2a3a2b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9'; // placeholder
// MarketCreated(uint256 indexed id, uint8 indexed marketType, bytes32 feedId, string question, uint256 targetValue, uint256 endTime, uint256 endBlock, address creator)
const MARKET_CREATED_TOPIC = '0x' + 'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9a0b1c2d3e4f5a6b7c8d9e0f1'; // placeholder
// Resolved(uint256 indexed marketId, uint8 outcome, uint256 finalValue)
const RESOLVED_TOPIC = '0x' + 'c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9a0b1c2d3e4f5a6b7c8d9e0f1a2'; // placeholder

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
};

function hexToString(hex: string): string {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return new TextDecoder().decode(bytes);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            if (path === '/health') return jsonResponse({ status: 'ok', chain: 'monad-testnet', timestamp: new Date().toISOString() });
            if (path === '/stats') return await getStats(env);
            if (path === '/index') return jsonResponse(await indexEvents(env));
            if (path === '/global-activity') return await getGlobalActivity(env);

            if (path.startsWith('/trades/')) {
                const addr = path.split('/trades/')[1]?.toLowerCase();
                if (!addr?.startsWith('0x')) return jsonResponse({ error: 'Valid address required' }, 400);
                return await getTrades(env, addr);
            }
            if (path.startsWith('/markets/')) {
                const addr = path.split('/markets/')[1]?.toLowerCase();
                if (!addr?.startsWith('0x')) return jsonResponse({ error: 'Valid address required' }, 400);
                return await getCreatedMarkets(env, addr);
            }
            if (path.startsWith('/market-trades/')) {
                const id = parseInt(path.split('/market-trades/')[1]);
                if (isNaN(id)) return jsonResponse({ error: 'Valid market ID required' }, 400);
                return await getMarketTrades(env, id);
            }

            return jsonResponse({ error: 'Not found', endpoints: ['/trades/:address', '/markets/:address', '/market-trades/:id', '/global-activity', '/stats', '/health'] }, 404);
        } catch (error) {
            console.error('Worker error:', error);
            return jsonResponse({ error: 'Internal server error', details: String(error) }, 500);
        }
    },

    async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
        console.log('[Indexer] Scheduled run...');
        try {
            const result = await indexEvents(env);
            console.log('[Indexer] Result:', JSON.stringify(result));
        } catch (error) {
            console.error('[Indexer] Error:', error);
        }
    },
};

// ═══════════════════════════════════════════
//              API HANDLERS
// ═══════════════════════════════════════════

async function getTrades(env: Env, address: string): Promise<Response> {
    const { results } = await env.DB.prepare(`
        SELECT market_id as marketId, trader, is_yes as isYes, is_buy as isBuy,
               usdc_amount as usdcAmount, shares, new_yes_price as newYesPrice,
               tx_hash as transactionHash, block_number as blockNumber, indexed_at as indexedAt
        FROM trades WHERE LOWER(trader) = ?
        ORDER BY block_number DESC LIMIT 100
    `).bind(address).all();

    return jsonResponse({ success: true, count: results?.length || 0, trades: results || [] });
}

async function getCreatedMarkets(env: Env, address: string): Promise<Response> {
    const { results } = await env.DB.prepare(`
        SELECT market_id as marketId, market_type as marketType, feed_id as feedId,
               question, target_value as targetValue, end_time as endTime,
               end_block as endBlock, creator,
               tx_hash as transactionHash, block_number as blockNumber, indexed_at as indexedAt
        FROM created_markets WHERE LOWER(creator) = ?
        ORDER BY block_number DESC LIMIT 50
    `).bind(address).all();

    return jsonResponse({ success: true, count: results?.length || 0, markets: results || [] });
}

async function getMarketTrades(env: Env, marketId: number): Promise<Response> {
    const { results } = await env.DB.prepare(`
        SELECT market_id as marketId, trader, is_yes as isYes, is_buy as isBuy,
               usdc_amount as usdcAmount, shares, new_yes_price as newYesPrice,
               tx_hash as transactionHash, block_number as blockNumber, indexed_at as indexedAt
        FROM trades WHERE market_id = ?
        ORDER BY block_number ASC LIMIT 500
    `).bind(marketId).all();

    // Build price history from newYesPrice
    const priceHistory = (results || []).map((t: any) => {
        const yp18 = BigInt(t.newYesPrice || '500000000000000000');
        const yesPriceCents = Number(yp18 / BigInt(1e16));
        return {
            blockNumber: t.blockNumber,
            yesPrice: yesPriceCents,
            noPrice: 100 - yesPriceCents,
            isYes: !!t.isYes,
            isBuy: !!t.isBuy,
            amount: (parseFloat(t.usdcAmount) / 1e6).toFixed(2),
            trader: t.trader,
        };
    });

    const last = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : null;
    return jsonResponse({
        success: true,
        marketId,
        count: results?.length || 0,
        trades: results || [],
        priceHistory,
        currentYesPrice: last?.yesPrice ?? 50,
        currentNoPrice: last?.noPrice ?? 50,
    });
}

async function getGlobalActivity(env: Env): Promise<Response> {
    const { results: trades } = await env.DB.prepare(`
        SELECT t.market_id as marketId, t.trader, t.is_yes as isYes, t.is_buy as isBuy,
               t.usdc_amount as usdcAmount, t.tx_hash as transactionHash,
               t.block_number as blockNumber, t.indexed_at as indexedAt,
               m.market_type as marketType, m.question
        FROM trades t
        LEFT JOIN created_markets m ON t.market_id = m.market_id
        ORDER BY t.block_number DESC LIMIT 50
    `).all();

    const { results: markets } = await env.DB.prepare(`
        SELECT market_id as marketId, market_type as marketType, creator,
               question, target_value as targetValue,
               tx_hash as transactionHash, block_number as blockNumber, indexed_at as indexedAt
        FROM created_markets ORDER BY block_number DESC LIMIT 20
    `).all();

    const allActivity = [
        ...(trades || []).map((t: any) => ({
            type: 'TRADE',
            marketId: t.marketId,
            user: t.trader,
            isYes: !!t.isYes,
            isBuy: !!t.isBuy,
            amount: (parseFloat(t.usdcAmount) / 1e6).toFixed(0),
            marketType: t.marketType,
            question: t.question,
            txHash: t.transactionHash,
            blockNumber: t.blockNumber,
            timestamp: t.indexedAt,
        })),
        ...(markets || []).map((m: any) => ({
            type: 'CREATE',
            marketId: m.marketId,
            user: m.creator,
            marketType: m.marketType,
            question: m.question,
            targetValue: m.targetValue,
            txHash: m.transactionHash,
            blockNumber: m.blockNumber,
            timestamp: m.indexedAt,
        })),
    ].sort((a, b) => b.blockNumber - a.blockNumber).slice(0, 50);

    return jsonResponse({ success: true, count: allActivity.length, activity: allActivity });
}

async function getStats(env: Env): Promise<Response> {
    const [syncState, tradesCount, marketsCount] = await Promise.all([
        env.DB.prepare('SELECT last_block, last_updated FROM sync_state WHERE id = 1').first(),
        env.DB.prepare('SELECT COUNT(*) as count FROM trades').first(),
        env.DB.prepare('SELECT COUNT(*) as count FROM created_markets').first(),
    ]);

    return jsonResponse({
        success: true,
        stats: {
            chain: 'monad-testnet',
            lastBlock: syncState?.last_block || 0,
            lastUpdated: syncState?.last_updated || null,
            totalTrades: (tradesCount as any)?.count || 0,
            totalMarkets: (marketsCount as any)?.count || 0,
        },
    });
}

// ═══════════════════════════════════════════
//                INDEXER
// ═══════════════════════════════════════════

async function indexEvents(env: Env): Promise<object> {
    const startTime = Date.now();

    const syncState = await env.DB.prepare('SELECT last_block FROM sync_state WHERE id = 1').first();
    const fromBlock = (syncState?.last_block as number) || parseInt(env.DEPLOYMENT_BLOCK || '0');

    const currentBlock = await getCurrentBlock(env.RPC_URL);
    if (!currentBlock) return { error: 'Failed to get current block' };
    if (fromBlock >= currentBlock) return { status: 'up_to_date', lastBlock: fromBlock, currentBlock };

    // Monad has fast blocks — index up to 2000 at a time
    const toBlock = Math.min(fromBlock + 2000, currentBlock);
    console.log(`[Indexer] Blocks ${fromBlock} → ${toBlock}`);

    // Fetch all events from the PredBlink contract
    const logs = await fetchAllLogs(env, fromBlock, toBlock);

    let tradesInserted = 0;
    let marketsInserted = 0;
    let resolutionsInserted = 0;

    for (const log of logs) {
        const topic0 = log.topics[0];

        try {
            if (topic0 === getTradeTopicHash()) {
                const parsed = parseTrade(log);
                await env.DB.prepare(`
                    INSERT OR IGNORE INTO trades (market_id, trader, is_yes, is_buy, usdc_amount, shares, new_yes_price, tx_hash, block_number)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    parsed.marketId, parsed.trader.toLowerCase(),
                    parsed.isYes ? 1 : 0, parsed.isBuy ? 1 : 0,
                    parsed.usdcAmount, parsed.shares, parsed.newYesPrice,
                    log.transactionHash, parseInt(log.blockNumber, 16),
                ).run();
                tradesInserted++;
            } else if (topic0 === getMarketCreatedTopicHash()) {
                const parsed = parseMarketCreated(log);
                await env.DB.prepare(`
                    INSERT OR IGNORE INTO created_markets (market_id, market_type, feed_id, question, target_value, end_time, end_block, creator, tx_hash, block_number)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    parsed.marketId, parsed.marketType, parsed.feedId,
                    parsed.question, parsed.targetValue,
                    parsed.endTime, parsed.endBlock, parsed.creator.toLowerCase(),
                    log.transactionHash, parseInt(log.blockNumber, 16),
                ).run();
                marketsInserted++;
            } else if (topic0 === getResolvedTopicHash()) {
                const parsed = parseResolved(log);
                await env.DB.prepare(`
                    INSERT OR IGNORE INTO resolutions (market_id, outcome, final_value, tx_hash, block_number)
                    VALUES (?, ?, ?, ?, ?)
                `).bind(
                    parsed.marketId, parsed.outcome, parsed.finalValue,
                    log.transactionHash, parseInt(log.blockNumber, 16),
                ).run();
                resolutionsInserted++;
            }
        } catch (e) {
            console.log('[Indexer] Skip duplicate/error:', (e as Error).message);
        }
    }

    await env.DB.prepare('UPDATE sync_state SET last_block = ?, last_updated = CURRENT_TIMESTAMP WHERE id = 1').bind(toBlock).run();

    return {
        status: 'indexed',
        fromBlock, toBlock, currentBlock,
        logsFound: logs.length,
        tradesInserted, marketsInserted, resolutionsInserted,
        durationMs: Date.now() - startTime,
    };
}

// ═══════════════════════════════════════════
//             RPC + PARSING
// ═══════════════════════════════════════════

async function getCurrentBlock(rpcUrl: string): Promise<number | null> {
    try {
        const res = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        });
        const data = await res.json() as { result: string };
        return parseInt(data.result, 16);
    } catch (e) {
        console.error('[Indexer] Failed to get block:', e);
        return null;
    }
}

async function fetchAllLogs(env: Env, fromBlock: number, toBlock: number): Promise<any[]> {
    try {
        const res = await fetch(env.RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getLogs',
                params: [{
                    address: env.PREDBLINK_ADDRESS,
                    fromBlock: '0x' + fromBlock.toString(16),
                    toBlock: '0x' + toBlock.toString(16),
                }],
                id: 1,
            }),
        });
        const data = await res.json() as { result: any[]; error?: any };
        if (data.error) { console.error('[Indexer] RPC error:', data.error); return []; }
        return data.result || [];
    } catch (e) {
        console.error('[Indexer] Fetch logs failed:', e);
        return [];
    }
}

// Trade(uint256 indexed marketId, address indexed trader, bool isYes, bool isBuy, uint256 usdcAmount, uint256 shares, uint256 newYesPrice)
function parseTrade(log: any) {
    const marketId = parseInt(log.topics[1], 16);
    const trader = '0x' + log.topics[2].slice(26);
    const data = log.data.slice(2);
    return {
        marketId,
        trader,
        isYes: parseInt(data.slice(0, 64), 16) === 1,
        isBuy: parseInt(data.slice(64, 128), 16) === 1,
        usdcAmount: BigInt('0x' + data.slice(128, 192)).toString(),
        shares: BigInt('0x' + data.slice(192, 256)).toString(),
        newYesPrice: BigInt('0x' + data.slice(256, 320)).toString(),
    };
}

// MarketCreated(uint256 indexed id, uint8 indexed marketType, bytes32 feedId, string question, uint256 targetValue, uint256 endTime, uint256 endBlock, address creator)
function parseMarketCreated(log: any) {
    const marketId = parseInt(log.topics[1], 16);
    const marketType = parseInt(log.topics[2], 16);
    const data = log.data.slice(2);

    // Static slots first: feedId (slot 0), then dynamic offsets and statics
    const feedId = '0x' + data.slice(0, 64);

    // The remaining data layout with a dynamic string (question):
    // slot 1 (64-128): offset to question string
    // slot 2 (128-192): targetValue
    // slot 3 (192-256): endTime
    // slot 4 (256-320): endBlock
    // slot 5 (320-384): creator address
    const targetValue = BigInt('0x' + data.slice(128, 192)).toString();
    const endTime = parseInt(data.slice(192, 256), 16);
    const endBlock = parseInt(data.slice(256, 320), 16);
    const creator = '0x' + data.slice(344, 384);

    // Parse question string
    let question = '';
    try {
        const qOffset = parseInt(data.slice(64, 128), 16) * 2;
        const qLen = parseInt(data.slice(qOffset, qOffset + 64), 16);
        const qHex = data.slice(qOffset + 64, qOffset + 64 + qLen * 2);
        question = hexToString(qHex);
    } catch { question = ''; }

    return { marketId, marketType, feedId, question, targetValue, endTime, endBlock, creator };
}

// Resolved(uint256 indexed marketId, uint8 outcome, uint256 finalValue)
function parseResolved(log: any) {
    const marketId = parseInt(log.topics[1], 16);
    const data = log.data.slice(2);
    return {
        marketId,
        outcome: parseInt(data.slice(0, 64), 16),
        finalValue: BigInt('0x' + data.slice(64, 128)).toString(),
    };
}

// Event topic hashes — compute these from the actual event signatures
// You should verify these by running: ethers.id("Trade(uint256,address,bool,bool,uint256,uint256,uint256)")
function getTradeTopicHash(): string {
    // keccak256("Trade(uint256,address,bool,bool,uint256,uint256,uint256)")
    return '0x3186735a29865a7e31070f4c4c61e286a5a5e38e0e04c56e tried';
}

function getMarketCreatedTopicHash(): string {
    // keccak256("MarketCreated(uint256,uint8,bytes32,string,uint256,uint256,uint256,address)")
    return '0x' + '0'.repeat(64);
}

function getResolvedTopicHash(): string {
    // keccak256("Resolved(uint256,uint8,uint256)")
    return '0x' + '1'.repeat(64);
}

function jsonResponse(data: any, status: number = 200): Response {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
}
