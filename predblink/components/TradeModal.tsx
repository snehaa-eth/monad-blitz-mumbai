import React, { useState, useMemo, useEffect } from 'react';
import { X, ThumbsUp, ThumbsDown, Loader2, Check, DollarSign } from 'lucide-react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { OnChainMarket, MarketType, MarketStatus } from '../types';
import {
  useBuyYes,
  useBuyNo,
  useApproveUsdc,
  useUsdcAllowance,
  useUsdcBalance,
  useUserPosition,
  useEstimateBuyYes,
  useEstimateBuyNo,
  formatShares,
  formatUsdc,
} from '../lib/contracts/hooks';
import { BrutalistButton } from './BrutalistButton';

interface TradeModalProps {
  market: OnChainMarket | null;
  onClose: () => void;
}

const STATUS_CONFIG: Record<MarketStatus, { label: string; color: string }> = {
  [MarketStatus.ACTIVE]: {
    label: 'ACTIVE',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  [MarketStatus.RESOLVED_YES]: {
    label: 'RESOLVED YES',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  [MarketStatus.RESOLVED_NO]: {
    label: 'RESOLVED NO',
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  [MarketStatus.VOIDED]: {
    label: 'VOIDED',
    color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  },
};

function formatTimeRemaining(endTime: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = endTime - now;
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export const TradeModal: React.FC<TradeModalProps> = ({ market, onClose }) => {
  const [side, setSide] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState('');
  const [txState, setTxState] = useState<'idle' | 'approving' | 'buying' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { address, isConnected } = useAccount();

  const { data: allowanceRaw, refetch: refetchAllowance } = useUsdcAllowance(address);
  const { data: balanceRaw } = useUsdcBalance(address);
  const { data: positionRaw } = useUserPosition(market?.id, address);
  const { data: estimateYesRaw } = useEstimateBuyYes(market?.id, amount);
  const { data: estimateNoRaw } = useEstimateBuyNo(market?.id, amount);

  const { approve, isPending: isApproving, isConfirming: isApproveConfirming } = useApproveUsdc();
  const { buyYes, isPending: isBuyYesPending, isConfirming: isBuyYesConfirming } = useBuyYes();
  const { buyNo, isPending: isBuyNoPending, isConfirming: isBuyNoConfirming } = useBuyNo();

  const allowance = allowanceRaw as bigint | undefined;
  const balance = balanceRaw as bigint | undefined;
  const estimateYes = estimateYesRaw as bigint | undefined;
  const estimateNo = estimateNoRaw as bigint | undefined;
  const position = positionRaw as [bigint, bigint] | undefined;

  const amountWei = useMemo(() => {
    try {
      return amount ? parseUnits(amount, 6) : 0n;
    } catch {
      return 0n;
    }
  }, [amount]);

  const needsApproval = allowance !== undefined && amountWei > 0n && allowance < amountWei;
  const estimatedShares = side === 'YES' ? estimateYes : estimateNo;
  const isActive = market?.status === MarketStatus.ACTIVE;
  const isBuying = isBuyYesPending || isBuyNoPending || isBuyYesConfirming || isBuyNoConfirming;

  useEffect(() => {
    setAmount('');
    setTxState('idle');
    setErrorMsg('');
    setSide('YES');
  }, [market?.id]);

  if (!market) return null;

  const statusInfo = STATUS_CONFIG[market.status];

  const handleApprove = async () => {
    try {
      setTxState('approving');
      setErrorMsg('');
      await approve(amount);
      await refetchAllowance();
      setTxState('idle');
    } catch (err: any) {
      setTxState('error');
      setErrorMsg(err?.shortMessage || err?.message || 'Approval failed');
    }
  };

  const handleBuy = async () => {
    if (!amount || amountWei === 0n) return;
    try {
      setTxState('buying');
      setErrorMsg('');
      if (side === 'YES') {
        await buyYes(market.id, amount);
      } else {
        await buyNo(market.id, amount);
      }
      setTxState('success');
      setAmount('');
    } catch (err: any) {
      setTxState('error');
      setErrorMsg(err?.shortMessage || err?.message || 'Transaction failed');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const centsSymbol = '\u00A2';

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-6 w-full max-w-md relative">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] uppercase tracking-[0.25em] font-mono px-2 py-0.5 rounded border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] font-mono text-nitro-muted">
                {formatTimeRemaining(market.endTime)}
              </span>
            </div>
            <h2 className="font-display text-white text-lg leading-tight">
              {market.question}
            </h2>
          </div>
          <button onClick={onClose} className="text-nitro-muted hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* ── Price cards ── */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#0d0d10] border border-[#2a2a30] rounded-lg p-3 text-center">
            <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-emerald-400 mb-1">YES</div>
            <div className="font-mono text-xl text-emerald-400 font-bold">
              {market.yesPriceCents}{centsSymbol}
            </div>
          </div>
          <div className="bg-[#0d0d10] border border-[#2a2a30] rounded-lg p-3 text-center">
            <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-rose-400 mb-1">NO</div>
            <div className="font-mono text-xl text-rose-400 font-bold">
              {market.noPriceCents}{centsSymbol}
            </div>
          </div>
        </div>

        {/* ── Wallet not connected ── */}
        {!isConnected && (
          <div className="text-center py-8">
            <DollarSign size={32} className="mx-auto text-nitro-muted mb-3" />
            <p className="font-mono text-nitro-muted text-sm">Connect Wallet to Trade</p>
          </div>
        )}

        {/* ── Trading UI (connected + active) ── */}
        {isConnected && isActive && (
          <>
            {/* Side toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSide('YES')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-[11px] uppercase tracking-widest transition-all border ${
                  side === 'YES'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-transparent border-[#2a2a30] text-nitro-muted hover:border-emerald-500/20'
                }`}
              >
                <ThumbsUp size={14} /> YES
              </button>
              <button
                onClick={() => setSide('NO')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-[11px] uppercase tracking-widest transition-all border ${
                  side === 'NO'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                    : 'bg-transparent border-[#2a2a30] text-nitro-muted hover:border-rose-500/20'
                }`}
              >
                <ThumbsDown size={14} /> NO
              </button>
            </div>

            {/* Amount input */}
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-[0.25em] font-mono text-nitro-muted block mb-1.5">
                Amount (USDC)
              </label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nitro-muted" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0d0d10] border border-[#2a2a30] rounded-lg py-2.5 pl-9 pr-3 font-mono text-white text-sm placeholder:text-nitro-muted/50 focus:outline-none focus:border-nitro-purple/50 transition-colors"
                />
              </div>
              {balance !== undefined && (
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] font-mono text-nitro-muted">
                    Balance: {Number(formatUsdc(balance)).toFixed(2)} USDC
                  </span>
                  <button
                    onClick={() => setAmount(formatUsdc(balance))}
                    className="text-[10px] font-mono text-nitro-purple hover:text-nitro-violet transition-colors"
                  >
                    MAX
                  </button>
                </div>
              )}
            </div>

            {/* Estimated shares */}
            {estimatedShares !== undefined && amountWei > 0n && (
              <div className="bg-[#0d0d10] border border-[#2a2a30] rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.25em] font-mono text-nitro-muted">
                    Est. Shares
                  </span>
                  <span className={`font-mono text-sm font-bold ${side === 'YES' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Number(formatShares(estimatedShares)).toFixed(4)}
                  </span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              {needsApproval ? (
                <BrutalistButton
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleApprove}
                  disabled={isApproving || isApproveConfirming || !amount || amountWei === 0n}
                >
                  {(isApproving || isApproveConfirming) ? (
                    <><Loader2 size={14} className="animate-spin" /> Approving USDC...</>
                  ) : (
                    'Approve USDC'
                  )}
                </BrutalistButton>
              ) : (
                <BrutalistButton
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleBuy}
                  disabled={isBuying || !amount || amountWei === 0n || txState === 'success'}
                >
                  {isBuying ? (
                    <><Loader2 size={14} className="animate-spin" /> Buying {side}...</>
                  ) : (
                    <>Buy {side}</>
                  )}
                </BrutalistButton>
              )}
            </div>

            {/* Success feedback */}
            {txState === 'success' && (
              <div className="mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <Check size={14} className="text-emerald-400" />
                <span className="font-mono text-[11px] text-emerald-400">Trade confirmed!</span>
              </div>
            )}

            {/* Error feedback */}
            {txState === 'error' && errorMsg && (
              <div className="mt-3 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                <span className="font-mono text-[11px] text-rose-400 break-all">{errorMsg}</span>
              </div>
            )}
          </>
        )}

        {/* ── Market not active ── */}
        {isConnected && !isActive && (
          <div className="text-center py-6">
            <p className="font-mono text-nitro-muted text-sm">This market is no longer active.</p>
          </div>
        )}

        {/* ── User position ── */}
        {isConnected && position && (position[0] > 0n || position[1] > 0n) && (
          <div className="mt-5 pt-4 border-t border-[#2a2a30]">
            <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-nitro-muted mb-2">
              Your Position
            </div>
            <div className="grid grid-cols-2 gap-3">
              {position[0] > 0n && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] font-mono text-emerald-400 mb-0.5">YES Shares</div>
                  <div className="font-mono text-sm text-emerald-300 font-bold">
                    {Number(formatShares(position[0])).toFixed(2)}
                  </div>
                </div>
              )}
              {position[1] > 0n && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] font-mono text-rose-400 mb-0.5">NO Shares</div>
                  <div className="font-mono text-sm text-rose-300 font-bold">
                    {Number(formatShares(position[1])).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
