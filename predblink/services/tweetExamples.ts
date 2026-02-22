/**
 * Example TweetData for testing and development
 * Based on: https://x.com/monad_dev/status/2018766825824153735
 */

import { TweetData } from './twitterService';

/**
 * Example TweetData for Monad Dev tweet
 * Tweet ID: 2018766825824153735
 * Author: @monad_dev
 */
export const monadDevTweetExample: TweetData = {
    tweetId: '2018766825824153735',
    text: '🚀 Exciting updates coming to Monad! Our parallel EVM is making huge progress. Stay tuned for more announcements. #Monad #EVM #Blockchain',
    authorHandle: 'monad_dev',
    authorName: 'Monad',
    avatarUrl: 'https://pbs.twimg.com/profile_images/example_monad_dev.jpg',
    imageUrl: null,
    quotedTweet: null,
    views: 125000,
    likes: 3200,
    retweets: 450,
    replies: 180,
    quotes: 95,
    bookmarks: 210,
};

/**
 * Example TweetData with quoted tweet
 */
export const tweetWithQuotedExample: TweetData = {
    tweetId: '2018766825824153736',
    text: 'This is a great thread! 🧵',
    authorHandle: 'example_user',
    authorName: 'Example User',
    avatarUrl: 'https://pbs.twimg.com/profile_images/example.jpg',
    imageUrl: null,
    quotedTweet: {
        tweetId: '2018766825824153735',
        text: '🚀 Exciting updates coming to Monad! Our parallel EVM is making huge progress. Stay tuned for more announcements. #Monad #EVM #Blockchain',
        authorHandle: 'monad_dev',
        authorName: 'Monad',
        avatarUrl: 'https://pbs.twimg.com/profile_images/example_monad_dev.jpg',
    },
    views: 45000,
    likes: 890,
    retweets: 120,
    replies: 45,
    quotes: 30,
    bookmarks: 75,
};

/**
 * Example TweetData with image
 */
export const tweetWithImageExample: TweetData = {
    tweetId: '2018766825824153737',
    text: 'Check out this amazing visualization of our architecture! 📊',
    authorHandle: 'monad_dev',
    authorName: 'Monad',
    avatarUrl: 'https://pbs.twimg.com/profile_images/example_monad_dev.jpg',
    imageUrl: 'https://pbs.twimg.com/media/example_image.jpg',
    quotedTweet: null,
    views: 89000,
    likes: 2100,
    retweets: 320,
    replies: 95,
    quotes: 60,
    bookmarks: 150,
};
