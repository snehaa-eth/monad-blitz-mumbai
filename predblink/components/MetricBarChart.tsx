/**
 * MetricBarChart - Simple bar chart comparing YES vs NO
 * Features:
 * - Two vertical bars side by side
 * - YES bar uses metric-specific color
 * - NO bar is black
 * - White background matching brutalist UI
 * - PredBlink logo watermark
 */

import React from 'react';
import { Eye, Heart, Repeat2, MessageCircle } from 'lucide-react';

interface MetricBarChartProps {
    metricName: string;
    targetValue: string;
    yesPrice: number;  // AMM price from contract (in cents, e.g. 42 = 42¢ = 42%)
    noPrice: number;   // AMM price from contract (in cents, e.g. 57 = 57¢ = 57%)
    tradeCount?: number; // Optional trade count for volume display
}

// Metric colors mapping (Tailwind-equivalent hex for consistent branding)
const METRIC_COLORS: Record<string, string> = {
    VIEWS: '#3b82f6',      // Blue-500
    LIKES: '#ef4444',      // Red-500 (Hearts)
    RETWEETS: '#22c55e',   // Green-500
    COMMENTS: '#f97316',   // Orange-500
};

const METRIC_ICONS: Record<string, React.ReactNode> = {
    VIEWS: <Eye size={16} />,
    LIKES: <Heart size={16} />,
    RETWEETS: <Repeat2 size={16} />,
    COMMENTS: <MessageCircle size={16} />,
};

import { useDegenMode } from '../contexts/DegenContext';
import { Sparkles, Zap, Trophy } from 'lucide-react';

export const MetricBarChart: React.FC<MetricBarChartProps> = ({
    metricName,
    targetValue,
    yesPrice,
    noPrice,
    tradeCount = 0
}) => {
    const { degenMode } = useDegenMode();
    // These are AMM prices from the contract, already in cents (which equals %)
    const currentYesPrice = yesPrice;
    const currentNoPrice = noPrice;
    const metricColor = degenMode ? '#ecfd00' : (METRIC_COLORS[metricName.toUpperCase()] || '#3b82f6');
    const metricIcon = METRIC_ICONS[metricName.toUpperCase()] || <Eye size={16} />;

    return (
        <div className={`border-4 border-black flex flex-col transition-all ${degenMode ? 'bg-[#ff00ff] shadow-[12px_12px_0px_0px_#000]' : 'bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
            {/* Header */}
            <div className={`border-b-4 border-black p-4 flex justify-between items-center transition-colors ${degenMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
                <div>
                    <div className={`font-mono text-[10px] uppercase mb-0.5 tracking-wider ${degenMode ? 'text-[#00ffff]' : 'text-gray-400'}`}>Market Sentiment</div>
                    <div className={`font-display text-xl md:text-2xl uppercase leading-tight ${degenMode ? 'text-[#ecfd00] drop-shadow-[2px_2px_0px_#ff00ff]' : ''}`}>
                        Will it hit {targetValue} {metricName}?
                    </div>
                </div>
                {/* PredBlink Logo */}
                <div className={`border-2 border-black p-1 shadow-[2px_2px_0px_0px_#000] rotate-3 hover:-rotate-12 transition-transform ${degenMode ? 'bg-[#00ffff]' : 'bg-banger-yellow'}`}>
                    <img
                        src="/square-image.png"
                        alt="PredBlink"
                        className="w-8 h-8 object-contain"
                    />
                </div>
            </div>

            {/* Chart Area */}
            <div className={`p-6 md:p-10 relative overflow-hidden ${degenMode ? 'bg-[#2d1b54] bg-[radial-gradient(#ff00ff_1px,transparent_1px)] [background-size:15px_15px]' : 'bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:20px_20px]'}`}>
                {degenMode && (
                    <>
                        <div className="absolute top-2 right-4 text-cyan-400 animate-pulse opacity-40 rotate-12"><Zap size={48} /></div>
                        <div className="absolute bottom-10 left-4 text-yellow-400 animate-bounce opacity-40 -rotate-12"><Trophy size={40} /></div>
                    </>
                )}
                {/* Background Text Watermark */}
                <div className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden ${degenMode ? 'opacity-[0.05]' : 'opacity-[0.03]'}`}>
                    <span className={`text-[120px] font-black font-display uppercase -rotate-12 whitespace-nowrap ${degenMode ? 'text-[#ff00ff]' : ''}`}>
                        {metricName} {metricName} {metricName}
                    </span>
                </div>

                {/* Always show chart since prices come from props */}
                {(
                    <div className="h-[300px] w-full flex relative z-10">
                        {/* Y-Axis Labels */}
                        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] font-mono font-bold text-black -translate-x-2 py-1">
                            <span>100</span>
                            <span>75</span>
                            <span className="text-banger-yellow bg-black px-1">50</span>
                            <span>25</span>
                            <span>0</span>
                        </div>

                        {/* Chart Grid & Content Container */}
                        <div className="flex-1 ml-10 border-l-4 border-b-4 border-black relative bg-white/40 backdrop-blur-[1px]">
                            {/* Horizontal Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                <div className="border-t border-gray-300 w-full" />
                                <div className="border-t border-gray-200 border-dashed w-full" />
                                <div className="border-t-2 border-black/20 w-full relative">
                                    <span className={`absolute -right-16 top-1/2 -translate-y-1/2 font-mono text-[8px] font-bold uppercase tracking-tighter ${degenMode ? 'text-[#ff00ff]' : 'text-gray-400'}`}>Equilibrium</span>
                                </div>
                                <div className="border-t border-gray-200 border-dashed w-full" />
                                <div className="h-0 w-full" />
                            </div>

                            {/* Bars Container */}
                            <div className="absolute inset-0 flex items-end justify-around px-2 md:px-8">
                                {/* YES Bar */}
                                <div className="flex flex-col items-center group relative h-full justify-end pb-0">
                                    {/* Bar "Track" Background */}
                                    <div className="absolute bottom-0 w-16 md:w-24 h-full bg-gray-50 border-x border-gray-100 pointer-events-none -z-10" />

                                    <div
                                        className={`w-16 md:w-24 border-4 border-black transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1) relative ${degenMode ? 'shadow-[10px_10px_0px_0px_#000] group-hover:shadow-[14px_14px_0px_0px_#000]' : 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}
                                        style={{
                                            height: `${Math.max(currentYesPrice, 2)}%`,
                                            backgroundColor: metricColor,
                                            backgroundImage: degenMode
                                                ? 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.2) 2px, rgba(0, 0, 0, 0.2) 4px)'
                                                : 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)'
                                        }}
                                    >
                                        {/* Glow Effect */}
                                        <div className="absolute inset-0 opacity-20 bg-gradient-to-t from-black/20 to-transparent" />

                                        {/* Value Label */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black border-2 border-black text-white px-3 py-1 text-xs font-mono font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-30 scale-90 group-hover:scale-100">
                                            {currentYesPrice}% YES
                                        </div>

                                        {currentYesPrice > 20 && (
                                            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                                <span className={`font-mono font-black text-xl md:text-3xl drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] ${degenMode ? 'text-black' : 'text-white'}`}>
                                                    {currentYesPrice}%
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Labels */}
                                    <div className="absolute -bottom-14 flex flex-col items-center">
                                        <div className="w-8 h-8 rounded-none border-2 border-black flex items-center justify-center mb-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: metricColor }}>
                                            <span className="text-white">{metricIcon}</span>
                                        </div>
                                        <span className={`font-display text-[10px] font-black uppercase tracking-widest ${degenMode ? 'drop-shadow-[1px_1px_0px_#000]' : ''}`} style={{ color: metricColor }}>YES SIDE</span>
                                    </div>
                                </div>

                                {/* NO Bar */}
                                <div className="flex flex-col items-center group relative h-full justify-end pb-0">
                                    {/* Bar "Track" Background */}
                                    <div className="absolute bottom-0 w-16 md:w-24 h-full bg-gray-50 border-x border-gray-100 pointer-events-none -z-10" />

                                    <div
                                        className={`w-16 md:w-24 border-4 border-black transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1) relative ${degenMode ? 'shadow-[10px_10px_0px_0px_#000] group-hover:shadow-[14px_14px_0px_0px_#000]' : 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}
                                        style={{
                                            height: `${Math.max(currentNoPrice, 2)}%`,
                                            backgroundColor: degenMode ? '#ff00ff' : 'black',
                                            backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)'
                                        }}
                                    >
                                        {/* Value Label */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black border-2 border-black text-white px-3 py-1 text-xs font-mono font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-30 scale-90 group-hover:scale-100">
                                            {currentNoPrice}% NO
                                        </div>

                                        {currentNoPrice > 20 && (
                                            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                                <span className="font-mono font-black text-xl md:text-3xl text-white">
                                                    {currentNoPrice}%
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Labels */}
                                    <div className="absolute -bottom-14 flex flex-col items-center">
                                        <div className="w-8 h-8 rounded-none bg-black border-2 border-black flex items-center justify-center mb-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                            <span className="text-white text-xs font-bold">✕</span>
                                        </div>
                                        <span className={`font-display text-[10px] font-black uppercase tracking-widest ${degenMode ? 'text-black' : 'text-black/40'}`}>NO SIDE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Labels Padding */}
            <div className="h-16" />

            {/* Footer */}
            <div className={`border-t-4 border-black p-3 flex justify-between items-center mt-auto ${degenMode ? 'bg-white' : 'bg-white'}`}>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    <span className={`font-mono text-[10px] uppercase tracking-widest ${degenMode ? 'text-black font-bold' : 'text-gray-400'}`}>Live Activity Network</span>
                </div>
                <div className={`font-mono text-[10px] font-bold border-2 border-black px-2 py-0.5 ${degenMode ? 'bg-[#ecfd00] text-black shadow-[2px_2px_0px_0px_#000]' : 'bg-gray-100 text-black'}`}>
                    {tradeCount} TRADES
                </div>
            </div>
        </div>
    );
};
