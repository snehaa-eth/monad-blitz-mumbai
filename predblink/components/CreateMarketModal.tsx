import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { X, Plus, Loader2 } from 'lucide-react';
import { MarketType, TwitterMetric } from '../types';
import {
  useCreatePriceMarket,
  useCreateTwitterMarket,
  useCreateBlockMarket,
  useApproveUsdc,
  useUsdcAllowance,
  formatUsdc,
} from '../lib/contracts/hooks';
import { BrutalistButton } from './BrutalistButton';

interface CreateMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'PRICE' | 'TWITTER' | 'BLOCK';

const SEED_LIQUIDITY = 10_000_000n; // 10 USDC (6 decimals)

const INPUT_CLS =
  'w-full bg-[#0c0c0f] border border-[#2a2a30] rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-nitro-purple/50 focus:outline-none';
const LABEL_CLS =
  'text-[10px] uppercase tracking-[0.25em] text-nitro-muted font-mono font-bold';

export const CreateMarketModal: React.FC<CreateMarketModalProps> = ({ isOpen, onClose }) => {
  const { address } = useAccount();
  const [tab, setTab] = useState<TabType>('PRICE');

  const [pair, setPair] = useState('BTC/USD');
  const [targetPrice, setTargetPrice] = useState('');
  const [priceDuration, setPriceDuration] = useState('');
  const [priceQuestion, setPriceQuestion] = useState('');

  const [tweetId, setTweetId] = useState('');
  const [twitterMetric, setTwitterMetric] = useState<TwitterMetric>(TwitterMetric.VIEWS);
  const [twitterTarget, setTwitterTarget] = useState('');
  const [twitterDuration, setTwitterDuration] = useState('');
  const [twitterQuestion, setTwitterQuestion] = useState('');
  const [authorHandle, setAuthorHandle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [tweetText, setTweetText] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [blockMetric, setBlockMetric] = useState('GAS_PRICE');
  const [blockTarget, setBlockTarget] = useState('');
  const [blockInterval, setBlockInterval] = useState('');
  const [blockQuestion, setBlockQuestion] = useState('');

  const { data: allowanceRaw, refetch: refetchAllowance } = useUsdcAllowance(address);
  const allowance = (allowanceRaw as bigint | undefined) ?? 0n;
  const needsApproval = allowance < SEED_LIQUIDITY;

  const { approve, isPending: isApproving, isConfirming: isApproveConfirming } = useApproveUsdc();
  const priceMarket = useCreatePriceMarket();
  const twitterMarket = useCreateTwitterMarket();
  const blockMarket = useCreateBlockMarket();

  const isBusy =
    isApproving ||
    isApproveConfirming ||
    priceMarket.isPending ||
    priceMarket.isConfirming ||
    twitterMarket.isPending ||
    twitterMarket.isConfirming ||
    blockMarket.isPending ||
    blockMarket.isConfirming;

  const handleApprove = async () => {
    try {
      await approve('1000');
      setTimeout(() => refetchAllowance(), 2000);
    } catch {
      // user rejected or tx error
    }
  };

  const handleCreate = async () => {
    try {
      if (tab === 'PRICE') {
        await priceMarket.create({
          pair,
          targetPrice: BigInt(Math.floor(parseFloat(targetPrice) * 1e8)),
          duration: parseInt(priceDuration) * 60,
          question: priceQuestion,
        });
      } else if (tab === 'TWITTER') {
        await twitterMarket.create({
          tweetId,
          metric: twitterMetric,
          targetValue: BigInt(twitterTarget),
          duration: parseInt(twitterDuration) * 60,
          question: twitterQuestion,
          authorHandle,
          authorName,
          tweetText,
          avatarUrl,
        });
      } else {
        await blockMarket.create({
          metricName: blockMetric,
          targetValue: BigInt(blockTarget),
          blockInterval: parseInt(blockInterval),
          question: blockQuestion,
        });
      }
      onClose();
    } catch {
      // user rejected or tx error
    }
  };

  if (!isOpen) return null;

  const tabs: TabType[] = ['PRICE', 'TWITTER', 'BLOCK'];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#111114] border border-[#2a2a30] rounded-xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-mono font-bold text-lg tracking-wide">CREATE MARKET</h2>
          <button onClick={onClose} className="text-nitro-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-3 rounded-lg font-mono text-[11px] font-bold uppercase tracking-widest transition-all ${
                tab === t
                  ? 'bg-nitro-purple text-white'
                  : 'bg-[#0c0c0f] text-nitro-muted border border-[#2a2a30] hover:border-nitro-purple/40'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'PRICE' && (
          <div className="space-y-4">
            <div>
              <label className={LABEL_CLS}>Pair</label>
              <select value={pair} onChange={(e) => setPair(e.target.value)} className={INPUT_CLS}>
                <option value="BTC/USD">BTC/USD</option>
                <option value="ETH/USD">ETH/USD</option>
                <option value="MON/USD">MON/USD</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Target Price ($)</label>
              <input
                type="number"
                placeholder="e.g. 100000"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Duration (minutes)</label>
              <input
                type="number"
                placeholder="e.g. 60"
                value={priceDuration}
                onChange={(e) => setPriceDuration(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Question</label>
              <input
                type="text"
                placeholder="Will BTC hit $100k by end of market?"
                value={priceQuestion}
                onChange={(e) => setPriceQuestion(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          </div>
        )}

        {tab === 'TWITTER' && (
          <div className="space-y-4">
            <div>
              <label className={LABEL_CLS}>Tweet ID</label>
              <input
                type="text"
                placeholder="1234567890"
                value={tweetId}
                onChange={(e) => setTweetId(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Metric</label>
              <select
                value={twitterMetric}
                onChange={(e) => setTwitterMetric(Number(e.target.value) as TwitterMetric)}
                className={INPUT_CLS}
              >
                <option value={TwitterMetric.VIEWS}>VIEWS</option>
                <option value={TwitterMetric.LIKES}>LIKES</option>
                <option value={TwitterMetric.RETWEETS}>RETWEETS</option>
                <option value={TwitterMetric.COMMENTS}>COMMENTS</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Target Value</label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={twitterTarget}
                onChange={(e) => setTwitterTarget(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Duration (minutes)</label>
              <input
                type="number"
                placeholder="e.g. 120"
                value={twitterDuration}
                onChange={(e) => setTwitterDuration(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Question</label>
              <input
                type="text"
                placeholder="Will this tweet hit 50k views?"
                value={twitterQuestion}
                onChange={(e) => setTwitterQuestion(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Author Handle</label>
                <input
                  type="text"
                  placeholder="@elonmusk"
                  value={authorHandle}
                  onChange={(e) => setAuthorHandle(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Author Name</label>
                <input
                  type="text"
                  placeholder="Elon Musk"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Tweet Text</label>
              <input
                type="text"
                placeholder="The tweet content..."
                value={tweetText}
                onChange={(e) => setTweetText(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Avatar URL</label>
              <input
                type="text"
                placeholder="https://pbs.twimg.com/..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          </div>
        )}

        {tab === 'BLOCK' && (
          <div className="space-y-4">
            <div>
              <label className={LABEL_CLS}>Metric Name</label>
              <select
                value={blockMetric}
                onChange={(e) => setBlockMetric(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="GAS_PRICE">GAS_PRICE</option>
                <option value="BASE_FEE">BASE_FEE</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Target Value (wei)</label>
              <input
                type="number"
                placeholder="e.g. 1000000000"
                value={blockTarget}
                onChange={(e) => setBlockTarget(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Block Interval</label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={blockInterval}
                onChange={(e) => setBlockInterval(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Question</label>
              <input
                type="text"
                placeholder="Will gas price exceed 10 gwei in 100 blocks?"
                value={blockQuestion}
                onChange={(e) => setBlockQuestion(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          </div>
        )}

        <div className="mt-6 mb-4 px-3 py-2 bg-nitro-purple/10 border border-nitro-purple/20 rounded-lg">
          <p className="text-[11px] font-mono text-nitro-purple">
            Creating a market requires 10 USDC seed liquidity.
          </p>
        </div>

        <div className="flex gap-3">
          {needsApproval ? (
            <BrutalistButton
              className="flex-1"
              onClick={handleApprove}
              disabled={isBusy || !address}
            >
              {isApproving || isApproveConfirming ? (
                <><Loader2 size={14} className="animate-spin" /> Approving...</>
              ) : (
                'Approve USDC'
              )}
            </BrutalistButton>
          ) : (
            <BrutalistButton
              className="flex-1"
              onClick={handleCreate}
              disabled={isBusy || !address}
            >
              {isBusy ? (
                <><Loader2 size={14} className="animate-spin" /> Creating...</>
              ) : (
                <><Plus size={14} /> Create Market</>
              )}
            </BrutalistButton>
          )}
        </div>
      </div>
    </div>
  );
};
