import React, { useState, useMemo, useEffect } from 'react';
import {
    ArrowLeft, Clock, TrendingUp, ThumbsUp, ThumbsDown,
    Loader2, Check, DollarSign, Zap, Activity, BarChart3, RefreshCw,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { OnChainMarket, MarketType, MarketStatus, TwitterMetric } from '../types';
import {
    useBuyYes, useBuyNo, useApproveUsdc, useUsdcAllowance,
    useUsdcBalance, useUserPosition, useEstimateBuyYes, useEstimateBuyNo,
    useClaimWinnings, formatShares, formatUsdc,
} from '../lib/contracts/hooks';
import { useMarketTradesOnChain, PricePoint } from '../lib/contracts/useMarketTrades';
import { BrutalistButton } from './BrutalistButton';

// ── helpers ────────────────────────────────────────────────────────────────

function timeRemaining(endTime: number): string {
    const diff = endTime - Math.floor(Date.now() / 1000);
    if (diff <= 0) return 'Expired';
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
    return `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h`;
}

function formatVolume(v: bigint) {
    const usd = Number(v) / 1e6;
    if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
    return `$${usd.toFixed(2)}`;
}

function formatTarget(market: OnChainMarket): string {
    if (market.marketType === MarketType.PRICE && market.priceMeta)
        return `$${(Number(market.targetValue) / 10 ** market.priceMeta.decimals).toLocaleString()}`;
    if (market.marketType === MarketType.BLOCK_DATA) {
        const v = Number(market.targetValue);
        return v >= 1e9 ? `${(v / 1e9).toFixed(1)} gwei` : v.toLocaleString();
    }
    return Number(market.targetValue).toLocaleString();
}

function shortAddr(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const METRIC_LABELS = ['VIEWS', 'LIKES', 'RETWEETS', 'COMMENTS'];

const TYPE_CONFIG: Record<MarketType, { label: string; accent: string; icon: React.ReactNode }> = {
    [MarketType.PRICE]:      { label: 'PRICE',   accent: 'text-blue-400',   icon: <TrendingUp size={11} /> },
    [MarketType.TWITTER]:    { label: 'TWITTER', accent: 'text-purple-400', icon: <Activity size={11} /> },
    [MarketType.BLOCK_DATA]: { label: 'BLOCK',   accent: 'text-amber-400',  icon: <BarChart3 size={11} /> },
};

const STATUS_STYLE: Record<MarketStatus, string> = {
    [MarketStatus.ACTIVE]:       'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    [MarketStatus.RESOLVED_YES]: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
    [MarketStatus.RESOLVED_NO]:  'text-rose-300   border-rose-400/30   bg-rose-500/10',
    [MarketStatus.VOIDED]:       'text-amber-400  border-amber-500/30  bg-amber-500/10',
};

const STATUS_LABEL: Record<MarketStatus, string> = {
    [MarketStatus.ACTIVE]:       'ACTIVE',
    [MarketStatus.RESOLVED_YES]: 'RESOLVED · YES WON',
    [MarketStatus.RESOLVED_NO]:  'RESOLVED · NO WON',
    [MarketStatus.VOIDED]:       'VOIDED',
};

// ── SVG probability chart ───────────────────────────────────────────────────

function ProbabilityChart({ history, currentYes }: { history: PricePoint[]; currentYes: number }) {
    const W = 600, H = 220, PAD = { top: 16, right: 16, bottom: 32, left: 40 };
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    // Build points: start at 50, then each trade
    const raw = useMemo(() => {
        const pts: { x: number; y: number }[] = [];
        if (history.length === 0) {
            pts.push({ x: 0, y: 50 }, { x: 1, y: currentYes });
        } else {
            pts.push({ x: 0, y: 50 });
            history.forEach((h, i) => pts.push({ x: i + 1, y: h.yesPriceCents }));
        }
        return pts;
    }, [history, currentYes]);

    const maxX = Math.max(raw.length - 1, 1);
    const toSvg = (pt: { x: number; y: number }) => ({
        sx: PAD.left + (pt.x / maxX) * innerW,
        sy: PAD.top + ((100 - pt.y) / 100) * innerH,
    });

    const svgPts = raw.map(toSvg);

    const linePath = svgPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.sx} ${p.sy}`).join(' ');
    const areaPath = `${linePath} L ${svgPts[svgPts.length - 1].sx} ${PAD.top + innerH} L ${PAD.left} ${PAD.top + innerH} Z`;

    const last = svgPts[svgPts.length - 1];
    const yLabels = [0, 25, 50, 75, 100];

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#7259ff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#7259ff" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#7259ff" />
                </linearGradient>
            </defs>

            {/* Grid lines */}
            {yLabels.map(v => {
                const sy = PAD.top + ((100 - v) / 100) * innerH;
                return (
                    <g key={v}>
                        <line x1={PAD.left} y1={sy} x2={PAD.left + innerW} y2={sy}
                            stroke="#2a2a30" strokeWidth="1" strokeDasharray={v === 50 ? '4 3' : '2 4'} />
                        <text x={PAD.left - 6} y={sy + 4} textAnchor="end"
                            className="font-mono" fontSize="9" fill="#64748b">
                            {v}%
                        </text>
                    </g>
                );
            })}

            {/* 50% label */}
            <text x={PAD.left + innerW / 2} y={PAD.top + innerH / 2 - 6}
                textAnchor="middle" fontSize="9" fill="#64748b60" className="font-mono">
                50% — coin flip
            </text>

            {/* Area fill */}
            <path d={areaPath} fill="url(#areaGrad)" />

            {/* Line */}
            <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

            {/* Data points */}
            {svgPts.slice(1).map((p, i) => (
                <circle key={i} cx={p.sx} cy={p.sy} r="3" fill="#7259ff" stroke="#09090b" strokeWidth="1.5" />
            ))}

            {/* Current price dot + label */}
            <circle cx={last.sx} cy={last.sy} r="5" fill="#7259ff" stroke="#09090b" strokeWidth="2" />
            <rect x={last.sx - 24} y={last.sy - 22} width="48" height="16" rx="4" fill="#7259ff" />
            <text x={last.sx} y={last.sy - 10} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold" className="font-mono">
                {currentYes}%
            </text>

            {/* X-axis labels */}
            <text x={PAD.left} y={H - 6} fontSize="9" fill="#64748b" className="font-mono">START</text>
            <text x={PAD.left + innerW} y={H - 6} textAnchor="end" fontSize="9" fill="#64748b" className="font-mono">NOW</text>
        </svg>
    );
}

// ── Order Entry panel ───────────────────────────────────────────────────────

function OrderEntry({ market, onSuccess }: { market: OnChainMarket; onSuccess: () => void }) {
    const [side, setSide] = useState<'YES' | 'NO'>('YES');
    const [amount, setAmount] = useState('');
    const [txState, setTxState] = useState<'idle' | 'approving' | 'buying' | 'claiming' | 'success' | 'error'>('idle');
    const [errMsg, setErrMsg] = useState('');

    const { address, isConnected } = useAccount();
    const { data: allowanceRaw, refetch: refetchAllowance } = useUsdcAllowance(address);
    const { data: balanceRaw } = useUsdcBalance(address);
    const { data: positionRaw, refetch: refetchPosition } = useUserPosition(market.id, address);
    const { data: estYesRaw } = useEstimateBuyYes(market.id, amount);
    const { data: estNoRaw } = useEstimateBuyNo(market.id, amount);

    const { approve, isPending: isApproving, isConfirming: isApproveConfirming } = useApproveUsdc();
    const { buyYes, isPending: isBuyYesPending, isConfirming: isBuyYesConfirming } = useBuyYes();
    const { buyNo,  isPending: isBuyNoPending,  isConfirming: isBuyNoConfirming  } = useBuyNo();
    const { claimWinnings, isPending: isClaiming, isConfirming: isClaimConfirming } = useClaimWinnings();

    const allowance = (allowanceRaw as bigint | undefined) ?? 0n;
    const balance   = (balanceRaw  as bigint | undefined);
    const position  = positionRaw  as [bigint, bigint] | undefined;
    const estYes    = estYesRaw    as bigint | undefined;
    const estNo     = estNoRaw     as bigint | undefined;

    const amountWei = useMemo(() => {
        try { return amount ? parseUnits(amount, 6) : 0n; } catch { return 0n; }
    }, [amount]);

    const needsApproval = amountWei > 0n && allowance < amountWei;
    const estShares = side === 'YES' ? estYes : estNo;
    const isActive  = market.status === MarketStatus.ACTIVE;
    const isBuying  = isBuyYesPending || isBuyNoPending || isBuyYesConfirming || isBuyNoConfirming;
    const isResolved = market.status === MarketStatus.RESOLVED_YES || market.status === MarketStatus.RESOLVED_NO;
    const winId = market.status === MarketStatus.RESOLVED_YES ? 0 : 1;
    const winShares = position ? (winId === 0 ? position[0] : position[1]) : 0n;
    const hasWinnings = isResolved && winShares > 0n;

    useEffect(() => { setAmount(''); setTxState('idle'); setErrMsg(''); }, [market.id]);

    const handleApprove = async () => {
        try { setTxState('approving'); await approve(amount); await refetchAllowance(); setTxState('idle'); }
        catch (e: any) { setTxState('error'); setErrMsg(e?.shortMessage || 'Approval failed'); }
    };

    const handleBuy = async () => {
        if (!amountWei) return;
        try {
            setTxState('buying');
            side === 'YES' ? await buyYes(market.id, amount) : await buyNo(market.id, amount);
            setTxState('success'); setAmount('');
            setTimeout(() => { setTxState('idle'); refetchPosition(); onSuccess(); }, 2000);
        } catch (e: any) { setTxState('error'); setErrMsg(e?.shortMessage || 'Transaction failed'); }
    };

    const handleClaim = async () => {
        try {
            setTxState('claiming');
            await claimWinnings(market.id);
            setTxState('success');
            setTimeout(() => { setTxState('idle'); refetchPosition(); }, 2000);
        } catch (e: any) { setTxState('error'); setErrMsg(e?.shortMessage || 'Claim failed'); }
    };

    return (
        <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-nitro-muted font-bold flex items-center gap-2">
                    <DollarSign size={12} className="text-nitro-purple" /> ORDER ENTRY
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* YES / NO price pills */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: 'YES', price: market.yesPriceCents, color: 'emerald' },
                    { label: 'NO',  price: market.noPriceCents,  color: 'rose' },
                ].map(({ label, price, color }) => (
                    <div key={label} className={`bg-${color}-500/5 border border-${color}-500/20 rounded-lg p-3 text-center`}>
                        <div className={`text-[10px] font-mono font-bold tracking-[0.2em] text-${color}-400 mb-1`}>{label}</div>
                        <div className={`font-display text-2xl font-bold text-${color}-300`}>{price}¢</div>
                        <div className={`text-[9px] font-mono text-${color}-400/60 mt-0.5`}>{price}% chance</div>
                    </div>
                ))}
            </div>

            {!isConnected ? (
                <div className="text-center py-6 text-nitro-muted font-mono text-xs">
                    Connect wallet to trade
                </div>
            ) : isActive ? (
                <>
                    {/* Side toggle */}
                    <div className="grid grid-cols-2 gap-2">
                        {(['YES', 'NO'] as const).map(s => (
                            <button key={s} onClick={() => setSide(s)}
                                className={`py-2.5 rounded-lg font-mono text-[11px] font-bold uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${
                                    side === s
                                        ? s === 'YES'
                                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                                            : 'bg-rose-500/15 border-rose-500/50 text-rose-300'
                                        : 'bg-transparent border-[#2a2a30] text-nitro-muted hover:border-nitro-purple/30'
                                }`}>
                                {s === 'YES' ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />} {s}
                            </button>
                        ))}
                    </div>

                    {/* Amount */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="text-[10px] uppercase tracking-[0.25em] font-mono text-nitro-muted font-bold">
                                Amount (USDC)
                            </label>
                            {balance !== undefined && (
                                <button onClick={() => setAmount(formatUsdc(balance))}
                                    className="text-[10px] font-mono text-nitro-purple hover:text-nitro-violet">
                                    MAX {Number(formatUsdc(balance)).toFixed(0)} USDC
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-nitro-muted text-sm">$</span>
                            <input type="number" min="0" step="0.01" placeholder="0.00"
                                value={amount} onChange={e => setAmount(e.target.value)}
                                className="w-full bg-[#0c0c0f] border border-[#2a2a30] rounded-lg py-3 pl-7 pr-3 font-mono text-white text-sm placeholder:text-nitro-muted/40 focus:outline-none focus:border-nitro-purple/50 transition-colors" />
                        </div>
                    </div>

                    {/* Quick amounts */}
                    <div className="grid grid-cols-4 gap-2">
                        {['1', '5', '10', '50'].map(v => (
                            <button key={v} onClick={() => setAmount(v)}
                                className="py-1.5 rounded-lg border border-[#2a2a30] text-[10px] font-mono text-nitro-muted hover:border-nitro-purple/40 hover:text-white transition-all">
                                ${v}
                            </button>
                        ))}
                    </div>

                    {/* Estimate */}
                    {estShares !== undefined && amountWei > 0n && (
                        <div className="bg-[#0c0c0f] border border-[#2a2a30] rounded-lg p-3 flex justify-between items-center">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-nitro-muted">Est. {side} shares</span>
                            <span className={`font-mono text-sm font-bold ${side === 'YES' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {Number(formatShares(estShares)).toFixed(4)}
                            </span>
                        </div>
                    )}

                    {/* Action */}
                    {needsApproval ? (
                        <BrutalistButton variant="outline" size="lg" className="w-full"
                            onClick={handleApprove}
                            disabled={isApproving || isApproveConfirming || !amount}>
                            {(isApproving || isApproveConfirming)
                                ? <><Loader2 size={14} className="animate-spin" /> Approving...</>
                                : 'APPROVE USDC'}
                        </BrutalistButton>
                    ) : (
                        <BrutalistButton
                            variant="primary" size="lg" className="w-full"
                            onClick={handleBuy}
                            disabled={isBuying || !amount || amountWei === 0n || txState === 'success'}>
                            {isBuying
                                ? <><Loader2 size={14} className="animate-spin" /> Buying {side}...</>
                                : <><Zap size={14} className="fill-current" /> BUY {side}</>}
                        </BrutalistButton>
                    )}

                    {txState === 'success' && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                            <Check size={14} className="text-emerald-400" />
                            <span className="font-mono text-[11px] text-emerald-400">Trade confirmed!</span>
                        </div>
                    )}
                    {txState === 'error' && errMsg && (
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                            <span className="font-mono text-[11px] text-rose-400 break-all">{errMsg}</span>
                        </div>
                    )}
                </>
            ) : hasWinnings ? (
                <div className="space-y-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
                        <div className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest mb-1">You won!</div>
                        <div className="font-display text-2xl text-emerald-300 font-bold">
                            ${(Number(formatShares(winShares))).toFixed(2)} USDC
                        </div>
                    </div>
                    <BrutalistButton variant="primary" size="lg" className="w-full" onClick={handleClaim}
                        disabled={isClaiming || isClaimConfirming}>
                        {(isClaiming || isClaimConfirming)
                            ? <><Loader2 size={14} className="animate-spin" /> Claiming...</>
                            : '🏆 CLAIM WINNINGS'}
                    </BrutalistButton>
                </div>
            ) : (
                <div className="text-center py-4 font-mono text-nitro-muted text-xs">
                    {market.status === MarketStatus.VOIDED ? 'Market voided — use reclaim' : 'Market resolved'}
                </div>
            )}

            {/* Position */}
            {isConnected && position && (position[0] > 0n || position[1] > 0n) && (
                <div className="pt-4 border-t border-[#2a2a30]">
                    <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-nitro-muted mb-3 font-bold">
                        Your Position
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {position[0] > 0n && (
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 text-center">
                                <div className="text-[10px] font-mono text-emerald-400 mb-0.5">YES</div>
                                <div className="font-mono text-sm font-bold text-emerald-300">
                                    {Number(formatShares(position[0])).toFixed(2)}
                                </div>
                                <div className="text-[9px] font-mono text-emerald-400/50">
                                    ≈${(Number(formatShares(position[0])) * market.yesPriceCents / 100).toFixed(2)}
                                </div>
                            </div>
                        )}
                        {position[1] > 0n && (
                            <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-2.5 text-center">
                                <div className="text-[10px] font-mono text-rose-400 mb-0.5">NO</div>
                                <div className="font-mono text-sm font-bold text-rose-300">
                                    {Number(formatShares(position[1])).toFixed(2)}
                                </div>
                                <div className="text-[9px] font-mono text-rose-400/50">
                                    ≈${(Number(formatShares(position[1])) * market.noPriceCents / 100).toFixed(2)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Recent trades feed ──────────────────────────────────────────────────────

function TradesFeed({ trades }: { trades: ReturnType<typeof useMarketTradesOnChain>['trades'] }) {
    if (trades.length === 0) return (
        <div className="text-center py-6 font-mono text-[11px] text-nitro-muted/50 uppercase tracking-widest">
            No trades yet — be the first!
        </div>
    );

    return (
        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
            {[...trades].reverse().slice(0, 12).map((t, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] font-mono py-1.5 border-b border-[#1a1a1f] last:border-0">
                    <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.isYes ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="text-nitro-muted">{shortAddr(t.trader)}</span>
                        <span className={t.isYes ? 'text-emerald-400' : 'text-rose-400'}>
                            {t.isBuy ? 'bought' : 'sold'} {t.isYes ? 'YES' : 'NO'}
                        </span>
                    </div>
                    <span className="text-nitro-text font-bold">${(Number(t.usdcAmount) / 1e6).toFixed(2)}</span>
                </div>
            ))}
        </div>
    );
}

// ── Main component ──────────────────────────────────────────────────────────

interface MarketDetailPageProps {
    market: OnChainMarket;
    onBack: () => void;
}

export const MarketDetailPage: React.FC<MarketDetailPageProps> = ({ market, onBack }) => {
    const tc = TYPE_CONFIG[market.marketType];
    const isActive = market.status === MarketStatus.ACTIVE;

    const { trades, priceHistory, currentYesPrice, isLoading: tradesLoading, refetch } = useMarketTradesOnChain(market.id);

    return (
        <div className="min-h-screen pb-20">
            {/* Back + header row */}
            <div className="border-b border-[#1a1a1f] px-4 md:px-8 py-3 flex items-center gap-4">
                <button onClick={onBack}
                    className="flex items-center gap-2 font-mono text-[11px] text-nitro-muted hover:text-white transition-colors uppercase tracking-widest">
                    <ArrowLeft size={14} /> Back to Markets
                </button>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">

                {/* Market header */}
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`font-mono text-[10px] px-3 py-1 rounded-full font-bold tracking-widest border uppercase flex items-center gap-1
                                ${market.marketType === MarketType.PRICE ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
                                  market.marketType === MarketType.TWITTER ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' :
                                  'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
                                {tc.icon} {tc.label}
                            </span>
                            <span className={`font-mono text-[10px] px-3 py-1 rounded-full font-bold tracking-widest border uppercase ${STATUS_STYLE[market.status]}`}>
                                {STATUS_LABEL[market.status]}
                            </span>
                            {isActive && (
                                <span className="flex items-center gap-1.5 font-mono text-[10px] text-nitro-muted border border-[#2a2a30] px-3 py-1 rounded-full">
                                    <Clock size={10} /> {timeRemaining(market.endTime)}
                                </span>
                            )}
                        </div>
                        <h1 className="font-display text-2xl md:text-3xl font-bold text-white leading-tight">
                            {market.question || 'Untitled Market'}
                        </h1>
                        {market.marketType === MarketType.TWITTER && market.tweetMeta && (
                            <p className="font-mono text-xs text-nitro-muted">
                                @{market.tweetMeta.authorHandle} · {METRIC_LABELS[market.tweetMeta.metric]} target
                            </p>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 md:gap-10 items-start md:items-center shrink-0">
                        <div className="text-center">
                            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-nitro-muted mb-1">VOLUME</div>
                            <div className="font-display text-xl font-bold text-white">{formatVolume(market.totalVolume)}</div>
                        </div>
                        <div className="text-center">
                            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-nitro-muted mb-1">TRADES</div>
                            <div className="font-display text-xl font-bold text-white">{market.tradeCount}</div>
                        </div>
                        <button onClick={refetch} className="text-nitro-muted hover:text-white transition-colors mt-1">
                            <RefreshCw size={14} className={tradesLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left — chart + trades */}
                    <div className="lg:col-span-7 space-y-5">

                        {/* Probability chart card */}
                        <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-nitro-muted font-bold flex items-center gap-2">
                                    <Activity size={12} className="text-nitro-purple" /> YES PROBABILITY
                                </span>
                                <div className="flex items-center gap-3 text-[10px] font-mono">
                                    <span className="flex items-center gap-1.5 text-emerald-400">
                                        <span className="w-2 h-0.5 bg-emerald-400 rounded-full inline-block" />
                                        YES {market.yesPriceCents}¢
                                    </span>
                                    <span className="flex items-center gap-1.5 text-rose-400">
                                        <span className="w-2 h-0.5 bg-rose-400 rounded-full inline-block" />
                                        NO {market.noPriceCents}¢
                                    </span>
                                </div>
                            </div>
                            <ProbabilityChart history={priceHistory} currentYes={market.yesPriceCents} />

                            {/* Probability bar */}
                            <div className="mt-4 space-y-1.5">
                                <div className="flex justify-between font-mono text-[10px] text-nitro-muted">
                                    <span className="text-emerald-400 font-bold">YES {market.yesPriceCents}%</span>
                                    <span className="text-rose-400 font-bold">NO {market.noPriceCents}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-[#1a1a20] overflow-hidden flex">
                                    <div className="bg-emerald-500 rounded-l-full transition-all duration-700"
                                        style={{ width: `${market.yesPriceCents}%` }} />
                                    <div className="bg-rose-500 rounded-r-full flex-1" />
                                </div>
                            </div>
                        </div>

                        {/* Tweet card (TWITTER only) */}
                        {market.marketType === MarketType.TWITTER && market.tweetMeta && (
                            <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-5">
                                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-nitro-muted font-bold mb-3 flex items-center gap-2">
                                    <Activity size={12} className="text-purple-400" /> SOURCE TWEET
                                </div>
                                <div className="flex items-start gap-3">
                                    {market.tweetMeta.avatarUrl && (
                                        <img src={market.tweetMeta.avatarUrl} alt=""
                                            className="w-10 h-10 rounded-full border border-[#2a2a30] object-cover shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-display text-sm font-bold text-white">
                                                {market.tweetMeta.authorName || market.tweetMeta.authorHandle}
                                            </span>
                                            <span className="font-mono text-[11px] text-nitro-muted">
                                                @{market.tweetMeta.authorHandle}
                                            </span>
                                        </div>
                                        <p className="font-mono text-sm text-nitro-text/80 leading-relaxed">
                                            {market.tweetMeta.tweetText}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="font-mono text-[10px] px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 uppercase tracking-widest font-bold">
                                                {METRIC_LABELS[market.tweetMeta.metric]} target
                                            </span>
                                            <span className="font-mono text-[10px] text-nitro-muted">
                                                → {Number(market.targetValue).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recent trades */}
                        <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-5">
                            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-nitro-muted font-bold mb-4 flex items-center gap-2">
                                <TrendingUp size={12} className="text-nitro-purple" /> RECENT TRADES
                            </div>
                            <TradesFeed trades={trades} />
                        </div>

                        {/* Market info */}
                        <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-5">
                            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-nitro-muted font-bold mb-4 flex items-center gap-2">
                                <BarChart3 size={12} className="text-nitro-purple" /> MARKET INFO
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                {[
                                    { label: 'Type',     value: tc.label },
                                    { label: 'Target',   value: formatTarget(market) },
                                    { label: 'Status',   value: STATUS_LABEL[market.status] },
                                    { label: 'End time', value: market.endTime > 0 ? new Date(market.endTime * 1000).toLocaleString() : '—' },
                                    { label: 'Pool YES', value: `${(Number(market.yesPool) / 1e18).toFixed(2)} shares` },
                                    { label: 'Pool NO',  value: `${(Number(market.noPool)  / 1e18).toFixed(2)} shares` },
                                    ...(market.marketType === MarketType.PRICE && market.priceMeta
                                        ? [{ label: 'Pair', value: market.priceMeta.pair }, { label: 'Oracle', value: 'Pyth' }]
                                        : []),
                                    ...(market.marketType === MarketType.BLOCK_DATA && market.blockMeta
                                        ? [{ label: 'Metric', value: market.blockMeta.metricName }, { label: 'Blocks', value: String(market.endBlock) }]
                                        : []),
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-nitro-muted/60 mb-0.5">{label}</div>
                                        <div className="font-mono text-[11px] text-nitro-text font-bold truncate">{value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right — order entry */}
                    <div className="lg:col-span-5">
                        <div className="sticky top-[70px]">
                            <OrderEntry market={market} onSuccess={refetch} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
