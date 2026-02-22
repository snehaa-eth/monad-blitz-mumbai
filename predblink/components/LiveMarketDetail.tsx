/**
 * LiveMarketDetail - Market detail view for live contract markets
 * Restoring the classic layout with sticky sidebar and chart
 */

import React from 'react';
import { useLiveMarket } from '../lib/contracts/useMarkets';
import { useMarketTrades } from '../lib/contracts/useMarketTrades';
import { ConnectedTradePanel } from './ConnectedTradePanel';
import { TweetDisplay } from './TweetDisplay';
import { BrutalistButton } from './BrutalistButton';
import { MetricBarChart } from './MetricBarChart';
import { useDegenMode } from '../contexts/DegenContext';
import {
    ArrowLeft, Clock, Eye, Heart, Repeat2, MessageCircle, ExternalLink, RefreshCw,
    TrendingUp, Activity, Share, Twitter, Zap, Sparkles, Trophy
} from 'lucide-react';


interface LiveMarketDetailProps {
    marketId: number;
    onBack: () => void;
}

const METRIC_ICONS = [Eye, Heart, Repeat2, MessageCircle];
const METRIC_NAMES = ['VIEWS', 'LIKES', 'RETWEETS', 'COMMENTS'];

// Mock chart data for now (since we don't have historical data yet)
const MOCK_CHART_DATA = [
    { time: '00:00', price: 50 },
    { time: '04:00', price: 52 },
    { time: '08:00', price: 48 },
    { time: '12:00', price: 55 },
    { time: '16:00', price: 62 },
    { time: '20:00', price: 58 },
    { time: '24:00', price: current => current }, // Will be replaced by live price
];

export const LiveMarketDetail: React.FC<LiveMarketDetailProps> = ({ marketId, onBack }) => {
    const { degenMode } = useDegenMode();
    const { market, quotedTweet, isLoading, refetch } = useLiveMarket(marketId);
    const { data: tradesData, refetch: refetchTrades } = useMarketTrades(marketId);

    const handleTradeSuccess = () => {
        refetch();
        refetchTrades();
    };

    const recentTrades = tradesData?.priceHistory?.slice().reverse() || [];

    if (isLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${degenMode ? 'degen-mode bg-[#2d1b54]' : 'bg-[#f0f0f0]'}`}>
                <div className="text-center">
                    <RefreshCw className={`mx-auto mb-4 animate-spin ${degenMode ? 'text-yellow-400' : 'text-gray-400'}`} size={48} />
                    <p className={`font-mono ${degenMode ? 'text-white' : 'text-gray-500'}`}>Loading market...</p>
                </div>
            </div>
        );
    }

    if (!market) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${degenMode ? 'degen-mode bg-[#2d1b54]' : 'bg-[#f0f0f0]'}`}>
                <div className="text-center">
                    <p className={`font-mono mb-4 ${degenMode ? 'text-white' : 'text-gray-500'}`}>Market not found</p>
                    <BrutalistButton onClick={onBack}>Go Back</BrutalistButton>
                </div>
            </div>
        );
    }

    const metricName = METRIC_NAMES[market.metric];

    const formatValue = (value: bigint) => {
        const num = Number(value);
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${Math.floor(num / 1000)}K`;
        return num.toString();
    };

    const isActive = market.status === 0;

    const tweetForDisplay = {
        authorName: market.authorName,
        authorHandle: market.authorHandle,
        avatarUrl: market.avatarUrl || '',
        content: market.tweetText,
        timestamp: '',
        imageUrl: market.media.length > 0 && market.media[0].type === 'image'
            ? market.media[0].url
            : undefined,
        // Include quoted tweet from on-chain data
        quotedTweet: quotedTweet ? {
            authorName: quotedTweet.authorName,
            authorHandle: quotedTweet.authorHandle,
            avatarUrl: '', // Not stored on-chain
            content: quotedTweet.text,
            timestamp: '',
        } : undefined,
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${degenMode ? 'degen-mode' : 'bg-[#f0f0f0]'}`}>
            {/* Header */}
            <div className={`border-b-4 border-black p-4 shadow-sm relative overflow-hidden transition-colors ${degenMode ? 'bg-[#ff00ff]' : 'bg-white'}`}>
                {degenMode && (
                    <>
                        <div className="absolute top-2 right-20 animate-bounce text-yellow-300 opacity-60"><Trophy size={40} /></div>
                        <div className="absolute top-4 left-1/3 animate-pulse text-cyan-200 opacity-40"><Sparkles size={32} /></div>
                    </>
                )}
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BrutalistButton size="sm" variant="outline" onClick={onBack}>
                            <ArrowLeft size={16} />
                        </BrutalistButton>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-banger-yellow text-black font-mono text-[10px] px-2 py-0.5 border border-black uppercase font-bold">
                                    @{market.authorHandle}
                                </span>
                                {isActive && (
                                    <span className="flex items-center gap-1 text-[10px] font-mono text-red-500 font-bold animate-pulse">
                                        <div className="w-2 h-2 bg-red-500 rounded-full" /> LIVE
                                    </span>
                                )}
                            </div>
                            <h1 className={`font-display text-xl md:text-2xl ${degenMode ? 'text-black drop-shadow-[2px_2px_0px_#ecfd00]' : ''}`}>
                                Predicting: Will it hit {formatValue(market.targetValue)} {metricName}?
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">

                {/* Left Column: Chart & Info (Scrollable) */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Tweet Content */}
                    <div className={`border-4 border-black transition-all ${degenMode ? 'bg-white shadow-[12px_12px_0px_0px_#000] text-black' : 'bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
                        <div className={`border-b-4 border-black p-3 flex justify-between items-center ${degenMode ? 'bg-[#ff00ff] text-white' : 'bg-white'}`}>
                            <div className={`font-mono text-sm font-bold flex items-center gap-2 ${degenMode ? 'text-black font-black' : ''}`}>
                                <Twitter size={14} className="fill-current" /> THE TWEET
                            </div>
                            <a href={market.tweetUrl} target="_blank" rel="noopener noreferrer" className={`${degenMode ? 'text-black' : 'text-gray-400'} hover:text-black`}>
                                <ExternalLink size={14} />
                            </a>
                        </div>
                        <div className="p-4 md:p-6">
                            <TweetDisplay tweet={tweetForDisplay} compact={false} />
                        </div>
                    </div>

                    {/* Metric Bar Chart - uses AMM prices from contract */}
                    <MetricBarChart
                        metricName={metricName}
                        targetValue={formatValue(market.targetValue)}
                        yesPrice={market.yesPrice}
                        noPrice={market.noPrice}
                        tradeCount={tradesData?.count || 0}
                    />

                    {/* Live Activity Feed */}
                    <div className={`border-4 border-black transition-all ${degenMode ? 'bg-white shadow-[12px_12px_0px_0px_#000] text-black' : 'bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
                        <div className={`flex items-center justify-between p-4 border-b-4 border-black ${degenMode ? 'bg-[#00ffaa]' : 'bg-white'}`}>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce shadow-[0_0_8px_#00ff00]" />
                                <h3 className={`font-mono text-xs uppercase font-bold ${degenMode ? 'text-black' : 'text-gray-500'}`}>Live Activity</h3>
                            </div>
                            <span className={`font-mono text-[10px] font-bold border-2 border-black px-2 py-0.5 ${degenMode ? 'bg-[#ecfd00] text-black shadow-[2px_2px_0px_0px_#000]' : 'bg-gray-100 text-black'}`}>
                                {tradesData?.count || 0} TRADES
                            </span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-4 custom-scrollbar">
                            <div className="space-y-3">
                                {recentTrades.length > 0 ? (
                                    recentTrades.map((trade, i) => (
                                        <div key={i} className={`flex justify-between items-center font-mono text-sm border-b-2 border-dashed pb-2 last:border-0 last:pb-0 ${degenMode ? 'border-black/20' : 'border-gray-200'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-full border border-black ${degenMode ? 'bg-[#ecfd00]' : 'bg-gray-200'}`} />
                                                <span className={degenMode ? 'font-bold text-black' : ''}>
                                                    {trade.buyer.slice(0, 6)}...{trade.buyer.slice(-4)} <span className={degenMode ? 'text-gray-700' : ''}>bought</span>{' '}
                                                    <span className={trade.isYes ? "text-green-600 font-bold underline" : "text-red-500 font-bold line-through"}>
                                                        {trade.isYes ? 'YES' : 'NO'}
                                                    </span>
                                                </span>
                                            </div>
                                            <span className={`font-bold text-lg ${degenMode ? 'text-black' : ''}`}>${trade.amount}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-400 font-mono text-sm py-4 italic">
                                        No trades yet. Be the first!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Sticky Trade Panel */}
                <div className="lg:col-span-4 relative">
                    <div className="sticky top-32 space-y-4">
                        <ConnectedTradePanel
                            marketId={marketId}
                            metricType={metricName}
                            onSuccess={handleTradeSuccess}
                        />

                        {/* Spread the Hype Box */}
                        <div className={`border-4 border-black transition-all p-4 ${degenMode ? 'bg-white shadow-[12px_12px_0px_0px_#000] text-black' : 'bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
                            <h3 className={`font-display text-lg uppercase mb-3 ${degenMode ? 'text-[#ff00ff]' : ''}`}>Spread the Hype</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button className={`border-2 border-black font-mono text-xs font-bold py-2 flex items-center justify-center gap-2 hover:brightness-110 active:translate-y-0.5 transition-all shadow-hard-sm ${degenMode ? 'bg-[#1DA1F2] text-white' : 'bg-[#1DA1F2] text-white'}`}>
                                    <Twitter size={14} fill="currentColor" /> TWEET
                                </button>
                                <button className={`border-2 border-black font-mono text-xs font-bold py-2 flex items-center justify-center gap-2 hover:bg-gray-50 active:translate-y-0.5 transition-all shadow-hard-sm ${degenMode ? 'bg-[#ecfd00] text-black' : 'bg-white text-black'}`}>
                                    <Share size={14} /> LINK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
