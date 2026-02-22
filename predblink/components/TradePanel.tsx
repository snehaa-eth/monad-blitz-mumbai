
import React, { useState } from 'react';
import { Market, MetricType, MetricData } from '../types';
import { BrutalistButton } from './BrutalistButton';
import { ArrowRight, DollarSign, ThumbsUp, ThumbsDown } from 'lucide-react';

interface TradePanelProps {
  market: Market;
  metricType: MetricType;
  metricData: MetricData;
}

export const TradePanel: React.FC<TradePanelProps> = ({ market, metricType, metricData }) => {
  const [position, setPosition] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState<string>('100');
  const [isSuccess, setIsSuccess] = useState(false);

  const price = position === 'YES' ? metricData.yesPrice : metricData.noPrice;
  const shares = Math.floor(parseInt(amount || '0') / (price / 100));
  const potentialReturn = Math.floor(shares * 100);
  const profit = potentialReturn - parseInt(amount || '0');
  const roi = parseInt(amount) > 0 ? Math.floor((profit / parseInt(amount)) * 100) : 0;

  const handleTrade = () => {
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);
  };

  const metricColor =
    metricType === 'VIEWS' ? 'bg-blue-500' :
      metricType === 'RETWEETS' ? 'bg-green-500' :
        metricType === 'LIKES' ? 'bg-red-500' :
          'bg-orange-500';

  return (
    <div className="bg-white border-4 border-black shadow-hard flex flex-col relative overflow-hidden">
      {/* Success Overlay */}
      {isSuccess && (
        <div className="absolute inset-0 z-50 bg-banger-yellow flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 pattern-lines">
          <div className="bg-white border-4 border-black p-8 shadow-hard text-center">
            <div className="font-display text-4xl mb-2 text-black">ORDER FILLED</div>
            <div className="font-mono text-xl">TO THE MOON 🚀</div>
          </div>
        </div>
      )}

      <div className="bg-banger-black text-white p-4 border-b-4 border-black flex justify-between items-center relative overflow-hidden">
        <div className="pattern-dots absolute inset-0 opacity-20"></div>
        <div className="relative z-10">
          <h3 className="font-display text-xl uppercase">Trade Console</h3>
          <div className={`text-[10px] font-mono font-bold ${metricColor} px-2 py-0.5 text-white inline-block mt-1 border border-white shadow-[2px_2px_0px_0px_#fff]`}>
            TRADING: {metricType}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-banger-yellow relative z-10">
          <div className="w-2 h-2 bg-banger-yellow rounded-full animate-pulse shadow-[0_0_10px_#ecfd00]" />
          LIVE
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">

        {/* Arcade Style Position Toggles */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setPosition('YES')}
            className={`
              relative h-28 transition-all duration-100 group
              border-4 border-black font-display uppercase text-2xl flex flex-col items-center justify-center gap-2
              ${position === 'YES'
                ? 'bg-[#00ff00] text-black shadow-arcade-pressed translate-y-[6px] translate-x-[6px]'
                : 'bg-gray-100 text-gray-400 shadow-arcade hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-hard-sm'}
            `}
          >
            <ThumbsUp size={24} strokeWidth={3} className={position === 'YES' ? 'animate-bounce' : ''} />
            <div>YES</div>
            <div className="text-sm font-mono bg-black text-white px-2 py-1 rounded-sm">{metricData.yesPrice}¢</div>
            {/* Inner shine */}
            <div className="absolute top-2 left-2 w-full h-1/3 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>
          </button>

          <button
            onClick={() => setPosition('NO')}
            className={`
              relative h-28 transition-all duration-100 group
              border-4 border-black font-display uppercase text-2xl flex flex-col items-center justify-center gap-2
              ${position === 'NO'
                ? 'bg-[#ff0055] text-white shadow-arcade-pressed translate-y-[6px] translate-x-[6px]'
                : 'bg-gray-100 text-gray-400 shadow-arcade hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-hard-sm'}
            `}
          >
            <ThumbsDown size={24} strokeWidth={3} className={position === 'NO' ? 'animate-bounce' : ''} />
            <div>NO</div>
            <div className="text-sm font-mono bg-black text-white px-2 py-1 rounded-sm">{metricData.noPrice}¢</div>
            <div className="absolute top-2 left-2 w-full h-1/3 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>
          </button>
        </div>

        {/* Amount Input - Fixed Layout & Styling */}
        <div className="bg-banger-black p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
          <div className="flex justify-between items-end mb-2">
            <label className="font-mono font-bold text-xs text-gray-400 uppercase">Wager Amount</label>
            <span className="font-mono text-[10px] text-banger-yellow">BAL: $4,206.90</span>
          </div>

          <div className="relative">
            <DollarSign className="absolute top-1/2 -translate-y-1/2 left-3 text-banger-yellow pointer-events-none" />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-900 border-2 border-gray-700 text-white font-mono text-xl p-2 pl-10 focus:outline-none focus:border-banger-yellow focus:bg-black transition-all placeholder-gray-700"
              placeholder="0"
            />
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[10, 50, 100, 500].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-mono font-bold py-1 border-b-2 border-black active:border-t-2 active:border-b-0"
              >
                ${val}
              </button>
            ))}
          </div>
        </div>

        {/* Receipt / Summary */}
        <div className="bg-white border-2 border-black p-4 space-y-2 relative font-mono text-sm">
          {/* Jagged edge top */}
          <div className="absolute -top-2 left-0 w-full h-2 bg-[length:10px_10px] bg-[linear-gradient(45deg,transparent_33%,#000_33%,#000_66%,transparent_66%)] bg-repeat-x"></div>

          <div className="flex justify-between">
            <span className="text-gray-600">Shares</span>
            <span className="font-bold">{shares}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Payout</span>
            <span className="font-bold text-green-600">${potentialReturn}</span>
          </div>
          <div className="border-t-2 border-dashed border-gray-300 pt-2 mt-2 flex justify-between items-center">
            <span className="text-gray-600">ROI</span>
            <span className="font-bold bg-black text-banger-yellow px-2">
              {roi}%
            </span>
          </div>
        </div>

        <div className="mt-2">
          <BrutalistButton
            className="w-full py-4 text-xl flex justify-center items-center gap-2 shadow-arcade active:shadow-arcade-pressed active:translate-y-[6px] active:translate-x-[6px] transition-all"
            onClick={handleTrade}
            variant={position === 'YES' ? 'primary' : 'danger'}
          >
            BUY {position} <ArrowRight strokeWidth={3} />
          </BrutalistButton>
          <p className="text-center font-mono text-[10px] text-gray-400 mt-2">
            Fee: 1% • Slippage: 0.5%
          </p>
        </div>
      </div>
    </div>
  );
};
