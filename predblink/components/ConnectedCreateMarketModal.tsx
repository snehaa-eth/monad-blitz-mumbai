/**
 * ConnectedCreateMarketModal - Create market modal wired to smart contracts
 */

import React, { useState, useEffect } from 'react';
import { BrutalistButton } from './BrutalistButton';
import { X, Twitter, Zap, Loader2, AlertCircle, Eye, Heart, Repeat, MessageCircle, DollarSign, Lock, Sparkles, Trophy } from 'lucide-react';
import { useWallet } from '../lib/useWallet';
import { useDegenMode } from '../contexts/DegenContext';
import {
    useCreateMarket,
    useApproveUsdc,
    useUsdcBalance,
    useUsdcAllowance,
    useMintUsdc,
    formatUsdc,
    MetricType,
} from '../lib/contracts';
import { useMarketExists } from '../lib/contracts/hooks';
import { fetchTweetFromUrl, extractTweetId, extractAuthorHandle, getMetricValue, TweetData } from '../services/twitterService';

interface ConnectedCreateMarketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const METRIC_OPTIONS = [
    { type: MetricType.VIEWS, label: 'VIEWS', icon: Eye, color: 'bg-blue-500' },
    { type: MetricType.LIKES, label: 'LIKES', icon: Heart, color: 'bg-red-500' },
    { type: MetricType.RETWEETS, label: 'RETWEETS', icon: Repeat, color: 'bg-green-500' },
    { type: MetricType.COMMENTS, label: 'COMMENTS', icon: MessageCircle, color: 'bg-orange-500' },
];

const CATEGORY_OPTIONS = [
    { value: 'SHITPOST', label: '💩 SHITPOST', color: 'bg-banger-yellow' },
    { value: 'RAGEBAIT', label: '🔥 RAGEBAIT', color: 'bg-red-500' },
    { value: 'ALPHA', label: '🧠 ALPHA', color: 'bg-banger-cyan' },
    { value: 'DRAMA', label: '🎭 DRAMA', color: 'bg-banger-pink' },
];

// Metric-specific target presets based on typical Twitter/X engagement ranges
const TARGET_PRESETS: Record<MetricType, string[]> = {
    [MetricType.VIEWS]: ['100000', '500000', '1000000', '5000000'],     // Views: 100K - 5M
    [MetricType.LIKES]: ['5000', '10000', '50000', '100000'],           // Likes: 5K - 100K
    [MetricType.RETWEETS]: ['1000', '5000', '10000', '50000'],          // RTs: 1K - 50K
    [MetricType.COMMENTS]: ['500', '1000', '5000', '10000'],            // Comments: 500 - 10K
};

// Initial liquidity required to create a market
const INITIAL_LIQUIDITY = 10; // $10 USDC

export const ConnectedCreateMarketModal: React.FC<ConnectedCreateMarketModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const { degenMode } = useDegenMode();
    const { isConnected, address, connect } = useWallet();
    const [tweetUrl, setTweetUrl] = useState('');
    const [step, setStep] = useState<'input' | 'loading' | 'configure' | 'success'>('input');
    const [selectedMetric, setSelectedMetric] = useState<MetricType>(MetricType.VIEWS);
    const [selectedCategory, setSelectedCategory] = useState('SHITPOST');
    const [targetValue, setTargetValue] = useState('1000000');
    const [tweetData, setTweetData] = useState<TweetData | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Extract from URL or use fetched data
    const tweetId = tweetData?.tweetId || extractTweetId(tweetUrl);
    const authorHandle = tweetData?.authorHandle || extractAuthorHandle(tweetUrl);

    // Get current metric value from live tweet data
    const currentMetricValue = tweetData ? getMetricValue(tweetData,
        selectedMetric === MetricType.VIEWS ? 'VIEWS' :
            selectedMetric === MetricType.LIKES ? 'LIKES' :
                selectedMetric === MetricType.RETWEETS ? 'RETWEETS' : 'COMMENTS'
    ) : 0;

    // Contract reads
    const { data: usdcBalance } = useUsdcBalance(address);
    const { data: allowance } = useUsdcAllowance(address);

    // Check if markets exist for each metric (only when we have a tweetId)
    const { data: viewsMarketExists } = useMarketExists(tweetId || '', MetricType.VIEWS);
    const { data: likesMarketExists } = useMarketExists(tweetId || '', MetricType.LIKES);
    const { data: retweetsMarketExists } = useMarketExists(tweetId || '', MetricType.RETWEETS);
    const { data: commentsMarketExists } = useMarketExists(tweetId || '', MetricType.COMMENTS);

    // Map to check if a metric is taken
    const takenMetrics: Record<MetricType, boolean> = {
        [MetricType.VIEWS]: !!viewsMarketExists,
        [MetricType.LIKES]: !!likesMarketExists,
        [MetricType.RETWEETS]: !!retweetsMarketExists,
        [MetricType.COMMENTS]: !!commentsMarketExists,
    };

    // Contract writes
    const { approve, isPending: isApproving, isConfirming: isApprovingConfirming } = useApproveUsdc();
    const { createMarket, isPending: isCreating, isConfirming: isCreatingConfirming, isSuccess: createSuccess, error: createError } = useCreateMarket();
    const { mint, isPending: isMinting, isConfirming: isMintingConfirming } = useMintUsdc();

    // Check if needs approval
    const requiredAmount = BigInt(INITIAL_LIQUIDITY * 1e6);
    const needsApproval = !allowance || allowance < requiredAmount;
    const hasEnoughBalance = usdcBalance && usdcBalance >= requiredAmount;

    const balanceDisplay = usdcBalance ? formatUsdc(usdcBalance) : '0';

    // Reset modal state when reopened
    useEffect(() => {
        if (isOpen) {
            setTweetUrl('');
            setStep('input');
            setError(null);
            setFetchError(null);
            setTweetData(null);
            setSelectedMetric(MetricType.VIEWS);
            setSelectedCategory('SHITPOST');
            setTargetValue('1000000');
        }
    }, [isOpen]);

    // Watch for success
    useEffect(() => {
        if (createSuccess) {
            setStep('success');
            setTimeout(() => {
                onSuccess?.();
                handleClose();
            }, 2000);
        }
    }, [createSuccess, onSuccess]);

    // Watch for errors
    useEffect(() => {
        if (createError) {
            setError(createError.message || 'Failed to create market');
        }
    }, [createError]);

    // Update target value to first preset when metric changes
    useEffect(() => {
        const defaultTarget = TARGET_PRESETS[selectedMetric][1]; // Use second preset as default
        setTargetValue(defaultTarget);
    }, [selectedMetric]);

    const handleClose = () => {
        setTweetUrl('');
        setStep('input');
        setError(null);
        setFetchError(null);
        setTweetData(null);
        setSelectedMetric(MetricType.VIEWS);
        setTargetValue('1000000');
        onClose();
    };

    const handleNext = async () => {
        const id = extractTweetId(tweetUrl);
        if (!id) {
            setFetchError('Please enter a valid tweet URL');
            return;
        }

        setFetchError(null);
        setStep('loading');

        try {
            const data = await fetchTweetFromUrl(tweetUrl);
            if (data) {
                setTweetData(data);
                // Set default target based on current metric (e.g., 2x current)
                const currentViews = data.views || 100000;
                setTargetValue(String(Math.round(currentViews * 2)));
                setStep('configure');
            } else {
                setFetchError('Could not fetch tweet data. Check the URL.');
                setStep('input');
            }
        } catch (err: any) {
            console.error('Tweet fetch error:', err);
            setFetchError(err.message || 'Failed to fetch tweet');
            setStep('input');
        }
    };

    const handleCreate = async () => {
        if (!isConnected) {
            connect();
            return;
        }

        setError(null);

        try {
            // Check balance
            if (!hasEnoughBalance) {
                setError(`Need ${INITIAL_LIQUIDITY} USDC. Click +MINT to get test USDC.`);
                return;
            }

            // Check approval
            if (needsApproval) {
                await approve('1000000'); // Approve 1M USDC
                return;
            }

            // Build media JSON from tweet data
            let mediaJson = '[]';
            if (tweetData?.imageUrl) {
                mediaJson = JSON.stringify([{ type: 'image', url: tweetData.imageUrl }]);
            }

            // Create market with full V2 tweet data
            await createMarket({
                // Tweet data
                tweetId: tweetId!,
                tweetUrl: tweetUrl,
                tweetText: tweetData?.text || '',
                authorHandle: tweetData?.authorHandle || authorHandle || '',
                authorName: tweetData?.authorName || '',
                avatarUrl: tweetData?.avatarUrl || '',
                mediaJson: mediaJson,
                // Quote tweet
                hasQuotedTweet: !!tweetData?.quotedTweet,
                quotedTweetId: tweetData?.quotedTweet?.tweetId || '',
                quotedTweetText: tweetData?.quotedTweet?.text || '',
                quotedAuthorHandle: tweetData?.quotedTweet?.authorHandle || '',
                quotedAuthorName: tweetData?.quotedTweet?.authorName || '',
                // Market config
                category: selectedCategory,
                metric: selectedMetric,
                targetValue: Number(targetValue),
                duration: 86400, // 24 hours
            });
        } catch (err: any) {
            console.error('Create market error:', err);
            setError(err.message || 'Failed to create market');
        }
    };

    const handleMint = async () => {
        try {
            await mint('1000');
        } catch (err: any) {
            setError(err.message || 'Mint failed');
        }
    };

    const isLoading = isApproving || isApprovingConfirming || isCreating || isCreatingConfirming;
    const isMintingLoading = isMinting || isMintingConfirming;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className={`border-4 border-black shadow-hard max-w-lg w-full relative animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col transition-all ${degenMode ? 'bg-white shadow-[12px_12px_0px_0px_#000]' : 'bg-white shadow-hard'}`}>
                {degenMode && <div className="scanline opacity-10"></div>}

                {/* Close Button - Inside modal */}
                <button
                    onClick={handleClose}
                    className={`absolute top-2 right-2 p-1.5 border-2 border-black transition-colors z-10 ${degenMode ? 'bg-[#ff00ff] text-white shadow-[2px_2px_0px_0px_#000] hover:bg-black' : 'bg-banger-pink text-white shadow-hard-sm hover:bg-black'}`}
                >
                    <X size={16} strokeWidth={3} />
                </button>

                {/* Success State */}
                {step === 'success' && (
                    <div className={`p-8 flex flex-col items-center justify-center pattern-lines min-h-[300px] relative overflow-hidden ${degenMode ? 'bg-[#ff00ff]' : 'bg-banger-yellow'}`}>
                        {degenMode && (
                            <>
                                <div className="absolute top-4 right-10 animate-bounce text-[#ecfd00]"><Trophy size={64} /></div>
                                <div className="absolute bottom-10 left-4 animate-pulse text-[#00ffff]"><Sparkles size={48} /></div>
                            </>
                        )}
                        <div className="bg-white border-4 border-black p-8 shadow-hard text-center relative z-10 transform -rotate-1">
                            <div className="font-display text-4xl mb-2 text-black uppercase">Market Created!</div>
                            <div className="font-mono text-lg text-black uppercase font-bold">You're now the Scout 🔥</div>
                            <div className="font-mono text-sm mt-2 text-gray-600">
                                You received 10 YES + 10 NO shares
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State - Fetching Tweet */}
                {step === 'loading' && (
                    <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
                        <Loader2 size={48} className="animate-spin text-banger-pink mb-4" />
                        <div className="font-display text-2xl mb-2">FETCHING TWEET...</div>
                        <div className="font-mono text-sm text-gray-500">Getting live metrics from Twitter</div>
                    </div>
                )}

                {/* Input Step */}
                {step === 'input' && (
                    <div className="p-6">
                        {/* Header */}
                        <div className={`flex items-center gap-3 mb-6 border-b-4 border-black pb-4 transition-colors ${degenMode ? 'bg-[#00ffaa] p-2 -mx-6 -mt-6' : ''}`}>
                            <div className={`p-2 border-2 border-black transition-colors ${degenMode ? 'bg-black text-white' : 'bg-banger-yellow text-black'}`}>
                                <Zap size={24} />
                            </div>
                            <h2 className={`font-display text-2xl uppercase ${degenMode ? 'text-black' : ''}`}>Spot Alpha</h2>
                        </div>

                        {/* Tweet URL Input */}
                        <div className="mb-6">
                            <label className={`font-mono text-xs font-bold uppercase mb-2 block ${degenMode ? 'text-[#ff00ff]' : 'text-gray-500'}`}>
                                Tweet URL
                            </label>
                            <div className="relative">
                                <Twitter size={20} className={`absolute left-3 top-1/2 -translate-y-1/2 ${degenMode ? 'text-[#2d1b54]' : 'text-gray-400'}`} />
                                <input
                                    type="text"
                                    value={tweetUrl}
                                    onChange={(e) => setTweetUrl(e.target.value)}
                                    placeholder="https://x.com/user/status/..."
                                    className={`w-full border-4 border-black p-3 pl-10 font-mono text-sm focus:outline-none transition-all ${degenMode ? 'bg-[#f0f0f0] focus:bg-white focus:border-[#ff00ff]' : 'focus:border-banger-pink'}`}
                                />
                            </div>
                            {tweetUrl && tweetId && (
                                <div className={`mt-2 font-mono text-xs ${degenMode ? 'text-[#00ffaa] bg-black px-2 py-1 inline-block' : 'text-green-600'}`}>
                                    ✓ Tweet ID: {tweetId} • @{authorHandle}
                                </div>
                            )}
                        </div>

                        {fetchError && (
                            <div className="mb-4 bg-red-100 border-2 border-red-500 text-red-700 p-3 font-mono text-sm flex items-center gap-2">
                                <AlertCircle size={16} />
                                {fetchError}
                            </div>
                        )}

                        <BrutalistButton
                            onClick={handleNext}
                            disabled={!tweetUrl.trim()}
                            className="w-full"
                        >
                            NEXT: CONFIGURE MARKET
                        </BrutalistButton>
                    </div>
                )}

                {/* Configure Step */}
                {step === 'configure' && (
                    <div className="p-4 overflow-y-auto flex-1">
                        {/* Header */}
                        <div className={`flex items-center gap-3 mb-4 border-b-2 border-black pb-3 transition-colors ${degenMode ? 'bg-[#ff00ff] p-2 -mx-4 -mt-4 mb-6' : ''}`}>
                            <div className={`p-1.5 border-2 border-black transition-colors ${degenMode ? 'bg-[#ecfd00] text-black' : 'bg-banger-cyan text-black'}`}>
                                <Zap size={20} />
                            </div>
                            <div>
                                <h2 className={`font-display text-xl uppercase ${degenMode ? 'text-black' : ''}`}>Configure Market</h2>
                                <div className={`font-mono text-xs ${degenMode ? 'text-white bg-black px-1' : 'text-gray-500'}`}>@{authorHandle}</div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className={`font-mono text-[10px] font-bold uppercase mb-2 block ${degenMode ? 'text-[#ff00ff]' : 'text-gray-500'}`}>
                                What metric to track?
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {METRIC_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    const isTaken = takenMetrics[option.type];
                                    return (
                                        <button
                                            key={option.type}
                                            onClick={() => !isTaken && setSelectedMetric(option.type)}
                                            disabled={isTaken}
                                            className={`
                                                p-2.5 border-2 border-black transition-all flex flex-col items-center gap-1
                                                ${isTaken
                                                    ? 'bg-gray-300 text-gray-400 cursor-not-allowed opacity-50 line-through'
                                                    : selectedMetric === option.type
                                                        ? (degenMode ? 'bg-[#00ffaa] text-black shadow-arcade-pressed translate-x-0.5 translate-y-0.5' : `${option.color} text-white shadow-arcade-pressed translate-x-0.5 translate-y-0.5`)
                                                        : (degenMode ? 'bg-[#2d1b54] text-white hover:bg-black shadow-[4px_4px_0px_0px_#000]' : 'bg-gray-100 hover:bg-gray-200 shadow-hard-sm')}
                                            `}
                                        >
                                            {isTaken ? <Lock size={16} /> : <Icon size={16} />}
                                            <span className="font-mono text-[10px] font-bold">{option.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Category Selection - Inline compact layout */}
                        <div className="mb-4">
                            <label className={`font-mono text-[10px] font-bold uppercase mb-2 block ${degenMode ? 'text-[#ff00ff]' : 'text-gray-500'}`}>
                                Category
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {CATEGORY_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setSelectedCategory(option.value)}
                                        className={`
                                            py-1.5 px-3 border-2 border-black transition-all font-mono text-[10px] font-bold
                                            ${selectedCategory === option.value
                                                ? (degenMode ? 'bg-[#00ffff] text-black shadow-arcade-pressed translate-x-0.5 translate-y-0.5' : `${option.color} text-black shadow-arcade-pressed translate-x-0.5 translate-y-0.5`)
                                                : (degenMode ? 'bg-[#2d1b54] text-white hover:bg-black shadow-[2px_2px_0px_0px_#000]' : 'bg-white hover:bg-gray-100 shadow-hard-sm')}
                                        `}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Target Value */}
                        <div className="mb-4">
                            <label className={`font-mono text-[10px] font-bold uppercase mb-1 block ${degenMode ? 'text-[#ff00ff]' : 'text-gray-500'}`}>
                                Target to hit
                            </label>
                            <input
                                type="number"
                                value={targetValue}
                                onChange={(e) => setTargetValue(e.target.value)}
                                className={`w-full border-2 border-black p-2 font-mono text-base focus:outline-none transition-all ${degenMode ? 'bg-black text-[#ecfd00] focus:border-[#00ffff]' : 'focus:border-banger-pink'}`}
                                placeholder="1000000"
                            />
                            <div className="flex gap-1 mt-1">
                                {TARGET_PRESETS[selectedMetric].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => setTargetValue(val)}
                                        className={`flex-1 border border-black py-0.5 font-mono text-[10px] transition-colors
                                            ${targetValue === val
                                                ? (degenMode ? 'bg-[#00ffff] text-black border-black font-bold' : 'bg-banger-cyan text-black border-banger-cyan font-bold')
                                                : (degenMode ? 'bg-[#2d1b54] text-white hover:bg-black' : 'bg-gray-100 hover:bg-gray-200')}`}
                                    >
                                        {Number(val) >= 1000000 ? `${Number(val) / 1000000}M` : `${Number(val) / 1000}K`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cost Display */}
                        <div className={`p-3 border-2 border-black mb-4 transition-colors ${degenMode ? 'bg-black text-white' : 'bg-banger-black text-white'}`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className={`font-mono text-[10px] ${degenMode ? 'text-[#ff00ff]' : 'text-gray-400'}`}>SCOUT FEE</div>
                                    <div className={`font-display text-xl flex items-center gap-1 ${degenMode ? 'text-[#00ffaa]' : ''}`}>
                                        <DollarSign size={16} />
                                        {INITIAL_LIQUIDITY} USDC
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-mono text-[10px] ${degenMode ? 'text-[#ff00ff]' : 'text-gray-400'}`}>YOUR BALANCE</div>
                                    <div className={`font-mono text-base flex items-center gap-2 ${degenMode ? 'text-[#00ffff]' : 'text-banger-yellow'}`}>
                                        ${balanceDisplay}
                                        {isConnected && !hasEnoughBalance && (
                                            <button
                                                onClick={handleMint}
                                                disabled={isMintingLoading}
                                                className={`font-mono text-[10px] px-2 py-0.5 hover:bg-white hover:text-black transition-colors ${degenMode ? 'bg-[#ff00ff] text-white' : 'bg-banger-pink text-white'}`}
                                            >
                                                {isMintingLoading ? '...' : '+MINT'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className={`mt-2 font-mono text-[10px] ${degenMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                You'll receive: 10 YES + 10 NO shares (worth ${INITIAL_LIQUIDITY})
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 bg-red-100 border-2 border-red-500 text-red-700 p-3 font-mono text-sm flex items-center gap-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <BrutalistButton
                                onClick={() => setStep('input')}
                                variant="secondary"
                                className="flex-1"
                            >
                                BACK
                            </BrutalistButton>
                            <BrutalistButton
                                onClick={handleCreate}
                                disabled={isLoading}
                                className="flex-1"
                            >
                                {!isConnected ? (
                                    'CONNECT WALLET'
                                ) : isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={16} />
                                        {needsApproval ? 'APPROVING...' : 'CREATING...'}
                                    </span>
                                ) : needsApproval ? (
                                    'APPROVE USDC'
                                ) : (
                                    'CREATE MARKET'
                                )}
                            </BrutalistButton>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
