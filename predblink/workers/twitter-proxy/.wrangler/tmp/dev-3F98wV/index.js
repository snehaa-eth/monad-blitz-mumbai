var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-T2fuvi/checked-fetch.js
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

// .wrangler/tmp/bundle-T2fuvi/strip-cf-connecting-ip-header.js
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
var TWITTER_API_BASE = "https://api.twitterapi.io";
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};
var src_default = {
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
      if (path.startsWith("/tweet/")) {
        const tweetId = path.split("/tweet/")[1];
        if (!tweetId) {
          return jsonResponse({ error: "Tweet ID required" }, 400);
        }
        return await fetchTweets([tweetId], env.TWITTER_API_KEY);
      }
      if (path === "/tweets") {
        const ids = url.searchParams.get("ids");
        if (!ids) {
          return jsonResponse({ error: "Tweet IDs required (ids=id1,id2)" }, 400);
        }
        const tweetIds = ids.split(",").map((id) => id.trim());
        return await fetchTweets(tweetIds, env.TWITTER_API_KEY);
      }
      return jsonResponse({ error: "Not found", endpoints: ["/tweet/:id", "/tweets?ids=", "/health"] }, 404);
    } catch (error) {
      console.error("Worker error:", error);
      return jsonResponse({ error: "Internal server error", details: String(error) }, 500);
    }
  }
};
async function fetchTweets(tweetIds, apiKey) {
  const idsParam = tweetIds.join(",");
  const apiUrl = `${TWITTER_API_BASE}/twitter/tweets?tweet_ids=${idsParam}`;
  console.log(`[TwitterProxy] Fetching tweets: ${idsParam}`);
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TwitterProxy] API error: ${response.status} - ${errorText}`);
    return jsonResponse({
      error: "Twitter API error",
      status: response.status,
      details: errorText
    }, response.status);
  }
  const data = await response.json();
  const formattedData = formatTweetResponse(data);
  return jsonResponse(formattedData);
}
__name(fetchTweets, "fetchTweets");
function formatTweetResponse(apiResponse) {
  const tweets = apiResponse.tweets || apiResponse.data || [];
  const formattedTweets = (Array.isArray(tweets) ? tweets : [tweets]).map((tweet) => ({
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.createdAt,
    author: {
      id: tweet.author?.id,
      name: tweet.author?.name,
      userName: tweet.author?.userName,
      profilePicture: tweet.author?.profilePicture,
      isVerified: tweet.author?.isBlueVerified || tweet.author?.isVerified
    },
    metrics: {
      views: tweet.viewCount || 0,
      likes: tweet.likeCount || 0,
      retweets: tweet.retweetCount || 0,
      replies: tweet.replyCount || 0,
      quotes: tweet.quoteCount || 0,
      bookmarks: tweet.bookmarkCount || 0
    },
    media: (tweet.extendedEntities?.media || tweet.entities?.media || []).map((m) => ({
      type: m.type === "photo" ? "IMAGE" : "VIDEO",
      url: m.media_url_https || m.url
    })),
    // Handle both field naming conventions (API uses quoted_tweet)
    quotedTweet: (() => {
      const qt = tweet.quoted_tweet || tweet.quotedTweet;
      if (!qt)
        return null;
      return {
        id: qt.id,
        text: qt.text,
        author: {
          id: qt.author?.id,
          name: qt.author?.name,
          userName: qt.author?.userName,
          profilePicture: qt.author?.profilePicture
        }
      };
    })()
  }));
  return {
    success: true,
    tweets: formattedTweets,
    raw: apiResponse
    // Include raw response for debugging
  };
}
__name(formatTweetResponse, "formatTweetResponse");
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

// .wrangler/tmp/bundle-T2fuvi/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-T2fuvi/middleware-loader.entry.ts
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
