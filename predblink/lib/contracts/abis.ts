/**
 * Contract ABIs for PredBlink.
 *
 * IMPORTANT: Replace PREDBLINK_ABI with the full ABI from
 *   artifacts/contracts/PredBlink.sol/PredBlink.json
 * after running `npx hardhat compile`.
 *
 * The minimal ABI below covers every function the frontend hooks call.
 */

export const PREDBLINK_ABI = [
    // ── Events ──
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "id", type: "uint256" },
            { indexed: true, name: "marketType", type: "uint8" },
            { indexed: false, name: "feedId", type: "bytes32" },
            { indexed: false, name: "question", type: "string" },
            { indexed: false, name: "targetValue", type: "uint256" },
            { indexed: false, name: "endTime", type: "uint256" },
            { indexed: false, name: "endBlock", type: "uint256" },
            { indexed: false, name: "creator", type: "address" },
        ],
        name: "MarketCreated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "marketId", type: "uint256" },
            { indexed: true, name: "trader", type: "address" },
            { indexed: false, name: "isYes", type: "bool" },
            { indexed: false, name: "isBuy", type: "bool" },
            { indexed: false, name: "usdcAmount", type: "uint256" },
            { indexed: false, name: "shares", type: "uint256" },
            { indexed: false, name: "newYesPrice", type: "uint256" },
        ],
        name: "Trade",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "marketId", type: "uint256" },
            { indexed: false, name: "outcome", type: "uint8" },
            { indexed: false, name: "finalValue", type: "uint256" },
        ],
        name: "Resolved",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: "marketId", type: "uint256" },
            { indexed: true, name: "user", type: "address" },
            { indexed: false, name: "payout", type: "uint256" },
        ],
        name: "Claimed",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [{ indexed: true, name: "marketId", type: "uint256" }],
        name: "Voided",
        type: "event",
    },

    // ── View: counts & prices ──
    {
        inputs: [],
        name: "marketCount",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "id", type: "uint256" }],
        name: "getYesPrice",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "id", type: "uint256" }],
        name: "getNoPrice",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "id", type: "uint256" }],
        name: "getYesPriceCents",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "id", type: "uint256" }],
        name: "getNoPriceCents",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "id", type: "uint256" }],
        name: "isExpired",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },

    // ── View: getMarketCore ──
    {
        inputs: [{ name: "id", type: "uint256" }],
        name: "getMarketCore",
        outputs: [
            { name: "marketType", type: "uint8" },
            { name: "feedId", type: "bytes32" },
            { name: "targetValue", type: "uint256" },
            { name: "snapshotValue", type: "uint256" },
            { name: "endTime", type: "uint256" },
            { name: "endBlock", type: "uint256" },
            { name: "status", type: "uint8" },
            { name: "resolvedValue", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },

    // ── View: getMarketAMM ──
    {
        inputs: [{ name: "id", type: "uint256" }],
        name: "getMarketAMM",
        outputs: [
            { name: "yesPool", type: "uint256" },
            { name: "noPool", type: "uint256" },
            { name: "yesPriceCents", type: "uint256" },
            { name: "noPriceCents", type: "uint256" },
            { name: "totalVolume", type: "uint256" },
            { name: "tradeCount", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },

    // ── View: getMarketQuestion ──
    {
        inputs: [{ name: "id", type: "uint256" }],
        name: "getMarketQuestion",
        outputs: [{ name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },

    // ── View: metadata mappings ──
    {
        inputs: [{ name: "", type: "uint256" }],
        name: "tweetMeta",
        outputs: [
            { name: "tweetId", type: "string" },
            { name: "authorHandle", type: "string" },
            { name: "authorName", type: "string" },
            { name: "tweetText", type: "string" },
            { name: "avatarUrl", type: "string" },
            { name: "metric", type: "uint8" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "", type: "uint256" }],
        name: "priceMeta",
        outputs: [
            { name: "pair", type: "string" },
            { name: "decimals", type: "uint8" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "", type: "uint256" }],
        name: "blockMeta",
        outputs: [
            { name: "metricName", type: "string" },
            { name: "blockInterval", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },

    // ── View: user position & estimates ──
    {
        inputs: [
            { name: "id", type: "uint256" },
            { name: "user", type: "address" },
        ],
        name: "getUserPosition",
        outputs: [
            { name: "yesShares", type: "uint256" },
            { name: "noShares", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "id", type: "uint256" },
            { name: "usdcAmount", type: "uint256" },
        ],
        name: "estimateBuyYes",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "id", type: "uint256" },
            { name: "usdcAmount", type: "uint256" },
        ],
        name: "estimateBuyNo",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },

    // ── Write: trading ──
    {
        inputs: [
            { name: "id", type: "uint256" },
            { name: "usdcAmount", type: "uint256" },
        ],
        name: "buyYes",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "id", type: "uint256" },
            { name: "usdcAmount", type: "uint256" },
        ],
        name: "buyNo",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "id", type: "uint256" },
            { name: "shares", type: "uint256" },
        ],
        name: "sellYes",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "id", type: "uint256" },
            { name: "shares", type: "uint256" },
        ],
        name: "sellNo",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },

    // ── Write: resolution ──
    // Permissionless — reads Pyth price from PriceOracle. PRICE markets only.
    {
        inputs: [{ name: "id", type: "uint256" }],
        name: "resolveMarket",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Owner-only manual resolution for TWITTER and BLOCK_DATA markets.
    {
        inputs: [
            { name: "id", type: "uint256" },
            { name: "finalValue", type: "uint256" },
        ],
        name: "resolveManual",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ name: "id", type: "uint256" }],
        name: "claimWinnings",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ name: "id", type: "uint256" }],
        name: "reclaimVoided",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },

    // ── Write: market creation ──
    {
        inputs: [
            { name: "pair", type: "string" },
            { name: "targetPrice", type: "uint256" },
            { name: "duration", type: "uint256" },
            { name: "question", type: "string" },
        ],
        name: "createPriceMarket",
        outputs: [{ name: "id", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "tweetId", type: "string" },
            { name: "metric", type: "uint8" },
            { name: "targetValue", type: "uint256" },
            { name: "duration", type: "uint256" },
            { name: "question", type: "string" },
            { name: "authorHandle", type: "string" },
            { name: "authorName", type: "string" },
            { name: "tweetText", type: "string" },
            { name: "avatarUrl", type: "string" },
        ],
        name: "createTwitterMarket",
        outputs: [{ name: "id", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "metricName", type: "string" },
            { name: "targetValue", type: "uint256" },
            { name: "blockInterval", type: "uint256" },
            { name: "question", type: "string" },
        ],
        name: "createBlockMarket",
        outputs: [{ name: "id", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
    },

    // ── Constants ──
    {
        inputs: [],
        name: "FEE_BPS",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "SEED_LIQUIDITY",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "MIN_DURATION",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

export const MOCK_USDC_ABI = [
    {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        name: "mint",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

export const SHARE_TOKEN_ABI = [
    {
        inputs: [
            { name: "account", type: "address" },
            { name: "id", type: "uint256" },
        ],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "operator", type: "address" },
            { name: "approved", type: "bool" },
        ],
        name: "setApprovalForAll",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "account", type: "address" },
            { name: "operator", type: "address" },
        ],
        name: "isApprovedForAll",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
] as const;
