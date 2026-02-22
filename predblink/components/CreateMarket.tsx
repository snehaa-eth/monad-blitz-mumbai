import React, { useState } from 'react';
import { BrutalistButton } from './BrutalistButton';
import { useWallet } from '../lib/useWallet';
import {
    useCreatePriceMarket,
    useCreateTwitterMarket,
    useCreateBlockMarket,
    useApproveUsdc,
    useUsdcAllowance,
    formatUsdc,
    useUsdcBalance,
    useMintUsdc,
} from '../lib/contracts';
import { TwitterMetric } from '../types';
import {
    DollarSign, Twitter, Cpu, Loader2, AlertCircle,
    CheckCircle, ArrowRight, Zap,
} from 'lucide-react';

type MarketTypeTab = 'PRICE' | 'TWITTER' | 'BLOCK';

interface CreateMarketProps {
    onCreated: () => void;
}

const SEED_AMOUNT = '10';

export const CreateMarket: React.FC<CreateMarketProps> = ({ onCreated }) => {
    const { isConnected, address, connect } = useWallet();
    const [marketType, setMarketType] = useState<MarketTypeTab>('PRICE');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Price market fields
    const [pair, setPair] = useState('BTC/USD');
    const [targetPrice, setTargetPrice] = useState('');
    const [priceDuration, setPriceDuration] = useState('300');
    const [priceQuestion, setPriceQuestion] = useState('');

    // Twitter market fields
    const [tweetId, setTweetId] = useState('');
    const [metric, setMetric] = useState<TwitterMetric>(TwitterMetric.LIKES);
    const [tweetTarget, setTweetTarget] = useState('');
    const [tweetDuration, setTweetDuration] = useState('1800');
    const [tweetQuestion, setTweetQuestion] = useState('');
    const [authorHandle, setAuthorHandle] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [tweetText, setTweetText] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    // Block market fields
    const [blockMetric, setBlockMetric] = useState('GAS_PRICE');
    const [blockTarget, setBlockTarget] = useState('');
    const [blockInterval, setBlockInterval] = useState('100');
    const [blockQuestion, setBlockQuestion] = useState('');

    // Contract hooks
    const { data: allowance } = useUsdcAllowance(address);
    const { data: balance } = useUsdcBalance(address);
    const { approve, isPending: isApproving, isConfirming: isApprovingTx } = useApproveUsdc();
    const { mint, isPending: isMinting } = useMintUsdc();
    const { create: createPrice, isPending: isPriceCreating, isConfirming: isPriceConfirming } = useCreatePriceMarket();
    const { create: createTwitter, isPending: isTwitterCreating, isConfirming: isTwitterConfirming } = useCreateTwitterMarket();
    const { create: createBlock, isPending: isBlockCreating, isConfirming: isBlockConfirming } = useCreateBlockMarket();

    const needsApproval = !allowance || allowance < BigInt(10 * 1e6);
    const hasBalance = balance ? balance >= BigInt(10 * 1e6) : false;
    const isLoading = isApproving || isApprovingTx || isPriceCreating || isPriceConfirming ||
        isTwitterCreating || isTwitterConfirming || isBlockCreating || isBlockConfirming;

    const handleCreate = async () => {
        setError(null);
        if (!isConnected) { connect(); return; }

        try {
            if (needsApproval) {
                await approve('1000000');
                return;
            }

            if (marketType === 'PRICE') {
                if (!targetPrice || !priceQuestion) { setError('Fill all fields'); return; }
                await createPrice({
                    pair,
                    targetPrice: BigInt(Math.round(parseFloat(targetPrice) * 1e8)),
                    duration: parseInt(priceDuration),
                    question: priceQuestion,
                });
            } else if (marketType === 'TWITTER') {
                if (!tweetId || !tweetTarget || !tweetQuestion) { setError('Fill all fields'); return; }
                await createTwitter({
                    tweetId,
                    metric,
                    targetValue: BigInt(tweetTarget),
                    duration: parseInt(tweetDuration),
                    question: tweetQuestion,
                    authorHandle: authorHandle || 'unknown',
                    authorName: authorName || 'Unknown',
                    tweetText: tweetText || '',
                    avatarUrl: avatarUrl || '',
                });
            } else {
                if (!blockTarget || !blockQuestion) { setError('Fill all fields'); return; }
                await createBlock({
                    metricName: blockMetric,
                    targetValue: BigInt(blockTarget),
                    blockInterval: parseInt(blockInterval),
                    question: blockQuestion,
                });
            }

            setSuccess(true);
            setTimeout(() => { setSuccess(false); onCreated(); }, 2000);
        } catch (err: any) {
            setError(err?.shortMessage || err?.message || 'Transaction failed');
        }
    };

    const tabClass = (t: MarketTypeTab) =>
        `flex-1 py-3 flex items-center justify-center gap-2 font-mono font-bold text-xs uppercase tracking-widest transition-all border-b-2 ${
            marketType === t
                ? 'text-nitro-purple border-nitro-purple'
                : 'text-nitro-muted border-transparent hover:text-white hover:border-[#333]'
        }`;

    const inputClass = "w-full bg-[#111114] border border-[#2a2a30] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-nitro-purple/60 transition-colors placeholder:text-nitro-muted/40";
    const labelClass = "font-mono text-[10px] uppercase tracking-[0.2em] text-nitro-muted font-bold mb-1.5 block";

    if (success) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <div className="bg-[#111114] border border-emerald-500/30 rounded-xl p-12">
                    <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                    <h2 className="font-display text-3xl font-bold text-white mb-2">Market Created</h2>
                    <p className="font-mono text-sm text-nitro-muted">Your prediction market is now live on Monad Testnet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
            <div>
                <h2 className="font-display text-3xl font-bold text-white mb-2">Create Market</h2>
                <p className="font-mono text-sm text-nitro-muted">
                    Requires {SEED_AMOUNT} USDC seed liquidity. Choose a market type below.
                </p>
            </div>

            {/* Type tabs */}
            <div className="flex border-b border-[#2a2a30]">
                <button className={tabClass('PRICE')} onClick={() => setMarketType('PRICE')}>
                    <DollarSign size={14} /> Price
                </button>
                <button className={tabClass('TWITTER')} onClick={() => setMarketType('TWITTER')}>
                    <Twitter size={14} /> Twitter
                </button>
                <button className={tabClass('BLOCK')} onClick={() => setMarketType('BLOCK')}>
                    <Cpu size={14} /> Block Data
                </button>
            </div>

            {/* Form */}
            <div className="bg-[#0c0c0f] border border-[#2a2a30] rounded-xl p-6 space-y-5">
                {marketType === 'PRICE' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Trading Pair</label>
                                <select value={pair} onChange={e => setPair(e.target.value)} className={inputClass}>
                                    <option value="BTC/USD">BTC/USD</option>
                                    <option value="ETH/USD">ETH/USD</option>
                                    <option value="MON/USD">MON/USD</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Target Price ($)</label>
                                <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="100000" className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Duration</label>
                            <select value={priceDuration} onChange={e => setPriceDuration(e.target.value)} className={inputClass}>
                                <option value="60">1 minute</option>
                                <option value="300">5 minutes</option>
                                <option value="900">15 minutes</option>
                                <option value="3600">1 hour</option>
                                <option value="86400">24 hours</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Question</label>
                            <input type="text" value={priceQuestion} onChange={e => setPriceQuestion(e.target.value)} placeholder={`Will ${pair} close above $${targetPrice || '...'} ?`} className={inputClass} />
                        </div>
                    </>
                )}

                {marketType === 'TWITTER' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Tweet ID</label>
                                <input type="text" value={tweetId} onChange={e => setTweetId(e.target.value)} placeholder="1234567890" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Metric</label>
                                <select value={metric} onChange={e => setMetric(Number(e.target.value) as TwitterMetric)} className={inputClass}>
                                    <option value={0}>Views</option>
                                    <option value={1}>Likes</option>
                                    <option value={2}>Retweets</option>
                                    <option value={3}>Comments</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Target Value</label>
                                <input type="number" value={tweetTarget} onChange={e => setTweetTarget(e.target.value)} placeholder="10000" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Duration</label>
                                <select value={tweetDuration} onChange={e => setTweetDuration(e.target.value)} className={inputClass}>
                                    <option value="300">5 minutes</option>
                                    <option value="1800">30 minutes</option>
                                    <option value="3600">1 hour</option>
                                    <option value="86400">24 hours</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Author Handle</label>
                                <input type="text" value={authorHandle} onChange={e => setAuthorHandle(e.target.value)} placeholder="elonmusk" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Author Name</label>
                                <input type="text" value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Elon Musk" className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Tweet Text</label>
                            <textarea value={tweetText} onChange={e => setTweetText(e.target.value)} placeholder="Paste the tweet content..." className={`${inputClass} h-20 resize-none`} />
                        </div>
                        <div>
                            <label className={labelClass}>Avatar URL (optional)</label>
                            <input type="text" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Question</label>
                            <input type="text" value={tweetQuestion} onChange={e => setTweetQuestion(e.target.value)} placeholder={`Will this tweet hit ${tweetTarget || '...'} ${['views', 'likes', 'retweets', 'comments'][metric]}?`} className={inputClass} />
                        </div>
                    </>
                )}

                {marketType === 'BLOCK' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Metric</label>
                                <select value={blockMetric} onChange={e => setBlockMetric(e.target.value)} className={inputClass}>
                                    <option value="GAS_PRICE">Gas Price</option>
                                    <option value="BASE_FEE">Base Fee</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Target (wei)</label>
                                <input type="number" value={blockTarget} onChange={e => setBlockTarget(e.target.value)} placeholder="50000000000" className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Block Interval</label>
                            <select value={blockInterval} onChange={e => setBlockInterval(e.target.value)} className={inputClass}>
                                <option value="10">10 blocks</option>
                                <option value="50">50 blocks</option>
                                <option value="100">100 blocks</option>
                                <option value="500">500 blocks</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Question</label>
                            <input type="text" value={blockQuestion} onChange={e => setBlockQuestion(e.target.value)} placeholder={`Will ${blockMetric.toLowerCase().replace('_', ' ')} exceed target in ${blockInterval} blocks?`} className={inputClass} />
                        </div>
                    </>
                )}
            </div>

            {/* Balance + Approve + Create */}
            <div className="space-y-3">
                {isConnected && (
                    <div className="flex items-center justify-between text-sm font-mono text-nitro-muted px-1">
                        <span>Balance: ${balance ? formatUsdc(balance) : '0'}</span>
                        {!hasBalance && (
                            <button onClick={() => mint('1000')} disabled={isMinting} className="text-nitro-purple hover:underline">
                                {isMinting ? 'Minting...' : '+ Mint 1000 test USDC'}
                            </button>
                        )}
                    </div>
                )}

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 font-mono text-sm text-rose-400 flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <BrutalistButton className="w-full py-4 text-sm" onClick={handleCreate} disabled={isLoading}>
                    {!isConnected ? (
                        'CONNECT WALLET'
                    ) : isLoading ? (
                        <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> PROCESSING...</span>
                    ) : needsApproval ? (
                        'APPROVE USDC'
                    ) : (
                        <span className="flex items-center gap-2"><Zap size={14} /> CREATE MARKET <ArrowRight size={14} /></span>
                    )}
                </BrutalistButton>
            </div>
        </div>
    );
};
