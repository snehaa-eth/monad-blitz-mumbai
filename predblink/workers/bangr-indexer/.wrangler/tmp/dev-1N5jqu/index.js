var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-Ww8gr3/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-Ww8gr3/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/index.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};
function hexToString(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}
__name(hexToString, "hexToString");
var src_default = {
  /**
   * HTTP Request Handler
   */
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === "/health") {
        return jsonResponse({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      }
      if (path === "/stats") {
        return await getStats(env);
      }
      if (path.startsWith("/trades/")) {
        const address = path.split("/trades/")[1]?.toLowerCase();
        if (!address || !address.startsWith("0x")) {
          return jsonResponse({ error: "Valid address required" }, 400);
        }
        return await getTrades(env, address);
      }
      if (path.startsWith("/markets/")) {
        const address = path.split("/markets/")[1]?.toLowerCase();
        if (!address || !address.startsWith("0x")) {
          return jsonResponse({ error: "Valid address required" }, 400);
        }
        return await getCreatedMarkets(env, address);
      }
      if (path.startsWith("/market-trades/")) {
        const marketIdStr = path.split("/market-trades/")[1];
        const marketId = parseInt(marketIdStr);
        if (isNaN(marketId)) {
          return jsonResponse({ error: "Valid market ID required" }, 400);
        }
        return await getMarketTrades(env, marketId);
      }
      if (path === "/index") {
        const result = await indexEvents(env);
        return jsonResponse(result);
      }
      if (path === "/global-activity") {
        return await getGlobalActivity(env);
      }
      return jsonResponse({
        error: "Not found",
        endpoints: ["/trades/:address", "/markets/:address", "/market-trades/:marketId", "/global-activity", "/stats", "/health"]
      }, 404);
    } catch (error) {
      console.error("Worker error:", error);
      return jsonResponse({ error: "Internal server error", details: String(error) }, 500);
    }
  },
  /**
   * Scheduled Handler - Runs every minute to index new events
   */
  async scheduled(event, env, ctx) {
    console.log("[Indexer] Scheduled run starting...");
    try {
      const result = await indexEvents(env);
      console.log("[Indexer] Indexed:", result);
    } catch (error) {
      console.error("[Indexer] Error:", error);
    }
  }
};
async function getTrades(env, address) {
  const { results } = await env.DB.prepare(`
        SELECT 
            market_id as marketId,
            buyer,
            is_yes as isYes,
            usdc_amount as usdcAmount,
            shares_received as sharesReceived,
            tx_hash as transactionHash,
            block_number as blockNumber,
            indexed_at as indexedAt
        FROM trades 
        WHERE LOWER(buyer) = ?
        ORDER BY block_number DESC
        LIMIT 50
    `).bind(address).all();
  return jsonResponse({
    success: true,
    count: results?.length || 0,
    trades: results || []
  });
}
__name(getTrades, "getTrades");
async function getCreatedMarkets(env, address) {
  const { results } = await env.DB.prepare(`
        SELECT 
            market_id as marketId,
            creator,
            tweet_id as tweetId,
            metric,
            target_value as targetValue,
            category,
            tx_hash as transactionHash,
            block_number as blockNumber,
            indexed_at as indexedAt
        FROM created_markets 
        WHERE LOWER(creator) = ?
        ORDER BY block_number DESC
        LIMIT 50
    `).bind(address).all();
  return jsonResponse({
    success: true,
    count: results?.length || 0,
    markets: results || []
  });
}
__name(getCreatedMarkets, "getCreatedMarkets");
async function getStats(env) {
  const [syncState, tradesCount, marketsCount] = await Promise.all([
    env.DB.prepare("SELECT last_block, last_updated FROM sync_state WHERE id = 1").first(),
    env.DB.prepare("SELECT COUNT(*) as count FROM trades").first(),
    env.DB.prepare("SELECT COUNT(*) as count FROM created_markets").first()
  ]);
  return jsonResponse({
    success: true,
    stats: {
      lastBlock: syncState?.last_block || 0,
      lastUpdated: syncState?.last_updated || null,
      totalTrades: tradesCount?.count || 0,
      totalMarkets: marketsCount?.count || 0
    }
  });
}
__name(getStats, "getStats");
async function getMarketTrades(env, marketId) {
  const { results } = await env.DB.prepare(`
        SELECT 
            market_id as marketId,
            buyer,
            is_yes as isYes,
            usdc_amount as usdcAmount,
            shares_received as sharesReceived,
            tx_hash as transactionHash,
            block_number as blockNumber,
            indexed_at as indexedAt
        FROM trades 
        WHERE market_id = ?
        ORDER BY block_number ASC
        LIMIT 200
    `).bind(marketId).all();
  let yesVolume = 0;
  let noVolume = 0;
  const priceHistory = [];
  for (const trade of results || []) {
    const amount = parseFloat(trade.usdcAmount) / 1e6;
    if (trade.isYes) {
      yesVolume += amount;
    } else {
      noVolume += amount;
    }
    const totalVolume = yesVolume + noVolume;
    const yesPrice = totalVolume > 0 ? Math.round(yesVolume / totalVolume * 100) : 50;
    const noPrice = 100 - yesPrice;
    priceHistory.push({
      blockNumber: trade.blockNumber,
      yesPrice,
      noPrice,
      isYes: !!trade.isYes,
      amount: amount.toFixed(2),
      buyer: trade.buyer
    });
  }
  return jsonResponse({
    success: true,
    marketId,
    count: results?.length || 0,
    trades: results || [],
    priceHistory,
    currentYesPrice: priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].yesPrice : 50,
    currentNoPrice: priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].noPrice : 50
  });
}
__name(getMarketTrades, "getMarketTrades");
async function getGlobalActivity(env) {
  const { results: trades } = await env.DB.prepare(`
        SELECT 
            t.market_id as marketId,
            t.buyer,
            t.is_yes as isYes,
            t.usdc_amount as usdcAmount,
            t.tx_hash as transactionHash,
            t.block_number as blockNumber,
            t.indexed_at as indexedAt,
            m.metric as metric,
            'TRADE' as activityType
        FROM trades t
        LEFT JOIN created_markets m ON t.market_id = m.market_id
        ORDER BY t.block_number DESC
        LIMIT 50
    `).all();
  const { results: markets } = await env.DB.prepare(`
        SELECT 
            market_id as marketId,
            creator,
            metric,
            target_value as targetValue,
            tx_hash as transactionHash,
            block_number as blockNumber,
            indexed_at as indexedAt,
            'CREATE' as activityType
        FROM created_markets
        ORDER BY block_number DESC
        LIMIT 20
    `).all();
  const allActivity = [
    ...(trades || []).map((t) => ({
      type: "TRADE",
      marketId: t.marketId,
      user: t.buyer,
      isYes: !!t.isYes,
      amount: (parseFloat(t.usdcAmount) / 1e6).toFixed(0),
      metric: t.metric,
      txHash: t.transactionHash,
      blockNumber: t.blockNumber,
      timestamp: t.indexedAt
    })),
    ...(markets || []).map((m) => ({
      type: "CREATE",
      marketId: m.marketId,
      user: m.creator,
      metric: m.metric,
      targetValue: m.targetValue,
      txHash: m.transactionHash,
      blockNumber: m.blockNumber,
      timestamp: m.indexedAt
    }))
  ].sort((a, b) => b.blockNumber - a.blockNumber).slice(0, 50);
  return jsonResponse({
    success: true,
    count: allActivity.length,
    activity: allActivity
  });
}
__name(getGlobalActivity, "getGlobalActivity");
async function indexEvents(env) {
  const startTime = Date.now();
  const syncState = await env.DB.prepare(
    "SELECT last_block FROM sync_state WHERE id = 1"
  ).first();
  const fromBlock = syncState?.last_block || parseInt(env.DEPLOYMENT_BLOCK);
  const currentBlock = await getCurrentBlock(env.BSC_RPC_URL);
  if (!currentBlock) {
    return { error: "Failed to get current block" };
  }
  if (fromBlock >= currentBlock) {
    return {
      status: "up_to_date",
      lastBlock: fromBlock,
      currentBlock
    };
  }
  const toBlock = Math.min(fromBlock + 5e3, currentBlock);
  console.log(`[Indexer] Fetching events from block ${fromBlock} to ${toBlock}`);
  const [sharesPurchasedLogs, marketCreatedLogs] = await Promise.all([
    fetchLogs(env, "SharesPurchased", fromBlock, toBlock),
    fetchLogs(env, "MarketCreated", fromBlock, toBlock)
  ]);
  let tradesInserted = 0;
  for (const log of sharesPurchasedLogs) {
    try {
      await env.DB.prepare(`
                INSERT OR IGNORE INTO trades 
                (market_id, buyer, is_yes, usdc_amount, shares_received, tx_hash, block_number)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
        log.marketId,
        log.buyer.toLowerCase(),
        log.isYes ? 1 : 0,
        log.usdcAmount,
        log.sharesReceived,
        log.txHash,
        log.blockNumber
      ).run();
      tradesInserted++;
    } catch (e) {
      console.log("[Indexer] Duplicate trade, skipping");
    }
  }
  let marketsInserted = 0;
  for (const log of marketCreatedLogs) {
    try {
      await env.DB.prepare(`
                INSERT OR IGNORE INTO created_markets 
                (market_id, creator, tweet_id, metric, target_value, category, tx_hash, block_number)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
        log.marketId,
        log.creator.toLowerCase(),
        log.tweetId,
        log.metric,
        log.targetValue,
        log.category,
        log.txHash,
        log.blockNumber
      ).run();
      marketsInserted++;
    } catch (e) {
      console.log("[Indexer] Duplicate market, skipping");
    }
  }
  await env.DB.prepare(
    "UPDATE sync_state SET last_block = ?, last_updated = CURRENT_TIMESTAMP WHERE id = 1"
  ).bind(toBlock).run();
  return {
    status: "indexed",
    fromBlock,
    toBlock,
    currentBlock,
    tradesFound: sharesPurchasedLogs.length,
    tradesInserted,
    marketsFound: marketCreatedLogs.length,
    marketsInserted,
    durationMs: Date.now() - startTime
  };
}
__name(indexEvents, "indexEvents");
async function getCurrentBlock(rpcUrl) {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1
      })
    });
    const data = await response.json();
    return parseInt(data.result, 16);
  } catch (e) {
    console.error("[Indexer] Failed to get block number:", e);
    return null;
  }
}
__name(getCurrentBlock, "getCurrentBlock");
async function fetchLogs(env, eventType, fromBlock, toBlock) {
  const topicHash = getEventTopicHash(eventType);
  try {
    const response = await fetch(env.BSC_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getLogs",
        params: [{
          address: env.MARKET_FACTORY,
          topics: [topicHash],
          fromBlock: "0x" + fromBlock.toString(16),
          toBlock: "0x" + toBlock.toString(16)
        }],
        id: 1
      })
    });
    const data = await response.json();
    if (data.error) {
      console.error("[Indexer] RPC error:", data.error);
      return [];
    }
    const logs = data.result || [];
    console.log(`[Indexer] Found ${logs.length} ${eventType} events`);
    if (eventType === "SharesPurchased") {
      return logs.map((log) => parseSharesPurchasedLog(log));
    } else {
      return logs.map((log) => parseMarketCreatedLog(log));
    }
  } catch (e) {
    console.error("[Indexer] Failed to fetch logs:", e);
    return [];
  }
}
__name(fetchLogs, "fetchLogs");
function parseSharesPurchasedLog(log) {
  const topics = log.topics;
  const data = log.data;
  const marketId = parseInt(topics[1], 16);
  const buyer = "0x" + topics[2].slice(26);
  const dataHex = data.slice(2);
  const isYes = parseInt(dataHex.slice(0, 64), 16) === 1;
  const usdcAmount = BigInt("0x" + dataHex.slice(64, 128)).toString();
  const sharesReceived = BigInt("0x" + dataHex.slice(128, 192)).toString();
  return {
    marketId,
    buyer,
    isYes,
    usdcAmount,
    sharesReceived,
    txHash: log.transactionHash,
    blockNumber: parseInt(log.blockNumber, 16)
  };
}
__name(parseSharesPurchasedLog, "parseSharesPurchasedLog");
function parseMarketCreatedLog(log) {
  const topics = log.topics;
  const data = log.data;
  const marketId = parseInt(topics[1], 16);
  const dataHex = data.slice(2);
  const metric = parseInt(dataHex.slice(64, 128), 16);
  const targetValue = BigInt("0x" + dataHex.slice(128, 192)).toString();
  const creatorSlot = dataHex.slice(256, 320);
  const creator = "0x" + creatorSlot.slice(24);
  const tweetIdOffset = parseInt(dataHex.slice(0, 64), 16) * 2;
  const tweetIdLength = parseInt(dataHex.slice(tweetIdOffset, tweetIdOffset + 64), 16);
  const tweetIdHex = dataHex.slice(tweetIdOffset + 64, tweetIdOffset + 64 + tweetIdLength * 2);
  let tweetId = "";
  try {
    tweetId = hexToString(tweetIdHex);
  } catch {
    tweetId = "unknown";
  }
  const categoryOffset = parseInt(dataHex.slice(192, 256), 16) * 2;
  const categoryLength = parseInt(dataHex.slice(categoryOffset, categoryOffset + 64), 16);
  const categoryHex = dataHex.slice(categoryOffset + 64, categoryOffset + 64 + categoryLength * 2);
  let category = "";
  try {
    category = hexToString(categoryHex);
  } catch {
    category = "";
  }
  return {
    marketId,
    creator,
    tweetId,
    metric,
    targetValue,
    category,
    txHash: log.transactionHash,
    blockNumber: parseInt(log.blockNumber, 16)
  };
}
__name(parseMarketCreatedLog, "parseMarketCreatedLog");
function getEventTopicHash(eventType) {
  const hashes = {
    // keccak256("SharesPurchased(uint256,address,bool,uint256,uint256,uint256)")
    SharesPurchased: "0x0830b253517c7681cb33c8586fff29355b4c027f346bf597887f95162d008fdb",
    // keccak256("MarketCreated(uint256,string,uint8,uint256,string,address)")
    MarketCreated: "0x3bac209ff38f01fa8b944162bf53fea132d7da98e85520f7a33c649d88cc99d0"
  };
  return hashes[eventType];
}
__name(getEventTopicHash, "getEventTopicHash");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
__name(jsonResponse, "jsonResponse");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-Ww8gr3/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-Ww8gr3/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
