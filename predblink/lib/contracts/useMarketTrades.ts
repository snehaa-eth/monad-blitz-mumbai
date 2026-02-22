/**
 * On-chain Trade event reader — no DB, no indexer.
 * Uses viem's getLogs to read Trade events directly from the blockchain.
 */

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { getContracts } from './addresses';

const addr = getContracts();

const TRADE_EVENT = parseAbiItem(
    'event Trade(uint256 indexed marketId, address indexed trader, bool isYes, bool isBuy, uint256 usdcAmount, uint256 shares, uint256 newYesPrice)'
);

export interface OnChainTrade {
    marketId: number;
    trader: string;
    isYes: boolean;
    isBuy: boolean;
    usdcAmount: bigint;
    shares: bigint;
    newYesPrice: bigint;
    blockNumber: bigint;
    txHash: string;
}

export interface PricePoint {
    blockNumber: number;
    yesPriceCents: number;
    noPriceCents: number;
    isYes: boolean;
    isBuy: boolean;
    amount: string;
    trader: string;
}

export function useMarketTradesOnChain(marketId: number | undefined) {
    const client = usePublicClient();
    const [trades, setTrades] = useState<OnChainTrade[]>([]);
    const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTrades = useCallback(async () => {
        if (marketId === undefined || !client) return;
        setIsLoading(true);
        setError(null);

        try {
            const logs = await client.getLogs({
                address: addr.predBlink,
                event: TRADE_EVENT,
                args: { marketId: BigInt(marketId) },
                fromBlock: 0n,
                toBlock: 'latest',
            });

            const parsed: OnChainTrade[] = logs.map(log => ({
                marketId: Number(log.args.marketId!),
                trader: log.args.trader!,
                isYes: log.args.isYes!,
                isBuy: log.args.isBuy!,
                usdcAmount: log.args.usdcAmount!,
                shares: log.args.shares!,
                newYesPrice: log.args.newYesPrice!,
                blockNumber: log.blockNumber,
                txHash: log.transactionHash,
            }));

            setTrades(parsed);

            const history: PricePoint[] = parsed.map(t => {
                const yp = Number(t.newYesPrice) / 1e16;
                return {
                    blockNumber: Number(t.blockNumber),
                    yesPriceCents: Math.round(yp),
                    noPriceCents: 100 - Math.round(yp),
                    isYes: t.isYes,
                    isBuy: t.isBuy,
                    amount: (Number(t.usdcAmount) / 1e6).toFixed(2),
                    trader: t.trader,
                };
            });
            setPriceHistory(history);
        } catch (e: any) {
            console.error('Failed to fetch on-chain trades:', e);
            setError(e?.message || 'Failed to read events');
        } finally {
            setIsLoading(false);
        }
    }, [marketId, client]);

    useEffect(() => { fetchTrades(); }, [fetchTrades]);

    const last = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : null;

    return {
        trades,
        priceHistory,
        currentYesPrice: last?.yesPriceCents ?? 50,
        currentNoPrice: last?.noPriceCents ?? 50,
        isLoading,
        error,
        refetch: fetchTrades,
    };
}

/**
 * Fetch all Trade events for a specific user across all markets.
 */
export function useUserTradesOnChain(userAddress?: `0x${string}`) {
    const client = usePublicClient();
    const [trades, setTrades] = useState<OnChainTrade[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTrades = useCallback(async () => {
        if (!userAddress || !client) return;
        setIsLoading(true);
        try {
            const logs = await client.getLogs({
                address: addr.predBlink,
                event: TRADE_EVENT,
                args: { trader: userAddress },
                fromBlock: 0n,
                toBlock: 'latest',
            });

            setTrades(logs.map(log => ({
                marketId: Number(log.args.marketId!),
                trader: log.args.trader!,
                isYes: log.args.isYes!,
                isBuy: log.args.isBuy!,
                usdcAmount: log.args.usdcAmount!,
                shares: log.args.shares!,
                newYesPrice: log.args.newYesPrice!,
                blockNumber: log.blockNumber,
                txHash: log.transactionHash,
            })));
        } catch (e) {
            console.error('Failed to fetch user trades:', e);
        } finally {
            setIsLoading(false);
        }
    }, [userAddress, client]);

    useEffect(() => { fetchTrades(); }, [fetchTrades]);

    return { trades, isLoading, refetch: fetchTrades };
}
