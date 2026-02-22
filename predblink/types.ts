// ── On-chain enums matching PredBlink.sol ──

export enum MarketType {
    PRICE = 0,
    TWITTER = 1,
    BLOCK_DATA = 2,
}

export enum MarketStatus {
    ACTIVE = 0,
    RESOLVED_YES = 1,
    RESOLVED_NO = 2,
    VOIDED = 3,
}

export enum TwitterMetric {
    VIEWS = 0,
    LIKES = 1,
    RETWEETS = 2,
    COMMENTS = 3,
}

// ── On-chain market data ──

export interface OnChainMarket {
    id: number;
    marketType: MarketType;
    feedId: string;
    question: string;
    targetValue: bigint;
    snapshotValue: bigint;
    startTime: number;
    endTime: number;
    endBlock: number;
    status: MarketStatus;
    resolvedValue: bigint;
    yesPool: bigint;
    noPool: bigint;
    yesPriceCents: number;
    noPriceCents: number;
    totalVolume: bigint;
    tradeCount: number;
    creator: string;
    // Metadata (type-specific)
    tweetMeta?: TweetMeta;
    priceMeta?: PriceMeta;
    blockMeta?: BlockMeta;
}

export interface TweetMeta {
    tweetId: string;
    authorHandle: string;
    authorName: string;
    tweetText: string;
    avatarUrl: string;
    metric: TwitterMetric;
}

export interface PriceMeta {
    pair: string;
    decimals: number;
}

export interface BlockMeta {
    metricName: string;
    blockInterval: bigint;
}

// ── UI display types ──

export type MarketCategory = 'ALL' | 'PRICE' | 'TWITTER' | 'BLOCK';
export type MetricType = 'VIEWS' | 'RETWEETS' | 'LIKES' | 'COMMENTS';

export interface UserPosition {
    marketId: number;
    yesShares: bigint;
    noShares: bigint;
    yesValue: number;
    noValue: number;
}

export interface AnalysisResult {
    verdict: 'BANG' | 'BUST';
    reasoning: string;
    hypeScore: number;
    factors: string[];
}
