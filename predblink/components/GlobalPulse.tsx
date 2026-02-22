/**
 * GlobalPulse — live activity feed from on-chain Trade + MarketCreated events.
 * No DB, no indexer — reads logs directly from the blockchain via viem.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { getContracts } from '../lib/contracts/addresses';
import { ShoppingCart, Zap, Eye, Heart, Repeat2, MessageCircle } from 'lucide-react';

const addr = getContracts();

const TRADE_EVENT = parseAbiItem(
    'event Trade(uint256 indexed marketId, address indexed trader, bool isYes, bool isBuy, uint256 usdcAmount, uint256 shares, uint256 newYesPrice)'
);
const MARKET_CREATED_EVENT = parseAbiItem(
    'event MarketCreated(uint256 indexed id, uint8 indexed marketType, bytes32 feedId, string question, uint256 targetValue, uint256 endTime, uint256 endBlock, address creator)'
);

interface ActivityItem {
    type: 'TRADE' | 'CREATE';
    marketId: number;
    user: string;
    isYes?: boolean;
    isBuy?: boolean;
    amount?: string;
    question?: string;
    txHash: string;
    blockNumber: number;
}

const METRIC_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f97316'];
const METRIC_NAMES = ['VIEWS', 'LIKES', 'RETWEETS', 'COMMENTS'];
const METRIC_ICONS = [Eye, Heart, Repeat2, MessageCircle];

export const GlobalPulse: React.FC = () => {
    const client = usePublicClient();
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchActivity = useCallback(async () => {
        if (!client) return;
        setIsLoading(true);
        try {
            const currentBlock = await client.getBlockNumber();
            const fromBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n;

            const [tradeLogs, createLogs] = await Promise.all([
                client.getLogs({
                    address: addr.predBlink,
                    event: TRADE_EVENT,
                    fromBlock,
                    toBlock: 'latest',
                }),
                client.getLogs({
                    address: addr.predBlink,
                    event: MARKET_CREATED_EVENT,
                    fromBlock,
                    toBlock: 'latest',
                }),
            ]);

            const items: ActivityItem[] = [];

            for (const log of tradeLogs) {
                items.push({
                    type: 'TRADE',
                    marketId: Number(log.args.marketId!),
                    user: log.args.trader!,
                    isYes: log.args.isYes,
                    isBuy: log.args.isBuy,
                    amount: (Number(log.args.usdcAmount!) / 1e6).toFixed(2),
                    txHash: log.transactionHash,
                    blockNumber: Number(log.blockNumber),
                });
            }

            for (const log of createLogs) {
                items.push({
                    type: 'CREATE',
                    marketId: Number(log.args.id!),
                    user: (log.args as any).creator ?? '0x',
                    question: (log.args as any).question ?? '',
                    txHash: log.transactionHash,
                    blockNumber: Number(log.blockNumber),
                });
            }

            items.sort((a, b) => b.blockNumber - a.blockNumber);
            setActivity(items.slice(0, 50));
        } catch (e) {
            console.error('GlobalPulse: failed to fetch events', e);
        } finally {
            setIsLoading(false);
        }
    }, [client]);

    useEffect(() => { fetchActivity(); }, [fetchActivity]);

    // Poll every 15s
    useEffect(() => {
        const iv = setInterval(fetchActivity, 15_000);
        return () => clearInterval(iv);
    }, [fetchActivity]);

    const formatAddress = (a: string) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '???';

    const renderItem = (item: ActivityItem, index: number) => {
        const colorIdx = item.marketId % METRIC_COLORS.length;
        const MetricIcon = METRIC_ICONS[colorIdx];

        return (
            <div
                key={`${item.txHash}-${index}`}
                className="border-l-2 pl-2 animate-in slide-in-from-right duration-300"
                style={{ borderColor: METRIC_COLORS[colorIdx] }}
            >
                <div className="text-gray-500 text-[10px]">
                    {formatAddress(item.user)} • Block #{item.blockNumber}
                </div>
                {item.type === 'TRADE' ? (
                    <>
                        <div className="text-white flex items-center gap-1 uppercase font-bold text-[9px]">
                            <ShoppingCart size={10} className="text-banger-pink" />
                            {item.isBuy ? 'BOUGHT' : 'SOLD'}{' '}
                            {item.isYes ? (
                                <span className="text-green-400">YES</span>
                            ) : (
                                <span className="text-red-400">NO</span>
                            )}{' '}
                            ${item.amount}
                        </div>
                        <div className="truncate text-[10px] flex items-center gap-1" style={{ color: METRIC_COLORS[colorIdx] }}>
                            <MetricIcon size={10} /> Market #{item.marketId}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-white flex items-center gap-1 uppercase font-bold text-[9px]">
                            <Zap size={10} className="text-banger-yellow fill-banger-yellow" />
                            CREATED MARKET #{item.marketId}
                        </div>
                        {item.question && (
                            <div className="truncate text-[10px] text-nitro-muted">{item.question}</div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="w-full bg-black h-full flex flex-col font-mono text-xs overflow-hidden max-h-[500px]">
            <div className="bg-white text-black p-2 font-display text-[10px] uppercase flex justify-between items-center border-b-2 border-black">
                <div className="flex items-center gap-2">
                    <Zap size={12} className="text-banger-pink fill-banger-pink" />
                    <span>PredBlink Activity</span>
                </div>
                <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_6px_rgba(220,38,38,0.8)]"></div>
                    <span className="text-red-600 font-bold">LIVE</span>
                </div>
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto no-scrollbar">
                {isLoading && activity.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="text-gray-500 text-[10px] animate-pulse">Loading on-chain activity...</div>
                    </div>
                ) : activity.length > 0 ? (
                    activity.map((item, i) => renderItem(item, i))
                ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-[10px]">
                        <Zap size={24} className="mb-2 opacity-50" />
                        <span>No activity yet</span>
                        <span className="text-[9px] mt-1">Be the first to trade!</span>
                    </div>
                )}
            </div>
        </div>
    );
};
