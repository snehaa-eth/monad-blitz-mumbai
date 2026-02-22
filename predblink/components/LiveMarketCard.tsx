/**
 * LiveMarketCard - Displays a market from V2 contract
 * Uses on-chain tweet data instead of API fetching
 */

import React, { useState, useEffect } from 'react';
import { ContractMarket } from '../lib/contracts/useMarkets';
import { TweetDisplay } from './TweetDisplay';
import { Clock, ThumbsUp, ThumbsDown, Eye, Heart, MessageCircle, Repeat2, Flame, Zap } from 'lucide-react';
import { fetchTweetData, TweetData } from '../services/twitterService';

interface LiveMarketCardProps {
    market: ContractMarket;
    onClick?: () => void;
    onBuyYes?: () => void;
    onBuyNo?: () => void;
}

const METRIC_ICONS = {
    0: Eye,      // Views
    1: Heart,    // Likes
    2: Repeat2,  // Retweets
    3: MessageCircle, // Replies
};

const METRIC_NAMES = ['VIEWS', 'LIKES', 'RETWEETS', 'COMMENTS'];
// Universal metric colors - match the create modal selection
const METRIC_COLORS = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-orange-500'];
// Hover border colors to match metric
const METRIC_BORDER_COLORS = ['hover:border-blue-500', 'hover:border-red-500', 'hover:border-green-500', 'hover:border-orange-500'];

export const LiveMarketCard: React.FC<LiveMarketCardProps> = ({ market, onClick, onBuyYes, onBuyNo }) => {
    // Calculate time remaining
    const now = Math.floor(Date.now() / 1000);
    const endTime = Number(market.endTime);
    const remaining = endTime - now;
    const isExpired = remaining <= 0;

    const formatTimeRemaining = () => {
        if (isExpired) return 'ENDED';
        const hours = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);
        if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
        return `${hours}h ${mins}m`;
    };

    // Format target value
    const formatTarget = (value: bigint) => {
        const num = Number(value);
        if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.0', '')}M`;
        if (num >= 1000) return `${Math.floor(num / 1000)}K`;
        return num.toString();
    };

    const MetricIcon = METRIC_ICONS[market.metric as keyof typeof METRIC_ICONS] || Eye;
    const metricColor = METRIC_COLORS[market.metric] || 'bg-blue-500';
    const metricHoverColor = METRIC_BORDER_COLORS[market.metric] || 'hover:border-blue-500';
    const metricName = METRIC_NAMES[market.metric] || 'VIEWS';

    const isActive = market.status === 0;

    // Fetch enhanced tweet data (including quoted tweets) from Twitter API
    const [enhancedTweet, setEnhancedTweet] = useState<TweetData | null>(null);

    useEffect(() => {
        if (market.tweetId) {
            fetchTweetData(market.tweetId)
                .then(data => setEnhancedTweet(data))
                .catch(() => { }); // Silently fail - use on-chain data as fallback
        }
    }, [market.tweetId]);

    // Convert on-chain data to Tweet format for TweetDisplay
    // Prioritize on-chain quoted tweet data, fallback to API data
    const quotedTweetDisplay = market.quotedTweet ? {
        authorName: market.quotedTweet.authorName,
        authorHandle: market.quotedTweet.authorHandle,
        avatarUrl: '', // On-chain doesn't store avatar, could fetch from API
        content: market.quotedTweet.text,
        timestamp: '',
    } : (enhancedTweet?.quotedTweet ? {
        authorName: enhancedTweet.quotedTweet.authorName,
        authorHandle: enhancedTweet.quotedTweet.authorHandle,
        avatarUrl: enhancedTweet.quotedTweet.avatarUrl || '',
        content: enhancedTweet.quotedTweet.text,
        timestamp: '',
    } : undefined);

    const tweetForDisplay = {
        authorName: enhancedTweet?.authorName || market.authorName,
        authorHandle: enhancedTweet?.authorHandle || market.authorHandle,
        avatarUrl: enhancedTweet?.avatarUrl || market.avatarUrl || '',
        content: enhancedTweet?.text || market.tweetText,
        timestamp: '',
        imageUrl: enhancedTweet?.imageUrl || (market.media.length > 0 && market.media[0].type === 'image'
            ? market.media[0].url
            : undefined),
        // Include quoted tweet from on-chain data or API
        quotedTweet: quotedTweetDisplay,
    };

    return (
        <div
            onClick={onClick}
            className={`
                market-card group cursor-pointer relative bg-white border-4 border-black shadow-hard 
                transition-all duration-300 flex flex-col w-full
                ${metricHoverColor}
            `}
        >
            {/* Content Container */}
            <div className="p-4 flex flex-col gap-3">

                {/* Header Row: Author | Category | LIVE | Timer */}
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-banger-yellow text-black font-mono text-[10px] px-2 py-1 border-2 border-black uppercase font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            @{market.authorHandle}
                        </span>

                        {market.category && (
                            <span className="bg-gray-100 text-black font-mono text-[10px] px-2 py-1 border border-black uppercase">
                                {market.category}
                            </span>
                        )}

                        {isActive && !isExpired && (
                            <div className="bg-banger-pink text-white font-mono text-[10px] px-2 py-1 border-2 border-black uppercase font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 transform -rotate-3 animate-pulse">
                                <Flame size={12} className="fill-current" /> LIVE
                            </div>
                        )}
                    </div>

                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-1 border border-black whitespace-nowrap ml-2">
                        <Clock size={12} /> {formatTimeRemaining()}
                    </span>
                </div>

                {/* Tweet Embed Preview - Using on-chain data */}
                <div className="border-2 border-black bg-gray-50 p-2 hover:bg-white transition-colors relative overflow-hidden group-hover:border-current min-h-[80px]">
                    <TweetDisplay tweet={tweetForDisplay} compact={true} />
                </div>

                {/* ARCADE STYLE "WILL THIS HIT" BANNER */}
                <div className={`arcade-banner relative border-4 border-black ${metricColor} p-4 mt-2 overflow-hidden group-hover:brightness-110 transition-all`}>
                    <div className="absolute inset-0 opacity-20 pattern-dots pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="absolute -top-3 -left-3 bg-black text-white font-mono text-[10px] font-bold px-2 py-1 uppercase transform -rotate-3 border-2 border-white shadow-sm">
                            Will it hit?
                        </div>

                        <div className="font-display text-4xl md:text-5xl leading-none uppercase text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] stroke-black mt-1">
                            {formatTarget(market.targetValue)}
                        </div>
                        <div className="font-display text-lg text-black bg-white px-2 border-2 border-black transform rotate-1 -mt-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
                            <MetricIcon size={16} /> {metricName}
                        </div>
                    </div>
                </div>

                {/* YES/NO ARCADE BUTTONS */}
                <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onBuyYes?.();
                        }}
                        className="relative bg-white border-2 border-black p-1 group/btn"
                    >
                        <div className="bg-green-100 h-full border-2 border-black p-2 flex flex-col items-center justify-center hover:bg-green-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover/btn:translate-x-[1px] group-hover/btn:translate-y-[1px] group-hover/btn:shadow-none">
                            <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-green-800 mb-1">
                                <ThumbsUp size={12} /> YES
                            </div>
                            <div className="font-display text-2xl text-green-600 leading-none">{market.yesPrice}¢</div>
                        </div>
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onBuyNo?.();
                        }}
                        className="relative bg-white border-2 border-black p-1 group/btn"
                    >
                        <div className="bg-red-100 h-full border-2 border-black p-2 flex flex-col items-center justify-center hover:bg-red-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover/btn:translate-x-[1px] group-hover/btn:translate-y-[1px] group-hover/btn:shadow-none">
                            <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-red-800 mb-1">
                                <ThumbsDown size={12} /> NO
                            </div>
                            <div className="font-display text-2xl text-red-600 leading-none">{market.noPrice}¢</div>
                        </div>
                    </button>
                </div>

                {/* Volume/Status Bar */}
                <div className="flex justify-between items-center border-t-2 border-dashed border-gray-200 pt-2 mt-1">
                    <div className="flex items-center gap-1 text-xs font-mono text-gray-500">
                        <Zap size={14} className="text-banger-pink" />
                        Market #{market.id}
                        {market.totalVolume > BigInt(0) && (
                            <span className="ml-2">
                                Vol: ${(Number(market.totalVolume) / 1e6).toFixed(0)}
                            </span>
                        )}
                    </div>
                    {isActive && !isExpired ? (
                        <span className="font-mono text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 border border-green-500">
                            ACTIVE
                        </span>
                    ) : isExpired && market.status === 0 ? (
                        <span className="font-mono text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 border border-yellow-500">
                            RESOLVING
                        </span>
                    ) : (
                        <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 border border-gray-300">
                            {market.status === 1 ? '✅ YES WON' : '❌ NO WON'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
