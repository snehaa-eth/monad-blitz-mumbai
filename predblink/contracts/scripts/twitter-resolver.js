/**
 * Twitter Market Resolver — fetches tweet metrics and resolves expired markets.
 *
 * Flow:
 *   1. Scans PredBlink for expired TWITTER markets
 *   2. Fetches current engagement from Twitter API v2
 *   3. Calls MarketResolver.resolveManual(marketId, finalValue) on-chain
 *
 * Usage:
 *   node scripts/twitter-resolver.js --interval 30
 *
 * Env:
 *   PRIVATE_KEY        — keeper wallet private key
 *   MONAD_RPC_URL      — default https://testnet-rpc.monad.xyz
 *   TWITTER_BEARER_TOKEN — Twitter API v2 Bearer token
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const INTERVAL = process.argv.includes("--interval") ?
    parseInt(process.argv[process.argv.indexOf("--interval") + 1]) : 30;
const RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

// ── ABI fragments ───────────────────────────

const PREDBLINK_ABI = [
    "function marketCount() external view returns (uint256)",
    "function isExpired(uint256 id) external view returns (bool)",
    "function getMarketCore(uint256 id) external view returns (uint8 marketType, bytes32 feedId, uint256 targetValue, uint256 snapshotValue, uint256 endTime, uint256 endBlock, uint8 status, uint256 resolvedValue)",
    "function tweetMeta(uint256 id) external view returns (string tweetId, string authorHandle, string authorName, string tweetText, string avatarUrl, uint8 metric)",
];

const RESOLVER_ABI = [
    "function resolveManual(uint256 marketId, uint256 finalValue) external",
    "function resolveBatch(uint256[] calldata marketIds, uint256[] calldata finalValues) external",
];

// ── Twitter API v2 ──────────────────────────

const METRIC_NAMES = ["impression_count", "like_count", "retweet_count", "reply_count"];

async function fetchTweetMetrics(tweetId) {
    const token = process.env.TWITTER_BEARER_TOKEN;
    if (!token) {
        console.log("  [MOCK] No TWITTER_BEARER_TOKEN — generating mock data");
        return {
            impression_count: Math.floor(Math.random() * 50000),
            like_count:       Math.floor(Math.random() * 5000),
            retweet_count:    Math.floor(Math.random() * 1000),
            reply_count:      Math.floor(Math.random() * 500),
        };
    }

    const url = `https://api.x.com/2/tweets/${tweetId}?tweet.fields=public_metrics`;
    const resp = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` },
    });

    if (!resp.ok) {
        throw new Error(`Twitter API error: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();
    return data.data?.public_metrics || {};
}

// ── Load deployed addresses ─────────────────

function loadAddresses() {
    const p = path.join(__dirname, "..", "deployed-predblink.json");
    if (!fs.existsSync(p)) {
        console.error("deployed-predblink.json not found. Run deploy first.");
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(p, "utf-8"));
}

// ── Scan & resolve ──────────────────────────

async function scanAndResolve(predBlink, resolver) {
    const count = await predBlink.marketCount();
    console.log(`[${new Date().toISOString()}] Scanning ${count} markets...`);

    const toResolve = [];

    for (let i = 0; i < count; i++) {
        const [marketType, , , , , , status] = await predBlink.getMarketCore(i);

        // marketType 1 = TWITTER, status 0 = ACTIVE
        if (Number(marketType) !== 1 || Number(status) !== 0) continue;

        const expired = await predBlink.isExpired(i);
        if (!expired) continue;

        console.log(`  Market #${i}: TWITTER, expired — fetching metrics...`);

        try {
            const meta = await predBlink.tweetMeta(i);
            const tweetId = meta.tweetId;
            const metricIdx = Number(meta.metric);
            const metricField = METRIC_NAMES[metricIdx] || "impression_count";

            const metrics = await fetchTweetMetrics(tweetId);
            const value = metrics[metricField] || 0;

            console.log(`    Tweet ${tweetId}: ${metricField} = ${value}`);
            toResolve.push({ marketId: i, finalValue: value });
        } catch (err) {
            console.error(`    Failed to fetch tweet #${i}:`, err.message);
        }
    }

    if (toResolve.length === 0) {
        console.log("  No Twitter markets to resolve\n");
        return;
    }

    // Batch resolve if multiple
    if (toResolve.length > 1) {
        const ids    = toResolve.map(r => r.marketId);
        const values = toResolve.map(r => r.finalValue);
        try {
            const tx = await resolver.resolveBatch(ids, values);
            const receipt = await tx.wait();
            console.log(`  Batch resolved ${ids.length} markets: ${receipt.hash}\n`);
        } catch (err) {
            console.error("  Batch resolve failed:", err.message);
            // Fall back to individual resolution
            for (const r of toResolve) {
                try {
                    const tx = await resolver.resolveManual(r.marketId, r.finalValue);
                    await tx.wait();
                    console.log(`  Resolved market #${r.marketId}: ${tx.hash}`);
                } catch (e) {
                    console.error(`  Failed market #${r.marketId}:`, e.message);
                }
            }
        }
    } else {
        const r = toResolve[0];
        try {
            const tx = await resolver.resolveManual(r.marketId, r.finalValue);
            const receipt = await tx.wait();
            console.log(`  Resolved market #${r.marketId}: ${receipt.hash}\n`);
        } catch (err) {
            console.error(`  Resolve failed:`, err.message);
        }
    }
}

// ── Main ────────────────────────────────────

async function main() {
    console.log("╔═══════════════════════════════════════════╗");
    console.log("║   PredBlink Twitter Resolver              ║");
    console.log("╚═══════════════════════════════════════════╝");
    console.log(`Interval: ${INTERVAL}s\n`);

    const addrs = loadAddresses();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const predBlink = new ethers.Contract(addrs.predBlink, PREDBLINK_ABI, wallet);
    const resolver  = new ethers.Contract(addrs.marketResolver, RESOLVER_ABI, wallet);

    console.log(`Keeper:    ${wallet.address}`);
    console.log(`PredBlink: ${addrs.predBlink}`);
    console.log(`Resolver:  ${addrs.marketResolver}\n`);

    await scanAndResolve(predBlink, resolver);

    setInterval(async () => {
        try {
            await scanAndResolve(predBlink, resolver);
        } catch (err) {
            console.error(`[${new Date().toISOString()}] Error:`, err.message);
        }
    }, INTERVAL * 1000);
}

main().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});
