/**
 * Twitter API Service
 * Fetches tweet data via Cloudflare Worker proxy
 * 
 * The worker proxies requests to TwitterAPI.io to avoid CORS issues
 * and keeps the API key secure on the server side.
 */

// Use local worker in development, deployed worker in production
const TWITTER_PROXY_URL = (import.meta as any).env?.PROD
    ? 'https://twitter-proxy.nocaligic.workers.dev'
    : 'http://localhost:8787';

// Simple in-memory cache
const cache = new Map<string, { data: TweetData; timestamp: number }>();
const pendingRequests = new Map<string, Promise<TweetData>>(); // Deduplicate in-flight requests
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface TweetData {
    tweetId: string;
    text: string;
    authorHandle: string;
    authorName: string;
    avatarUrl: string | null;
    imageUrl: string | null;
    quotedTweet: {
        tweetId: string;
        text: string;
        authorHandle: string;
        authorName: string;
        avatarUrl: string | null;
    } | null;
    views: number;
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
    bookmarks: number;
}

/**
 * Extract tweet ID from various URL formats
 * Supports: twitter.com, x.com, mobile links
 */
export function extractTweetId(url: string): string | null {
    // Handle different URL formats
    const patterns = [
        /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
        /status\/(\d+)/,
        /^(\d+)$/, // Just a bare ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
}

/**
 * Extract author handle from URL
 */
export function extractAuthorHandle(url: string): string {
    const match = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
    return match ? match[1] : 'unknown';
}

/**
 * Fetch tweet data from TwitterAPI.io
 */
export async function fetchTweetData(tweetId: string): Promise<TweetData> {
    // Check cache first
    const cached = cache.get(tweetId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[TwitterAPI] Returning cached data for tweet ${tweetId}`);
        return cached.data;
    }

    // Check if request is already in flight
    if (pendingRequests.has(tweetId)) {
        console.log(`[TwitterAPI] Joining in-flight request for tweet ${tweetId}`);
        return pendingRequests.get(tweetId)!;
    }

    console.log(`[TwitterAPI] Fetching metrics for tweet ${tweetId} via Worker proxy`);

    const promise = (async () => {
        try {
            const response = await fetch(
                `${TWITTER_PROXY_URL}/tweet/${tweetId}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                console.error(`[TwitterAPI] Error: ${response.status}`, errorData);

                // If rate limited, return fallback data
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again in a few minutes.');
                }

                throw new Error(errorData.error || `Failed to fetch tweet: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`[TwitterAPI] Worker response:`, data);

            if (!data.success || !data.tweets || data.tweets.length === 0) {
                throw new Error('Tweet not found');
            }

            // Worker returns pre-formatted data
            const tweet = data.tweets[0];
            const author = tweet.author || {};
            const metrics = tweet.metrics || {};

            // Extract metrics from worker response format
            const views = metrics.views ?? 0;
            const likes = metrics.likes ?? 0;
            const retweets = metrics.retweets ?? 0;
            const replies = metrics.replies ?? 0;
            const quotes = metrics.quotes ?? 0;
            const bookmarks = metrics.bookmarks ?? 0;

            // Author profile picture
            const avatarUrl = author.profilePicture || null;

            // Extract media from entities
            const mediaEntities = tweet.media || [];
            const imageUrl = mediaEntities.length > 0 && mediaEntities[0].type === 'IMAGE'
                ? mediaEntities[0].url
                : null;

            // Extract quote tweet
            let quotedTweet = null;
            if (tweet.quotedTweet) {
                const quotedAuthor = tweet.quotedTweet.author || {};
                quotedTweet = {
                    tweetId: tweet.quotedTweet.id,
                    text: tweet.quotedTweet.text,
                    authorHandle: quotedAuthor.userName || 'unknown',
                    authorName: quotedAuthor.name || 'Unknown',
                    avatarUrl: quotedAuthor.profilePicture || null,
                };
            }

            const tweetData: TweetData = {
                tweetId,
                text: tweet.text || '',
                authorHandle: author.userName || 'unknown',
                authorName: author.name || 'Unknown',
                avatarUrl,
                imageUrl,
                quotedTweet,
                views,
                likes,
                retweets,
                replies,
                quotes,
                bookmarks,
            };

            // Cache the result
            cache.set(tweetId, { data: tweetData, timestamp: Date.now() });

            return tweetData;
        } finally {
            // Remove from pending requests when done (success or failure)
            pendingRequests.delete(tweetId);
        }
    })();

    pendingRequests.set(tweetId, promise);
    return promise;
}



/**
 * Fetch tweet data from URL
 */
export async function fetchTweetFromUrl(url: string): Promise<TweetData | null> {
    const tweetId = extractTweetId(url);
    if (!tweetId) {
        console.error('[TwitterAPI] Could not extract tweet ID from URL:', url);
        return null;
    }

    return fetchTweetData(tweetId);
}

/**
 * Get current metric value for a specific metric type
 */
export function getMetricValue(tweetData: TweetData, metricType: 'VIEWS' | 'LIKES' | 'RETWEETS' | 'COMMENTS'): number {
    switch (metricType) {
        case 'VIEWS': return tweetData.views;
        case 'LIKES': return tweetData.likes;
        case 'RETWEETS': return tweetData.retweets;
        case 'COMMENTS': return tweetData.replies;
        default: return 0;
    }
}
