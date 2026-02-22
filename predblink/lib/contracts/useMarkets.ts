/**
 * useMarkets — pure on-chain. No DB, no indexer.
 * Multicalls getMarketCore + getMarketAMM + getMarketQuestion + type metadata.
 */

import { useReadContract, useReadContracts } from 'wagmi';
import { useMemo } from 'react';
import { getContracts } from './addresses';
import { PREDBLINK_ABI } from './abis';
import {
    OnChainMarket,
    MarketType,
    MarketStatus,
    TweetMeta,
    PriceMeta,
    BlockMeta,
    TwitterMetric,
} from '../../types';

const addr = getContracts();

export function useMarkets() {
    const { data: countRaw, isLoading: countLoading, refetch: refetchCount } = useReadContract({
        address: addr.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'marketCount',
    });

    const count = countRaw ? Number(countRaw) : 0;
    const ids = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

    // Batch 1: core + amm + question for every market
    const batch1 = useMemo(() => {
        const calls: any[] = [];
        for (const id of ids) {
            calls.push({ address: addr.predBlink, abi: PREDBLINK_ABI, functionName: 'getMarketCore' as const, args: [BigInt(id)] });
            calls.push({ address: addr.predBlink, abi: PREDBLINK_ABI, functionName: 'getMarketAMM' as const, args: [BigInt(id)] });
            calls.push({ address: addr.predBlink, abi: PREDBLINK_ABI, functionName: 'getMarketQuestion' as const, args: [BigInt(id)] });
        }
        return calls;
    }, [ids]);

    const { data: b1, isLoading: b1Loading, refetch: refetchB1 } = useReadContracts({
        contracts: batch1,
        query: { enabled: count > 0 },
    });

    // Figure out which metadata calls we need based on marketType from core results
    const metaCalls = useMemo(() => {
        if (!b1) return [] as { address: `0x${string}`; abi: any; functionName: string; args: any[]; _i: number; _t: string }[];
        const calls: { address: `0x${string}`; abi: any; functionName: string; args: any[]; _i: number; _t: string }[] = [];
        for (let i = 0; i < ids.length; i++) {
            const core = b1[i * 3];
            if (core?.status !== 'success') continue;
            const mt = Number((core.result as any[])[0]);
            const id = ids[i];
            if (mt === MarketType.TWITTER) {
                calls.push({ address: addr.predBlink, abi: PREDBLINK_ABI, functionName: 'tweetMeta', args: [BigInt(id)], _i: i, _t: 'tweet' });
            } else if (mt === MarketType.PRICE) {
                calls.push({ address: addr.predBlink, abi: PREDBLINK_ABI, functionName: 'priceMeta', args: [BigInt(id)], _i: i, _t: 'price' });
            } else if (mt === MarketType.BLOCK_DATA) {
                calls.push({ address: addr.predBlink, abi: PREDBLINK_ABI, functionName: 'blockMeta', args: [BigInt(id)], _i: i, _t: 'block' });
            }
        }
        return calls;
    }, [b1, ids]);

    const cleanMeta = useMemo(() => metaCalls.map(({ _i, _t, ...rest }) => rest), [metaCalls]);

    const { data: metaData, isLoading: metaLoading } = useReadContracts({
        contracts: cleanMeta,
        query: { enabled: cleanMeta.length > 0 },
    });

    // Assemble
    const markets: OnChainMarket[] = useMemo(() => {
        if (!b1) return [];

        const metaMap = new Map<number, { type: string; data: any }>();
        if (metaData) {
            for (let j = 0; j < metaCalls.length; j++) {
                const r = metaData[j];
                if (r?.status === 'success') {
                    metaMap.set(metaCalls[j]._i, { type: metaCalls[j]._t, data: r.result });
                }
            }
        }

        const result: OnChainMarket[] = [];
        for (let i = 0; i < ids.length; i++) {
            const coreR = b1[i * 3];
            const ammR = b1[i * 3 + 1];
            const qR = b1[i * 3 + 2];
            if (coreR?.status !== 'success' || ammR?.status !== 'success') continue;

            const c = coreR.result as any[];
            const a = ammR.result as any[];
            const question = qR?.status === 'success' ? (qR.result as string) : '';
            const meta = metaMap.get(i);

            let tweetMeta: TweetMeta | undefined;
            let priceMeta: PriceMeta | undefined;
            let blockMeta: BlockMeta | undefined;

            if (meta?.type === 'tweet') {
                const d = meta.data as any;
                tweetMeta = {
                    tweetId: d[0] ?? d.tweetId ?? '',
                    authorHandle: d[1] ?? d.authorHandle ?? '',
                    authorName: d[2] ?? d.authorName ?? '',
                    tweetText: d[3] ?? d.tweetText ?? '',
                    avatarUrl: d[4] ?? d.avatarUrl ?? '',
                    metric: Number(d[5] ?? d.metric ?? 0) as TwitterMetric,
                };
            } else if (meta?.type === 'price') {
                const d = meta.data as any;
                priceMeta = { pair: d[0] ?? d.pair ?? '', decimals: Number(d[1] ?? d.decimals ?? 8) };
            } else if (meta?.type === 'block') {
                const d = meta.data as any;
                blockMeta = { metricName: d[0] ?? d.metricName ?? '', blockInterval: BigInt(d[1] ?? d.blockInterval ?? 0) };
            }

            result.push({
                id: ids[i],
                marketType: Number(c[0]) as MarketType,
                feedId: c[1] as string,
                question,
                targetValue: BigInt(c[2]),
                snapshotValue: BigInt(c[3]),
                startTime: 0,
                endTime: Number(c[4]),
                endBlock: Number(c[5]),
                status: Number(c[6]) as MarketStatus,
                resolvedValue: BigInt(c[7] ?? 0),
                yesPool: BigInt(a[0]),
                noPool: BigInt(a[1]),
                yesPriceCents: Number(a[2]),
                noPriceCents: Number(a[3]),
                totalVolume: BigInt(a[4]),
                tradeCount: Number(a[5]),
                creator: '',
                tweetMeta,
                priceMeta,
                blockMeta,
            });
        }
        return result;
    }, [b1, metaData, metaCalls, ids]);

    const refetch = () => { refetchCount(); refetchB1(); };

    return { markets, count, isLoading: countLoading || b1Loading || metaLoading, refetch };
}

// ── Single-market hook for route pages ───────────────────────────────────────

export function useMarket(id: number | undefined) {
    const enabled = id !== undefined && !isNaN(id);

    const { data: b1, isLoading: coreLoading } = useReadContracts({
        contracts: enabled ? [
            { address: addr.predBlink, abi: PREDBLINK_ABI, functionName: 'getMarketCore' as const, args: [BigInt(id!)] },
            { address: addr.predBlink, abi: PREDBLINK_ABI, functionName: 'getMarketAMM' as const, args: [BigInt(id!)] },
            { address: addr.predBlink, abi: PREDBLINK_ABI, functionName: 'getMarketQuestion' as const, args: [BigInt(id!)] },
        ] : [],
        query: { enabled },
    });

    const marketType = b1?.[0]?.status === 'success' ? Number((b1[0].result as any[])[0]) as MarketType : undefined;

    const { data: metaArr, isLoading: metaLoading } = useReadContracts({
        contracts: (enabled && marketType !== undefined) ? (() => {
            if (marketType === MarketType.TWITTER) return [{ address: addr.predBlink, abi: PREDBLINK_ABI, functionName: 'tweetMeta' as const, args: [BigInt(id!)] }];
            if (marketType === MarketType.PRICE)   return [{ address: addr.predBlink, abi: PREDBLINK_ABI, functionName: 'priceMeta' as const, args: [BigInt(id!)] }];
            if (marketType === MarketType.BLOCK_DATA) return [{ address: addr.predBlink, abi: PREDBLINK_ABI, functionName: 'blockMeta' as const, args: [BigInt(id!)] }];
            return [];
        })() : [],
        query: { enabled: enabled && marketType !== undefined },
    });

    const market: OnChainMarket | null = useMemo(() => {
        if (!b1 || b1[0]?.status !== 'success' || b1[1]?.status !== 'success') return null;
        const c = b1[0].result as any[];
        const a = b1[1].result as any[];
        const question = b1[2]?.status === 'success' ? (b1[2].result as string) : '';
        const mt = Number(c[0]) as MarketType;

        let tweetMeta: TweetMeta | undefined;
        let priceMeta: PriceMeta | undefined;
        let blockMeta: BlockMeta | undefined;

        if (metaArr?.[0]?.status === 'success') {
            const d = metaArr[0].result as any;
            if (mt === MarketType.TWITTER) {
                tweetMeta = { tweetId: d[0], authorHandle: d[1], authorName: d[2], tweetText: d[3], avatarUrl: d[4], metric: Number(d[5]) as TwitterMetric };
            } else if (mt === MarketType.PRICE) {
                priceMeta = { pair: d[0], decimals: Number(d[1]) };
            } else if (mt === MarketType.BLOCK_DATA) {
                blockMeta = { metricName: d[0], blockInterval: BigInt(d[1]) };
            }
        }

        return {
            id: id!,
            marketType: mt,
            feedId: c[1],
            question,
            targetValue: BigInt(c[2]),
            snapshotValue: BigInt(c[3]),
            startTime: 0,
            endTime: Number(c[4]),
            endBlock: Number(c[5]),
            status: Number(c[6]) as MarketStatus,
            resolvedValue: BigInt(c[7] ?? 0),
            yesPool: BigInt(a[0]),
            noPool: BigInt(a[1]),
            yesPriceCents: Number(a[2]),
            noPriceCents: Number(a[3]),
            totalVolume: BigInt(a[4]),
            tradeCount: Number(a[5]),
            creator: '',
            tweetMeta, priceMeta, blockMeta,
        };
    }, [b1, metaArr, id]);

    return { market, isLoading: coreLoading || metaLoading };
}
