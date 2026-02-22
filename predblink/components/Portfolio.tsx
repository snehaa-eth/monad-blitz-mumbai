import React, { useMemo } from 'react';
import { useWallet } from '../lib/useWallet';
import {
    useAllUserPositions,
    useUsdcBalance,
    useClaimWinnings,
    useReclaimVoided,
    useSellYes,
    useSellNo,
    useMintUsdc,
    formatUsdc,
    formatShares,
} from '../lib/contracts';
import { OnChainMarket, MarketStatus, MarketType } from '../types';
import { BrutalistButton } from './BrutalistButton';
import {
    Wallet, DollarSign, ThumbsUp, ThumbsDown, Trophy, AlertCircle,
    Loader2, Gift, Ban, TrendingUp,
} from 'lucide-react';

interface PortfolioProps {
    markets: OnChainMarket[];
}

export const Portfolio: React.FC<PortfolioProps> = ({ markets }) => {
    const { isConnected, address, connect } = useWallet();
    const userAddr = address as `0x${string}` | undefined;

    const marketIds = useMemo(() => markets.map(m => m.id), [markets]);
    const { positions, isLoading: posLoading, refetch } = useAllUserPositions(marketIds, userAddr);
    const { data: balance } = useUsdcBalance(address);
    const { mint, isPending: isMinting } = useMintUsdc();
    const { claimWinnings, isPending: isClaiming, isConfirming: isClaimConfirming } = useClaimWinnings();
    const { reclaimVoided, isPending: isReclaiming } = useReclaimVoided();
    const { sellYes, isPending: isSellingYes, isConfirming: isSellYesConfirming } = useSellYes();
    const { sellNo, isPending: isSellingNo, isConfirming: isSellNoConfirming } = useSellNo();

    const isProcessing = isClaiming || isClaimConfirming || isReclaiming || isSellingYes || isSellYesConfirming || isSellingNo || isSellNoConfirming;

    const marketMap = useMemo(() => {
        const m = new Map<number, OnChainMarket>();
        markets.forEach(mk => m.set(mk.id, mk));
        return m;
    }, [markets]);

    const positionsWithMarket = useMemo(() =>
        positions
            .map(p => ({ ...p, market: marketMap.get(p.marketId) }))
            .filter(p => p.market),
    [positions, marketMap]);

    const activePositions = positionsWithMarket.filter(p => p.market!.status === MarketStatus.ACTIVE);
    const resolvedPositions = positionsWithMarket.filter(p =>
        p.market!.status === MarketStatus.RESOLVED_YES || p.market!.status === MarketStatus.RESOLVED_NO,
    );
    const voidedPositions = positionsWithMarket.filter(p => p.market!.status === MarketStatus.VOIDED);

    const totalValue = positionsWithMarket.reduce((sum, p) => {
        const m = p.market!;
        const yesVal = Number(formatShares(p.yesShares)) * (m.yesPriceCents / 100);
        const noVal = Number(formatShares(p.noShares)) * (m.noPriceCents / 100);
        return sum + yesVal + noVal;
    }, 0);

    if (!isConnected) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-12">
                    <Wallet size={48} className="mx-auto text-nitro-muted mb-4" />
                    <h2 className="font-display text-2xl font-bold text-white mb-2">Connect Wallet</h2>
                    <p className="font-mono text-sm text-nitro-muted mb-6">View your positions and portfolio.</p>
                    <BrutalistButton onClick={connect}>CONNECT WALLET</BrutalistButton>
                </div>
            </div>
        );
    }

    const handleClaim = async (marketId: number) => {
        try { await claimWinnings(marketId); refetch(); } catch (e) { console.error(e); }
    };
    const handleReclaim = async (marketId: number) => {
        try { await reclaimVoided(marketId); refetch(); } catch (e) { console.error(e); }
    };
    const handleSell = async (marketId: number, isYes: boolean, shares: bigint) => {
        try {
            const sharesStr = formatShares(shares);
            if (isYes) await sellYes(marketId, sharesStr);
            else await sellNo(marketId, sharesStr);
            refetch();
        } catch (e) { console.error(e); }
    };

    const marketTypeLabel = (m: OnChainMarket) => {
        if (m.marketType === MarketType.PRICE) return 'PRICE';
        if (m.marketType === MarketType.TWITTER) return 'TWITTER';
        return 'BLOCK';
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
            {/* Header stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-5">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-nitro-muted mb-1">USDC Balance</div>
                    <div className="font-display text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign size={20} className="text-nitro-purple" />
                        {balance ? formatUsdc(balance) : '0'}
                    </div>
                    {balance && balance < BigInt(10 * 1e6) && (
                        <button onClick={() => mint('1000')} disabled={isMinting} className="font-mono text-[10px] text-nitro-purple mt-2 hover:underline">
                            {isMinting ? 'Minting...' : '+ Mint 1000 test USDC'}
                        </button>
                    )}
                </div>
                <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-5">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-nitro-muted mb-1">Portfolio Value</div>
                    <div className="font-display text-2xl font-bold text-white flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-400" />
                        ${totalValue.toFixed(2)}
                    </div>
                </div>
                <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-5">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-nitro-muted mb-1">Open Positions</div>
                    <div className="font-display text-2xl font-bold text-white">
                        {positionsWithMarket.length}
                    </div>
                </div>
            </div>

            {posLoading && (
                <div className="text-center font-mono text-sm text-nitro-muted py-8 animate-pulse">Loading positions...</div>
            )}

            {/* Active positions */}
            {activePositions.length > 0 && (
                <Section title="Active Positions" icon={<ThumbsUp size={18} />}>
                    {activePositions.map(p => {
                        const m = p.market!;
                        const yesNum = Number(formatShares(p.yesShares));
                        const noNum = Number(formatShares(p.noShares));
                        return (
                            <PositionRow key={p.marketId} question={m.question} type={marketTypeLabel(m)} yesPriceCents={m.yesPriceCents} noPriceCents={m.noPriceCents}>
                                {yesNum > 0 && (
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm"><span className="text-emerald-400 font-bold">YES</span> {yesNum.toFixed(2)} shares (${(yesNum * m.yesPriceCents / 100).toFixed(2)})</span>
                                        <BrutalistButton size="sm" variant="outline" onClick={() => handleSell(p.marketId, true, p.yesShares)} disabled={isProcessing}>
                                            {isSellingYes ? <Loader2 size={12} className="animate-spin" /> : 'SELL'}
                                        </BrutalistButton>
                                    </div>
                                )}
                                {noNum > 0 && (
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm"><span className="text-rose-400 font-bold">NO</span> {noNum.toFixed(2)} shares (${(noNum * m.noPriceCents / 100).toFixed(2)})</span>
                                        <BrutalistButton size="sm" variant="outline" onClick={() => handleSell(p.marketId, false, p.noShares)} disabled={isProcessing}>
                                            {isSellingNo ? <Loader2 size={12} className="animate-spin" /> : 'SELL'}
                                        </BrutalistButton>
                                    </div>
                                )}
                            </PositionRow>
                        );
                    })}
                </Section>
            )}

            {/* Claimable */}
            {resolvedPositions.length > 0 && (
                <Section title="Claimable Winnings" icon={<Trophy size={18} className="text-amber-400" />}>
                    {resolvedPositions.map(p => {
                        const m = p.market!;
                        const wonYes = m.status === MarketStatus.RESOLVED_YES;
                        const winShares = wonYes ? p.yesShares : p.noShares;
                        const payout = Number(formatShares(winShares));
                        return (
                            <PositionRow key={p.marketId} question={m.question} type={marketTypeLabel(m)} yesPriceCents={wonYes ? 100 : 0} noPriceCents={wonYes ? 0 : 100}>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm">
                                        <span className={wonYes ? 'text-emerald-400' : 'text-rose-400'}>{wonYes ? 'YES' : 'NO'} won</span>
                                        {' — '}{payout > 0 ? `$${payout.toFixed(2)} claimable` : 'No winning shares'}
                                    </span>
                                    {payout > 0 && (
                                        <BrutalistButton size="sm" onClick={() => handleClaim(p.marketId)} disabled={isProcessing}>
                                            {isClaiming ? <Loader2 size={12} className="animate-spin" /> : <><Gift size={12} /> CLAIM</>}
                                        </BrutalistButton>
                                    )}
                                </div>
                            </PositionRow>
                        );
                    })}
                </Section>
            )}

            {/* Voided */}
            {voidedPositions.length > 0 && (
                <Section title="Voided Markets" icon={<Ban size={18} className="text-amber-400" />}>
                    {voidedPositions.map(p => {
                        const m = p.market!;
                        const total = Number(formatShares(p.yesShares + p.noShares));
                        return (
                            <PositionRow key={p.marketId} question={m.question} type={marketTypeLabel(m)} yesPriceCents={50} noPriceCents={50}>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm">Refund: ${(total * 0.5).toFixed(2)}</span>
                                    <BrutalistButton size="sm" variant="outline" onClick={() => handleReclaim(p.marketId)} disabled={isProcessing}>
                                        RECLAIM
                                    </BrutalistButton>
                                </div>
                            </PositionRow>
                        );
                    })}
                </Section>
            )}

            {!posLoading && positionsWithMarket.length === 0 && (
                <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-12 text-center">
                    <Wallet size={36} className="mx-auto text-nitro-muted mb-3" />
                    <p className="font-display text-lg text-nitro-muted mb-1">No positions yet</p>
                    <p className="font-mono text-[10px] text-nitro-muted/50 tracking-widest uppercase">Trade on a market to see your positions here</p>
                </div>
            )}
        </div>
    );
};

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                {icon} {title}
            </h3>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function PositionRow({ question, type, yesPriceCents, noPriceCents, children }: {
    question: string; type: string; yesPriceCents: number; noPriceCents: number; children: React.ReactNode;
}) {
    return (
        <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-nitro-purple">{type}</span>
                    <h4 className="font-display text-sm font-bold text-white leading-tight truncate">{question}</h4>
                </div>
                <div className="flex gap-2 text-[10px] font-mono font-bold shrink-0">
                    <span className="text-emerald-400">Y {yesPriceCents}¢</span>
                    <span className="text-rose-400">N {noPriceCents}¢</span>
                </div>
            </div>
            {children}
        </div>
    );
}
