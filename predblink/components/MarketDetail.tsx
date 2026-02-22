import React, { useState, useMemo } from 'react';
import { OnChainMarket, MarketType, MarketStatus } from '../types';
import { BrutalistButton } from './BrutalistButton';
import { ConnectedTradePanel } from './ConnectedTradePanel';
import { useMarketTradesOnChain, PricePoint } from '../lib/contracts/useMarketTrades';
import { analyzeVirality } from '../services/geminiService';
import { useDegenMode } from '../contexts/DegenContext';
import {
    BrainCircuit, Activity, Copy, Twitter,
    Clock, ArrowLeft, CheckCircle,
    XCircle, Ban, DollarSign, Cpu,
    ShoppingCart, RefreshCw,
} from 'lucide-react';

interface MarketDetailProps {
    market: OnChainMarket;
    onBack: () => void;
}

function timeRemaining(endTime: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = endTime - now;
    if (diff <= 0) return 'Expired';
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
    return `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h`;
}

function formatTarget(market: OnChainMarket): string {
    if (market.marketType === MarketType.PRICE && market.priceMeta) {
        return `$${(Number(market.targetValue) / 1e8).toLocaleString()}`;
    }
    if (market.marketType === MarketType.BLOCK_DATA) {
        const val = Number(market.targetValue);
        if (val >= 1e9) return `${(val / 1e9).toFixed(1)} gwei`;
        return val.toLocaleString();
    }
    const val = Number(market.targetValue);
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
    if (val >= 1_000) return (val / 1_000).toFixed(1) + 'k';
    return val.toString();
}

const typeLabel = (mt: MarketType) => {
    switch (mt) {
        case MarketType.PRICE: return { label: 'PRICE', icon: <DollarSign size={14} />, color: 'text-blue-400' };
        case MarketType.TWITTER: return { label: 'TWITTER', icon: <Twitter size={14} />, color: 'text-rose-400' };
        case MarketType.BLOCK_DATA: return { label: 'BLOCK DATA', icon: <Cpu size={14} />, color: 'text-emerald-400' };
    }
};

const statusBadge = (s: MarketStatus) => {
    switch (s) {
        case MarketStatus.ACTIVE: return <span className="text-emerald-400 font-bold">ACTIVE</span>;
        case MarketStatus.RESOLVED_YES: return <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle size={14} /> YES WON</span>;
        case MarketStatus.RESOLVED_NO: return <span className="text-rose-400 font-bold flex items-center gap-1"><XCircle size={14} /> NO WON</span>;
        case MarketStatus.VOIDED: return <span className="text-amber-400 font-bold flex items-center gap-1"><Ban size={14} /> VOIDED</span>;
    }
};

function buildChartPoints(history: PricePoint[], currentYes: number): string {
    if (history.length === 0) {
        const y = 150 - (currentYes / 100) * 150;
        return `0,${y} 800,${y}`;
    }
    const points = history.map((p, i) => {
        const x = (i / Math.max(history.length - 1, 1)) * 800;
        const y = 150 - (p.yesPriceCents / 100) * 150;
        return `${x.toFixed(0)},${Math.max(5, Math.min(145, y)).toFixed(0)}`;
    });
    return points.join(' ');
}

export const MarketDetail: React.FC<MarketDetailProps> = ({ market, onBack }) => {
    const { degenMode } = useDegenMode();
    const [aiAnalysis, setAiAnalysis] = useState<{ loading: boolean; result: any | null }>({ loading: false, result: null });
    const [copied, setCopied] = useState(false);

    const { trades, priceHistory, currentYesPrice, currentNoPrice, isLoading: tradesLoading, refetch: refetchTrades } =
        useMarketTradesOnChain(market.id);

    const tl = typeLabel(market.marketType);
    const isActive = market.status === MarketStatus.ACTIVE;
    const volume = (Number(market.totalVolume) / 1e6).toFixed(2);

    const chartPoints = useMemo(() => buildChartPoints(priceHistory, market.yesPriceCents), [priceHistory, market.yesPriceCents]);
    const displayYes = priceHistory.length > 0 ? currentYesPrice : market.yesPriceCents;
    const displayNo = priceHistory.length > 0 ? currentNoPrice : market.noPriceCents;

    const runAiAnalysis = async () => {
        setAiAnalysis({ loading: true, result: null });
        const text = market.tweetMeta?.tweetText || market.question;
        const data = await analyzeVirality(text);
        setAiAnalysis({ loading: false, result: data });
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`max-w-7xl mx-auto px-4 py-8 relative z-10 ${degenMode ? 'degen-mode' : ''}`}>
            <button onClick={onBack} className="flex items-center gap-2 font-mono text-sm text-nitro-muted hover:text-white transition-colors mb-6">
                <ArrowLeft size={16} /> Back to Markets
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Info */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Header */}
                    <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-6 md:p-8 space-y-5">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className={`font-mono text-[10px] px-3 py-1 rounded-full uppercase font-bold tracking-widest border border-[#2a2a30] flex items-center gap-1 ${tl.color}`}>
                                {tl.icon} {tl.label}
                            </span>
                            <span className="font-mono text-[10px]">{statusBadge(market.status)}</span>
                            {isActive && (
                                <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-nitro-muted">
                                    <Clock size={10} /> {timeRemaining(market.endTime)}
                                </span>
                            )}
                        </div>

                        <h1 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight">
                            {market.question || 'Untitled Market'}
                        </h1>

                        {market.tweetMeta && market.tweetMeta.tweetText && (
                            <div className="bg-[#0c0c0f] border border-[#2a2a30] rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                    {market.tweetMeta.avatarUrl && (
                                        <img src={market.tweetMeta.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#2a2a30]" />
                                    )}
                                    <div>
                                        <span className="font-mono text-xs font-bold text-white">{market.tweetMeta.authorName}</span>
                                        <span className="font-mono text-[10px] text-nitro-muted ml-2">@{market.tweetMeta.authorHandle}</span>
                                    </div>
                                </div>
                                <p className="font-mono text-xs text-nitro-text/80 leading-relaxed whitespace-pre-wrap">{market.tweetMeta.tweetText}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <StatBox label="Target" value={formatTarget(market)} />
                            <StatBox label="Volume" value={`$${volume}`} />
                            <StatBox label="Trades" value={String(market.tradeCount)} />
                            {market.snapshotValue > 0n && (
                                <StatBox label="Snapshot" value={
                                    market.marketType === MarketType.PRICE
                                        ? `$${(Number(market.snapshotValue) / 1e8).toLocaleString()}`
                                        : Number(market.snapshotValue).toLocaleString()
                                } />
                            )}
                        </div>
                    </div>

                    {/* Price Chart — from on-chain trades */}
                    <div className="bg-[#111114] border border-[#2a2a30] rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-[#2a2a30] flex justify-between items-center">
                            <div>
                                <span className="font-mono text-[10px] uppercase text-nitro-muted tracking-widest">
                                    Price Chart {priceHistory.length > 0 ? `(${priceHistory.length} trades)` : ''}
                                </span>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="font-display text-xl font-bold text-emerald-400">YES {displayYes}¢</span>
                                    <span className="font-display text-xl font-bold text-rose-400">NO {displayNo}¢</span>
                                </div>
                            </div>
                            <button onClick={refetchTrades} className="font-mono text-[10px] text-nitro-muted flex items-center gap-1 hover:text-white transition-colors">
                                <RefreshCw size={12} className={tradesLoading ? 'animate-spin' : ''} />
                                {tradesLoading ? 'LOADING' : 'REFRESH'}
                            </button>
                        </div>
                        <div className="h-64 bg-[#0c0c0f] relative overflow-hidden">
                            <svg className="w-full h-full" viewBox="0 0 800 150" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <polyline fill="url(#chartGrad)" stroke="#a855f7" strokeWidth="3" points={`${chartPoints} 800,150 0,150`} vectorEffect="non-scaling-stroke" />
                                <polyline fill="none" stroke="#a855f7" strokeWidth="3" points={chartPoints} vectorEffect="non-scaling-stroke" />
                            </svg>
                            {priceHistory.length === 0 && !tradesLoading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="font-mono text-[11px] text-nitro-muted/60">No trades yet — chart updates after first trade</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* On-chain Trade History */}
                    {trades.length > 0 && (
                        <div className="bg-[#111114] border border-[#2a2a30] rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-[#2a2a30]">
                                <span className="font-mono text-[10px] uppercase text-nitro-muted tracking-widest flex items-center gap-2">
                                    <Activity size={12} /> Recent Trades (on-chain)
                                </span>
                            </div>
                            <div className="divide-y divide-[#1a1a1f] max-h-80 overflow-y-auto">
                                {trades.slice().reverse().slice(0, 20).map((t, i) => (
                                    <div key={`${t.txHash}-${i}`} className="flex items-center justify-between px-4 py-2.5 font-mono text-[11px]">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <ShoppingCart size={10} className="text-nitro-muted shrink-0" />
                                            <span className="text-nitro-muted">{t.trader.slice(0, 6)}...{t.trader.slice(-4)}</span>
                                            <span className="text-white font-bold">
                                                {t.isBuy ? 'BOUGHT' : 'SOLD'}
                                            </span>
                                            <span className={t.isYes ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                                {t.isYes ? 'YES' : 'NO'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-white">${(Number(t.usdcAmount) / 1e6).toFixed(2)}</span>
                                            <span className="text-nitro-muted text-[9px]">blk {Number(t.blockNumber)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Oracle */}
                    <div className="bg-gradient-to-br from-[#1a1040] to-[#111114] border border-[#2a2a30] rounded-xl p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute -right-10 -bottom-10 opacity-10">
                            <BrainCircuit size={200} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-nitro-purple/20 rounded-lg">
                                    <BrainCircuit size={24} className="text-nitro-purple" />
                                </div>
                                <h3 className="font-display text-2xl font-bold text-white">AI Vibe Check</h3>
                            </div>
                            <p className="font-mono text-sm text-nitro-muted mb-6 max-w-lg leading-relaxed">
                                Gemini-powered analysis of sentiment, virality, and market dynamics.
                            </p>

                            {!aiAnalysis.result && (
                                <BrutalistButton onClick={runAiAnalysis} disabled={aiAnalysis.loading}>
                                    {aiAnalysis.loading ? 'ANALYZING...' : 'RUN ANALYSIS'}
                                </BrutalistButton>
                            )}

                            {aiAnalysis.result && (
                                <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono text-xs text-nitro-muted uppercase">Verdict</span>
                                        <span className={`font-display text-2xl font-bold ${aiAnalysis.result.verdict === 'BANG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {aiAnalysis.result.verdict}
                                        </span>
                                    </div>
                                    <p className="font-mono text-sm text-nitro-muted italic">{aiAnalysis.result.reasoning}</p>
                                    <div className="w-full bg-[#2a2a30] h-3 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-nitro-purple to-emerald-400 transition-all duration-1000 rounded-full" style={{ width: `${aiAnalysis.result.hypeScore}%` }}></div>
                                    </div>
                                    <span className="font-mono text-[10px] text-nitro-muted">HYPE SCORE: {aiAnalysis.result.hypeScore}/100</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Trade panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="sticky top-24 space-y-6">
                        <ConnectedTradePanel marketId={market.id} market={market} />

                        <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-4">
                            <div className="font-display text-sm font-bold text-white mb-3">Spread the Word</div>
                            <div className="grid grid-cols-2 gap-3">
                                <BrutalistButton
                                    size="sm" variant="outline" className="w-full flex justify-center gap-2"
                                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Betting on: ${market.question}\n\nTrade on PredBlink — Monad Testnet`)}`, '_blank')}
                                >
                                    <Twitter size={14} /> TWEET
                                </BrutalistButton>
                                <BrutalistButton size="sm" variant="outline" className="w-full flex justify-center gap-2" onClick={handleCopyLink}>
                                    {copied ? <span className="text-emerald-400">COPIED</span> : <><Copy size={14} /> LINK</>}
                                </BrutalistButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function StatBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[#0c0c0f] border border-[#2a2a30] rounded-lg px-3 py-3">
            <div className="font-mono text-[9px] uppercase tracking-widest text-nitro-muted mb-0.5">{label}</div>
            <div className="font-display text-lg font-bold text-white">{value}</div>
        </div>
    );
}
