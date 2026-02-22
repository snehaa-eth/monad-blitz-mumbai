/**
 * Cloudflare Worker - Twitter API Proxy
 * 
 * This worker proxies requests to TwitterAPI.io to avoid CORS issues
 * and keeps the API key secure on the server side.
 * 
 * Endpoints:
 *   GET /tweet/:tweetId - Get tweet by ID
 *   GET /tweets?ids=id1,id2 - Get multiple tweets
 *   GET /health - Health check
 */

export interface Env {
    TWITTER_API_KEY: string;
}

const TWITTER_API_BASE = 'https://api.twitterapi.io';

// CORS headers for browser requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            // Health check endpoint
            if (path === '/health') {
                return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
            }

            // Get single tweet by ID: /tweet/:tweetId
            if (path.startsWith('/tweet/')) {
                const tweetId = path.split('/tweet/')[1];
                if (!tweetId) {
                    return jsonResponse({ error: 'Tweet ID required' }, 400);
                }
                return await fetchTweets([tweetId], env.TWITTER_API_KEY);
            }

            // Get multiple tweets: /tweets?ids=id1,id2,id3
            if (path === '/tweets') {
                const ids = url.searchParams.get('ids');
                if (!ids) {
                    return jsonResponse({ error: 'Tweet IDs required (ids=id1,id2)' }, 400);
                }
                const tweetIds = ids.split(',').map(id => id.trim());
                return await fetchTweets(tweetIds, env.TWITTER_API_KEY);
            }

            // Default: 404
            return jsonResponse({ error: 'Not found', endpoints: ['/tweet/:id', '/tweets?ids=', '/health'] }, 404);

        } catch (error) {
            console.error('Worker error:', error);
            return jsonResponse({ error: 'Internal server error', details: String(error) }, 500);
        }
    },
};

/**
 * Fetch tweets from TwitterAPI.io
 */
async function fetchTweets(tweetIds: string[], apiKey: string): Promise<Response> {
    const idsParam = tweetIds.join(',');
    const apiUrl = `${TWITTER_API_BASE}/twitter/tweets?tweet_ids=${idsParam}`;

    console.log(`[TwitterProxy] Fetching tweets: ${idsParam}`);

    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TwitterProxy] API error: ${response.status} - ${errorText}`);
        return jsonResponse({
            error: 'Twitter API error',
            status: response.status,
            details: errorText,
        }, response.status);
    }

    const data = await response.json();

    // Parse and format the response for easier frontend consumption
    const formattedData = formatTweetResponse(data);

    return jsonResponse(formattedData);
}

/**
 * Format the API response for frontend consumption
 */
function formatTweetResponse(apiResponse: any) {
    const tweets = apiResponse.tweets || apiResponse.data || [];

    const formattedTweets = (Array.isArray(tweets) ? tweets : [tweets]).map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.createdAt,
        author: {
            id: tweet.author?.id,
            name: tweet.author?.name,
            userName: tweet.author?.userName,
            profilePicture: tweet.author?.profilePicture,
            isVerified: tweet.author?.isBlueVerified || tweet.author?.isVerified,
        },
        metrics: {
            views: tweet.viewCount || 0,
            likes: tweet.likeCount || 0,
            retweets: tweet.retweetCount || 0,
            replies: tweet.replyCount || 0,
            quotes: tweet.quoteCount || 0,
            bookmarks: tweet.bookmarkCount || 0,
        },
        media: (tweet.extendedEntities?.media || tweet.entities?.media || []).map((m: any) => ({
            type: m.type === 'photo' ? 'IMAGE' : 'VIDEO',
            url: m.media_url_https || m.url,
        })),
        // Handle both field naming conventions (API uses quoted_tweet)
        quotedTweet: (() => {
            const qt = tweet.quoted_tweet || tweet.quotedTweet;
            if (!qt) return null;
            return {
                id: qt.id,
                text: qt.text,
                author: {
                    id: qt.author?.id,
                    name: qt.author?.name,
                    userName: qt.author?.userName,
                    profilePicture: qt.author?.profilePicture,
                },
            };
        })(),
    }));

    return {
        success: true,
        tweets: formattedTweets,
        raw: apiResponse, // Include raw response for debugging
    };
}

/**
 * Helper to create JSON responses with CORS headers
 */
function jsonResponse(data: any, status: number = 200): Response {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
        },
    });
}
