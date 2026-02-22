import React from 'react';
import { OnChainMarket, MarketType, MarketStatus } from '../types';
import { BrutalistButton } from './BrutalistButton';
import {
    TrendingUp, Clock, Zap, ThumbsUp, ThumbsDown, Flame,
    BarChart3, Activity,
} from 'lucide-react';

interface MarketCardProps {
    market: OnChainMarket;
    onTrade: (market: OnChainMarket) => void;
}

const TYPE_CONFIG: Record<MarketType, { label: string; accent: string; bg: string }> = {
    [MarketType.PRICE]: { label: 'PRICE', accent: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    [MarketType.TWITTER]: { label: 'TWITTER', accent: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    [MarketType.BLOCK_DATA]: { label: 'BLOCK', accent: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
};

const TYPE_ICON: Record<MarketType, React.ReactNode> = {
    [MarketType.PRICE]: <TrendingUp size={12} />,
    [MarketType.TWITTER]: <Activity size={12} />,
    [MarketType.BLOCK_DATA]: <BarChart3 size={12} />,
};

function statusBadge(s: MarketStatus) {
    switch (s) {
        case MarketStatus.ACTIVE:
            return null;
        case MarketStatus.RESOLVED_YES:
            return (
                <span className="font-mono text-[10px] px-3 py-1 rounded-full font-bold tracking-widest border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                    <ThumbsUp size={10} /> YES WON
                </span>
            );
        case MarketStatus.RESOLVED_NO:
            return (
                <span className="font-mono text-[10px] px-3 py-1 rounded-full font-bold tracking-widest border border-rose-500/30 text-rose-400 bg-rose-500/10 flex items-center gap-1">
                    <ThumbsDown size={10} /> NO WON
                </span>
            );
        case MarketStatus.VOIDED:
            return (
                <span className="font-mono text-[10px] px-3 py-1 rounded-full font-bold tracking-widest border border-amber-500/30 text-amber-400 bg-amber-500/10 flex items-center gap-1">
                    VOIDED
                </span>
            );
    }
}

function compactNumber(val: number): string {
    if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (val >= 1_000) return (val / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    return val.toString();
}

function formatTarget(market: OnChainMarket): string {
    if (market.marketType === MarketType.PRICE && market.priceMeta) {
        return `$${(Number(market.targetValue) / 10 ** market.priceMeta.decimals).toLocaleString()}`;
    }
    if (market.marketType === MarketType.BLOCK_DATA) {
        const val = Number(market.targetValue);
        if (val >= 1e9) return `${(val / 1e9).toFixed(1)} gwei`;
        return compactNumber(val);
    }
    return compactNumber(Number(market.targetValue));
}

function formatVolume(totalVolume: bigint): string {
    const usd = Number(totalVolume) / 1e6;
    if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
    if (usd >= 1) return `$${usd.toFixed(0)}`;
    return `$${usd.toFixed(2)}`;
}

function timeRemaining(endTime: number): string {
    const diff = endTime - Math.floor(Date.now() / 1000);
    if (diff <= 0) return 'Expired';
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
    return `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h`;
}

export const MarketCard: React.FC<MarketCardProps> = ({ market, onTrade }) => {
    const tc = TYPE_CONFIG[market.marketType];
    const icon = TYPE_ICON[market.marketType];
    const isActive = market.status === MarketStatus.ACTIVE;
    const badge = statusBadge(market.status);

    return (
        <div
            onClick={() => onTrade(market)}
            className={`glass-card group cursor-pointer relative flex flex-col w-full ${!isActive ? 'opacity-75' : ''}`}
        >
            <div className="p-5 flex flex-col gap-4">
                {/* Header: type badge + status + time */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-mono text-[10px] px-3 py-1 rounded-full uppercase font-bold tracking-widest border ${tc.bg} ${tc.accent} flex items-center gap-1`}>
                            {icon} {tc.label}
                        </span>
                        {badge}
                        {isActive && market.tradeCount > 5 && (
                            <span className="font-mono text-[10px] px-3 py-1 rounded-full uppercase font-bold tracking-widest border border-rose-500/30 text-rose-400 bg-rose-500/10 flex items-center gap-1">
                                <Flame size={10} className="fill-current" /> HOT
                            </span>
                        )}
                    </div>
                    {isActive && (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-3 py-1 rounded-full whitespace-nowrap text-nitro-muted border border-[#2a2a30]">
                            <Clock size={10} /> {timeRemaining(market.endTime)}
                        </span>
                    )}
                </div>

                {/* Question + type-specific context */}
                <div className="space-y-1">
                    <h3 className="font-display text-lg font-bold text-white leading-tight line-clamp-2">
                        {market.question || 'Untitled Market'}
                    </h3>

                    {market.marketType === MarketType.TWITTER && market.tweetMeta && (
                        <div className="bg-[#0c0c0f] rounded-lg border border-[#2a2a30] p-3 flex items-center gap-2">
                            {market.tweetMeta.avatarUrl && (
                                <img src={market.tweetMeta.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-[#2a2a30]" />
                            )}
                            <div className="flex-1 min-w-0">
                                <span className="font-mono text-[10px] text-nitro-muted">@{market.tweetMeta.authorHandle}</span>
                                <p className="text-xs text-nitro-text/70 font-mono line-clamp-2 leading-relaxed">{market.tweetMeta.tweetText}</p>
                            </div>
                        </div>
                    )}

                    {market.marketType === MarketType.PRICE && market.priceMeta && (
                        <div className={`font-mono text-xs font-bold uppercase tracking-widest ${tc.accent}`}>
                            {market.priceMeta.pair}
                        </div>
                    )}

                    {market.marketType === MarketType.BLOCK_DATA && market.blockMeta && (
                        <div className={`font-mono text-xs font-bold uppercase tracking-widest ${tc.accent}`}>
                            {market.blockMeta.metricName}
                        </div>
                    )}
                </div>

                {/* Target value */}
                <div className={`relative ${tc.bg} border rounded-lg p-4 text-center`}>
                    <div className="font-mono text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-[0.2em] bg-[#111114] text-nitro-muted border border-[#2a2a30] inline-block mb-1.5">
                        TARGET
                    </div>
                    <div className="font-display text-3xl font-bold text-white leading-none">
                        {formatTarget(market)}
                    </div>
                    {market.tweetMeta && (
                        <div className={`font-mono text-[11px] font-bold uppercase tracking-[0.2em] mt-1 ${tc.accent}`}>
                            {['VIEWS', 'LIKES', 'RETWEETS', 'COMMENTS'][market.tweetMeta.metric]}
                        </div>
                    )}
                </div>

                {/* YES / NO prices */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-500/5 rounded-lg border border-emerald-500/15 p-3 flex flex-col items-center hover:bg-emerald-500/10 transition-colors">
                        <div className="flex items-center gap-1 font-mono text-[10px] font-bold mb-1 text-emerald-400 tracking-widest">
                            <ThumbsUp size={10} /> YES
                        </div>
                        <div className="font-display text-2xl font-bold text-emerald-300">{market.yesPriceCents}&cent;</div>
                    </div>
                    <div className="bg-rose-500/5 rounded-lg border border-rose-500/15 p-3 flex flex-col items-center hover:bg-rose-500/10 transition-colors">
                        <div className="flex items-center gap-1 font-mono text-[10px] font-bold mb-1 text-rose-400 tracking-widest">
                            <ThumbsDown size={10} /> NO
                        </div>
                        <div className="font-display text-2xl font-bold text-rose-300">{market.noPriceCents}&cent;</div>
                    </div>
                </div>

                {/* Volume + trade count */}
                <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-widest text-nitro-muted px-1">
                    <span className="flex items-center gap-1"><TrendingUp size={12} className="text-nitro-accent" /> {formatVolume(market.totalVolume)}</span>
                    <span>{market.tradeCount} trades</span>
                </div>
            </div>

            {/* Action button */}
            <div className="p-5 pt-0 mt-auto">
                <BrutalistButton
                    className="w-full flex items-center justify-center gap-2"
                    onClick={(e) => { e.stopPropagation(); onTrade(market); }}
                >
                    <Zap size={14} className="fill-current" />
                    {isActive ? 'TRADE NOW' : 'VIEW DETAILS'}
                </BrutalistButton>
            </div>
        </div>
    );
};
