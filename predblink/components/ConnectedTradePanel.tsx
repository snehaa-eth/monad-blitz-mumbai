import React, { useState, useEffect } from 'react';
import { BrutalistButton } from './BrutalistButton';
import { useWallet } from '../lib/useWallet';
import { useDegenMode } from '../contexts/DegenContext';
import {
    ArrowRight, DollarSign, ThumbsUp, ThumbsDown,
    Loader2, AlertCircle, ArrowDownUp,
} from 'lucide-react';
import {
    useYesPriceCents,
    useNoPriceCents,
    useEstimateBuyYes,
    useEstimateBuyNo,
    useBuyYes,
    useBuyNo,
    useSellYes,
    useSellNo,
    useApproveUsdc,
    useUsdcBalance,
    useUsdcAllowance,
    useUserPosition,
    formatShares,
    formatUsdc,
    useMintUsdc,
} from '../lib/contracts';
import { OnChainMarket, MarketStatus } from '../types';

interface ConnectedTradePanelProps {
    marketId: number;
    market: OnChainMarket;
    onSuccess?: () => void;
}

type TradeMode = 'buy' | 'sell';

export const ConnectedTradePanel: React.FC<ConnectedTradePanelProps> = ({
    marketId,
    market,
    onSuccess,
}) => {
    const { degenMode } = useDegenMode();
    const { isConnected, address, connect } = useWallet();
    const [position, setPosition] = useState<'YES' | 'NO'>('YES');
    const [mode, setMode] = useState<TradeMode>('buy');
    const [amount, setAmount] = useState('10');
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const userAddr = address as `0x${string}` | undefined;
    const isActive = market.status === MarketStatus.ACTIVE;

    // Reads
    const { data: yesCents } = useYesPriceCents(marketId);
    const { data: noCents } = useNoPriceCents(marketId);
    const { data: usdcBalance } = useUsdcBalance(address);
    const { data: allowance } = useUsdcAllowance(address);
    const { data: posData, refetch: refetchPosition } = useUserPosition(marketId, userAddr);

    const yesPrice = yesCents !== undefined ? Number(yesCents) : market.yesPriceCents;
    const noPrice = noCents !== undefined ? Number(noCents) : market.noPriceCents;

    // Estimates (buy mode only)
    const { data: estYes } = useEstimateBuyYes(mode === 'buy' ? marketId : undefined, amount);
    const { data: estNo } = useEstimateBuyNo(mode === 'buy' ? marketId : undefined, amount);

    // Write hooks
    const { approve, isPending: isApproving, isConfirming: isApprovingConfirming } = useApproveUsdc();
    const { mint, isPending: isMinting, isConfirming: isMintConfirming } = useMintUsdc();
    const { buyYes, isPending: isBuyingYes, isConfirming: isConfirmingYes, isSuccess: buyYesOk } = useBuyYes();
    const { buyNo, isPending: isBuyingNo, isConfirming: isConfirmingNo, isSuccess: buyNoOk } = useBuyNo();
    const { sellYes, isPending: isSellingYes, isConfirming: isConfirmingSelYes, isSuccess: sellYesOk } = useSellYes();
    const { sellNo, isPending: isSellingNo, isConfirming: isConfirmingSelNo, isSuccess: sellNoOk } = useSellNo();

    // Parse position
    const yesShares = posData ? (posData as any)[0] ?? BigInt(0) : BigInt(0);
    const noShares = posData ? (posData as any)[1] ?? BigInt(0) : BigInt(0);
    const yesSharesNum = Number(formatShares(yesShares));
    const noSharesNum = Number(formatShares(noShares));

    // Estimates
    const estimatedShares = mode === 'buy'
        ? (position === 'YES' ? estYes : estNo) ?? BigInt(0)
        : BigInt(0);
    const shares = mode === 'buy' ? Number(formatShares(estimatedShares)) : parseFloat(amount) || 0;
    const amountNum = parseFloat(amount) || 0;

    const potentialReturn = mode === 'buy' ? shares * 1 : shares * (position === 'YES' ? noPrice / 100 : yesPrice / 100);
    const profit = mode === 'buy' ? potentialReturn - amountNum : potentialReturn;
    const roi = amountNum > 0 && mode === 'buy' ? Math.floor((profit / amountNum) * 100) : 0;
    const currentPrice = position === 'YES' ? yesPrice : noPrice;

    const amountWei = BigInt(Math.floor(amountNum * 1e6));
    const needsApproval = mode === 'buy' && (!allowance || allowance < amountWei);
    const balanceDisplay = usdcBalance ? formatUsdc(usdcBalance) : '0';

    // Max sell amount
    const maxSellShares = position === 'YES' ? yesSharesNum : noSharesNum;

    useEffect(() => {
        if (buyYesOk || buyNoOk || sellYesOk || sellNoOk) {
            setIsSuccess(true);
            refetchPosition();
            setTimeout(() => {
                setIsSuccess(false);
                onSuccess?.();
            }, 2000);
        }
    }, [buyYesOk, buyNoOk, sellYesOk, sellNoOk]);

    const handleTrade = async () => {
        setError(null);
        if (!isConnected) { connect(); return; }

        try {
            if (mode === 'buy') {
                if (needsApproval) { await approve('1000000'); return; }
                if (position === 'YES') await buyYes(marketId, amount);
                else await buyNo(marketId, amount);
            } else {
                if (position === 'YES') await sellYes(marketId, amount);
                else await sellNo(marketId, amount);
            }
        } catch (err: any) {
            setError(err?.shortMessage || err?.message || 'Transaction failed');
        }
    };

    const isLoading = isApproving || isApprovingConfirming || isBuyingYes || isBuyingNo ||
        isConfirmingYes || isConfirmingNo || isSellingYes || isSellingNo ||
        isConfirmingSelYes || isConfirmingSelNo;

    if (!isActive && market.status !== MarketStatus.ACTIVE) {
        return (
            <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-6 text-center space-y-3">
                <div className="font-display text-lg font-bold text-white">Market Settled</div>
                <div className="font-mono text-sm text-nitro-muted">
                    {market.status === MarketStatus.RESOLVED_YES ? 'YES won' : market.status === MarketStatus.RESOLVED_NO ? 'NO won' : 'Market voided'}
                </div>
                <p className="font-mono text-[10px] text-nitro-muted/50">Visit Portfolio to claim winnings.</p>
            </div>
        );
    }

    return (
        <div className="bg-[#111114] border border-[#2a2a30] rounded-xl overflow-hidden">
            {/* Success overlay */}
            {isSuccess && (
                <div className="p-8 bg-emerald-500/10 text-center animate-pulse">
                    <div className="font-display text-2xl font-bold text-emerald-400">ORDER FILLED</div>
                    <div className="font-mono text-sm text-nitro-muted mt-1">Updating positions...</div>
                </div>
            )}

            {!isSuccess && (
                <>
                    {/* Header */}
                    <div className="p-4 border-b border-[#2a2a30] flex justify-between items-center">
                        <h3 className="font-display text-lg font-bold text-white">Trade</h3>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                        </div>
                    </div>

                    <div className="p-5 space-y-5">
                        {/* Buy / Sell toggle */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setMode('buy')}
                                className={`py-2 font-mono font-bold text-xs uppercase tracking-widest rounded-lg transition-all ${
                                    mode === 'buy' ? 'bg-nitro-purple text-white' : 'bg-[#1a1a20] text-nitro-muted hover:text-white'
                                }`}
                            >BUY</button>
                            <button
                                onClick={() => setMode('sell')}
                                className={`py-2 font-mono font-bold text-xs uppercase tracking-widest rounded-lg transition-all ${
                                    mode === 'sell' ? 'bg-nitro-purple text-white' : 'bg-[#1a1a20] text-nitro-muted hover:text-white'
                                }`}
                            >SELL</button>
                        </div>

                        {/* YES / NO */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setPosition('YES')}
                                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                                    position === 'YES'
                                        ? 'border-emerald-500 bg-emerald-500/10'
                                        : 'border-[#2a2a30] hover:border-emerald-500/40'
                                }`}
                            >
                                <ThumbsUp size={20} className={position === 'YES' ? 'text-emerald-400' : 'text-nitro-muted'} />
                                <span className="font-display text-sm font-bold text-white">YES</span>
                                <span className="font-mono text-lg font-bold text-emerald-400">{yesPrice}¢</span>
                            </button>
                            <button
                                onClick={() => setPosition('NO')}
                                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                                    position === 'NO'
                                        ? 'border-rose-500 bg-rose-500/10'
                                        : 'border-[#2a2a30] hover:border-rose-500/40'
                                }`}
                            >
                                <ThumbsDown size={20} className={position === 'NO' ? 'text-rose-400' : 'text-nitro-muted'} />
                                <span className="font-display text-sm font-bold text-white">NO</span>
                                <span className="font-mono text-lg font-bold text-rose-400">{noPrice}¢</span>
                            </button>
                        </div>

                        {/* Amount */}
                        <div className="bg-[#0c0c0f] border border-[#2a2a30] rounded-lg p-4 space-y-3">
                            <div className="flex justify-between text-[10px] font-mono text-nitro-muted uppercase tracking-widest">
                                <span>{mode === 'buy' ? 'Amount (USDC)' : 'Shares to sell'}</span>
                                <span>
                                    {mode === 'buy'
                                        ? `BAL: $${balanceDisplay}`
                                        : `MAX: ${maxSellShares.toFixed(2)}`
                                    }
                                </span>
                            </div>
                            <div className="relative">
                                <DollarSign className="absolute top-1/2 -translate-y-1/2 left-3 text-nitro-muted" size={16} />
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-transparent border border-[#2a2a30] rounded-lg font-mono text-lg text-white p-3 pl-9 focus:outline-none focus:border-nitro-purple/60"
                                    placeholder="0"
                                />
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {(mode === 'buy' ? [10, 50, 100, 500] : [
                                    Math.floor(maxSellShares * 0.25 * 100) / 100,
                                    Math.floor(maxSellShares * 0.5 * 100) / 100,
                                    Math.floor(maxSellShares * 0.75 * 100) / 100,
                                    Math.floor(maxSellShares * 100) / 100,
                                ]).map((val, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setAmount(val.toString())}
                                        className="text-[10px] font-mono font-bold py-1.5 rounded bg-[#1a1a20] text-nitro-muted hover:text-white transition-colors"
                                    >
                                        {mode === 'buy' ? `$${val}` : `${[25, 50, 75, 100][i]}%`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Positions display */}
                        {isConnected && (yesSharesNum > 0 || noSharesNum > 0) && (
                            <div className="bg-[#0c0c0f] border border-[#2a2a30] rounded-lg p-3 space-y-1">
                                <div className="font-mono text-[10px] uppercase tracking-widest text-nitro-muted mb-1">Your Positions</div>
                                <div className="flex gap-4 font-mono text-sm">
                                    {yesSharesNum > 0 && (
                                        <span><span className="text-emerald-400 font-bold">YES</span> {yesSharesNum.toFixed(2)}</span>
                                    )}
                                    {noSharesNum > 0 && (
                                        <span><span className="text-rose-400 font-bold">NO</span> {noSharesNum.toFixed(2)}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        {mode === 'buy' && (
                            <div className="space-y-2 font-mono text-sm">
                                <div className="flex justify-between"><span className="text-nitro-muted">Price</span><span className="text-white">{currentPrice}¢</span></div>
                                <div className="flex justify-between"><span className="text-nitro-muted">Est. Shares</span><span className="text-white">{shares.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-nitro-muted">Max Payout</span><span className="text-emerald-400">${potentialReturn.toFixed(2)}</span></div>
                                <div className="flex justify-between border-t border-[#2a2a30] pt-2"><span className="text-nitro-muted">Potential ROI</span><span className="text-emerald-400 font-bold">+{roi}%</span></div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 font-mono text-sm text-rose-400 flex items-center gap-2">
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        {/* Mint button */}
                        {isConnected && usdcBalance !== undefined && usdcBalance < BigInt(10 * 1e6) && mode === 'buy' && (
                            <MintButton />
                        )}

                        {/* Action */}
                        <BrutalistButton
                            className="w-full py-3"
                            onClick={handleTrade}
                            disabled={isLoading || (mode === 'sell' && amountNum > maxSellShares)}
                            variant={position === 'YES' ? 'primary' : 'primary'}
                        >
                            {!isConnected ? (
                                'CONNECT WALLET'
                            ) : isLoading ? (
                                <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> PROCESSING...</span>
                            ) : needsApproval ? (
                                'APPROVE USDC'
                            ) : (
                                <span className="flex items-center gap-2">
                                    {mode === 'buy' ? 'BUY' : 'SELL'} {position} <ArrowRight size={14} />
                                </span>
                            )}
                        </BrutalistButton>

                        <p className="text-center font-mono text-[9px] text-nitro-muted/50">Fee: 1% • PredBlink AMM on Monad</p>
                    </div>
                </>
            )}
        </div>
    );
};

function MintButton() {
    const { mint, isPending, isConfirming } = useMintUsdc();
    return (
        <button
            onClick={() => mint('1000')}
            disabled={isPending || isConfirming}
            className="w-full font-mono text-[10px] text-nitro-purple hover:underline py-1"
        >
            {isPending || isConfirming ? 'Minting...' : '+ Mint 1000 test USDC (testnet)'}
        </button>
    );
}
