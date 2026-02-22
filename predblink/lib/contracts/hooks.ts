/**
 * React hooks for PredBlink contract interactions.
 * Targets the new PredBlink.sol (3 market types, CPMM AMM, ERC-1155 shares).
 *
 * NOTE: ABIs are imported from ./abis — regenerate them from the compiled
 *       artifacts whenever the contract changes.
 */

import {
    useReadContract,
    useReadContracts,
    useWriteContract,
    useWaitForTransactionReceipt,
    useAccount,
} from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { getContracts } from './addresses';
import { PREDBLINK_ABI, MOCK_USDC_ABI, SHARE_TOKEN_ABI } from './abis';
import { MarketType, TwitterMetric } from '../../types';

const contracts = getContracts();

// ═══════════════════════════════════════════
//               READ HOOKS
// ═══════════════════════════════════════════

export function useMarketCount() {
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'marketCount',
    });
}

export function useMarketCore(marketId: number | undefined) {
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'getMarketCore',
        args: marketId !== undefined ? [BigInt(marketId)] : undefined,
        query: { enabled: marketId !== undefined },
    });
}

export function useMarketAMM(marketId: number | undefined) {
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'getMarketAMM',
        args: marketId !== undefined ? [BigInt(marketId)] : undefined,
        query: { enabled: marketId !== undefined },
    });
}

export function useMarketQuestion(marketId: number | undefined) {
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'getMarketQuestion',
        args: marketId !== undefined ? [BigInt(marketId)] : undefined,
        query: { enabled: marketId !== undefined },
    });
}

export function useTweetMeta(marketId: number | undefined) {
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'tweetMeta',
        args: marketId !== undefined ? [BigInt(marketId)] : undefined,
        query: { enabled: marketId !== undefined },
    });
}

export function usePriceMeta(marketId: number | undefined) {
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'priceMeta',
        args: marketId !== undefined ? [BigInt(marketId)] : undefined,
        query: { enabled: marketId !== undefined },
    });
}

export function useBlockMeta(marketId: number | undefined) {
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'blockMeta',
        args: marketId !== undefined ? [BigInt(marketId)] : undefined,
        query: { enabled: marketId !== undefined },
    });
}

export function useYesPriceCents(marketId: number | undefined) {
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'getYesPriceCents',
        args: marketId !== undefined ? [BigInt(marketId)] : undefined,
        query: { enabled: marketId !== undefined },
    });
}

export function useNoPriceCents(marketId: number | undefined) {
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'getNoPriceCents',
        args: marketId !== undefined ? [BigInt(marketId)] : undefined,
        query: { enabled: marketId !== undefined },
    });
}

export function useIsExpired(marketId: number | undefined) {
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'isExpired',
        args: marketId !== undefined ? [BigInt(marketId)] : undefined,
        query: { enabled: marketId !== undefined },
    });
}

export function useEstimateBuyYes(marketId: number | undefined, usdcAmount: string) {
    const amountWei = parseUnits(usdcAmount || '0', 6);
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'estimateBuyYes',
        args: marketId !== undefined ? [BigInt(marketId), amountWei] : undefined,
        query: { enabled: marketId !== undefined && amountWei > 0n },
    });
}

export function useEstimateBuyNo(marketId: number | undefined, usdcAmount: string) {
    const amountWei = parseUnits(usdcAmount || '0', 6);
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'estimateBuyNo',
        args: marketId !== undefined ? [BigInt(marketId), amountWei] : undefined,
        query: { enabled: marketId !== undefined && amountWei > 0n },
    });
}

export function useUserPosition(marketId: number | undefined, userAddress?: `0x${string}`) {
    return useReadContract({
        address: contracts.predBlink,
        abi: PREDBLINK_ABI,
        functionName: 'getUserPosition',
        args: (marketId !== undefined && userAddress)
            ? [BigInt(marketId), userAddress]
            : undefined,
        query: { enabled: marketId !== undefined && !!userAddress },
    });
}

export function useUsdcBalance(address?: string) {
    return useReadContract({
        address: contracts.mockUSDC,
        abi: MOCK_USDC_ABI,
        functionName: 'balanceOf',
        args: address ? [address as `0x${string}`] : undefined,
        query: { enabled: !!address },
    });
}

export function useUsdcAllowance(address?: string) {
    return useReadContract({
        address: contracts.mockUSDC,
        abi: MOCK_USDC_ABI,
        functionName: 'allowance',
        args: address
            ? [address as `0x${string}`, contracts.predBlink]
            : undefined,
        query: { enabled: !!address },
    });
}

// Multicall: get all user positions across markets
export function useAllUserPositions(marketIds: number[], userAddress?: `0x${string}`) {
    const { data, isLoading, refetch } = useReadContracts({
        contracts: marketIds.map(id => ({
            address: contracts.predBlink,
            abi: PREDBLINK_ABI,
            functionName: 'getUserPosition' as const,
            args: [BigInt(id), userAddress!],
        })),
        query: { enabled: !!userAddress && marketIds.length > 0 },
    });

    const positions: { marketId: number; yesShares: bigint; noShares: bigint }[] = [];
    if (data) {
        for (let i = 0; i < marketIds.length; i++) {
            const r = data[i];
            if (r?.status === 'success' && r.result) {
                const [yes, no] = r.result as unknown as [bigint, bigint];
                if (yes > 0n || no > 0n) {
                    positions.push({ marketId: marketIds[i], yesShares: yes, noShares: no });
                }
            }
        }
    }

    return { positions, isLoading, refetch };
}

// ═══════════════════════════════════════════
//              WRITE HOOKS
// ═══════════════════════════════════════════

export function useApproveUsdc() {
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const approve = async (amount: string) => {
        const amountWei = parseUnits(amount, 6);
        return writeContractAsync({
            address: contracts.mockUSDC,
            abi: MOCK_USDC_ABI,
            functionName: 'approve',
            args: [contracts.predBlink, amountWei],
        });
    };

    return { approve, isPending, isConfirming, isSuccess, error, hash };
}

export function useMintUsdc() {
    const { address } = useAccount();
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const mint = async (amount: string) => {
        if (!address) throw new Error('Wallet not connected');
        const amountWei = parseUnits(amount, 6);
        return writeContractAsync({
            address: contracts.mockUSDC,
            abi: MOCK_USDC_ABI,
            functionName: 'mint',
            args: [address, amountWei],
        });
    };

    return { mint, isPending, isConfirming, isSuccess, error, hash };
}

export function useBuyYes() {
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const buyYes = async (marketId: number, usdcAmount: string) => {
        const amountWei = parseUnits(usdcAmount, 6);
        return writeContractAsync({
            address: contracts.predBlink,
            abi: PREDBLINK_ABI,
            functionName: 'buyYes',
            args: [BigInt(marketId), amountWei],
        });
    };

    return { buyYes, isPending, isConfirming, isSuccess, error, hash };
}

export function useBuyNo() {
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const buyNo = async (marketId: number, usdcAmount: string) => {
        const amountWei = parseUnits(usdcAmount, 6);
        return writeContractAsync({
            address: contracts.predBlink,
            abi: PREDBLINK_ABI,
            functionName: 'buyNo',
            args: [BigInt(marketId), amountWei],
        });
    };

    return { buyNo, isPending, isConfirming, isSuccess, error, hash };
}

export function useSellYes() {
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const sellYes = async (marketId: number, shares: string) => {
        const sharesWei = parseUnits(shares, 18);
        return writeContractAsync({
            address: contracts.predBlink,
            abi: PREDBLINK_ABI,
            functionName: 'sellYes',
            args: [BigInt(marketId), sharesWei],
        });
    };

    return { sellYes, isPending, isConfirming, isSuccess, error, hash };
}

export function useSellNo() {
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const sellNo = async (marketId: number, shares: string) => {
        const sharesWei = parseUnits(shares, 18);
        return writeContractAsync({
            address: contracts.predBlink,
            abi: PREDBLINK_ABI,
            functionName: 'sellNo',
            args: [BigInt(marketId), sharesWei],
        });
    };

    return { sellNo, isPending, isConfirming, isSuccess, error, hash };
}

// Permissionless — for PRICE markets only. Reads Pyth price from PriceOracle.
export function useResolveMarket() {
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const resolveMarket = async (marketId: number) => {
        return writeContractAsync({
            address: contracts.predBlink,
            abi: PREDBLINK_ABI,
            functionName: 'resolveMarket',
            args: [BigInt(marketId)],
        });
    };

    return { resolveMarket, isPending, isConfirming, isSuccess, error, hash };
}

// Owner-only — for TWITTER and BLOCK_DATA markets.
export function useResolveManual() {
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const resolveManual = async (marketId: number, finalValue: bigint) => {
        return writeContractAsync({
            address: contracts.predBlink,
            abi: PREDBLINK_ABI,
            functionName: 'resolveManual',
            args: [BigInt(marketId), finalValue],
        });
    };

    return { resolveManual, isPending, isConfirming, isSuccess, error, hash };
}

export function useClaimWinnings() {
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const claimWinnings = async (marketId: number) => {
        return writeContractAsync({
            address: contracts.predBlink,
            abi: PREDBLINK_ABI,
            functionName: 'claimWinnings',
            args: [BigInt(marketId)],
        });
    };

    return { claimWinnings, isPending, isConfirming, isSuccess, error, hash };
}

export function useReclaimVoided() {
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const reclaimVoided = async (marketId: number) => {
        return writeContractAsync({
            address: contracts.predBlink,
            abi: PREDBLINK_ABI,
            functionName: 'reclaimVoided',
            args: [BigInt(marketId)],
        });
    };

    return { reclaimVoided, isPending, isConfirming, isSuccess, error, hash };
}

// ── Market creation hooks (3 types) ──

export function useCreatePriceMarket() {
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const create = async (params: {
        pair: string;
        targetPrice: bigint;
        duration: number;
        question: string;
    }) => {
        return writeContractAsync({
            address: contracts.predBlink,
            abi: PREDBLINK_ABI,
            functionName: 'createPriceMarket',
            args: [params.pair, params.targetPrice, BigInt(params.duration), params.question],
        });
    };

    return { create, isPending, isConfirming, isSuccess, error, hash };
}

export function useCreateTwitterMarket() {
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const create = async (params: {
        tweetId: string;
        metric: TwitterMetric;
        targetValue: bigint;
        duration: number;
        question: string;
        authorHandle: string;
        authorName: string;
        tweetText: string;
        avatarUrl: string;
    }) => {
        return writeContractAsync({
            address: contracts.predBlink,
            abi: PREDBLINK_ABI,
            functionName: 'createTwitterMarket',
            args: [
                params.tweetId,
                params.metric,
                params.targetValue,
                BigInt(params.duration),
                params.question,
                params.authorHandle,
                params.authorName,
                params.tweetText,
                params.avatarUrl,
            ],
        });
    };

    return { create, isPending, isConfirming, isSuccess, error, hash };
}

export function useCreateBlockMarket() {
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const create = async (params: {
        metricName: string;
        targetValue: bigint;
        blockInterval: number;
        question: string;
    }) => {
        return writeContractAsync({
            address: contracts.predBlink,
            abi: PREDBLINK_ABI,
            functionName: 'createBlockMarket',
            args: [
                params.metricName,
                params.targetValue,
                BigInt(params.blockInterval),
                params.question,
            ],
        });
    };

    return { create, isPending, isConfirming, isSuccess, error, hash };
}

// ═══════════════════════════════════════════
//            UTILITY FUNCTIONS
// ═══════════════════════════════════════════

export function formatShares(shares: bigint): string {
    return formatUnits(shares, 18);
}

export function formatUsdc(amount: bigint): string {
    return formatUnits(amount, 6);
}

export function parseUsdc(amount: string): bigint {
    return parseUnits(amount, 6);
}

export function formatPrice8Dec(price: bigint): string {
    return (Number(price) / 1e8).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

