/**
 * PolymarketChart - Polymarket-style price chart with YES/NO lines
 * Features:
 * - Green line for YES price
 * - Red line for NO price  
 * - PredBlink mascot in corner
 * - Real-time data from indexer
 */

import React, { useMemo } from 'react';
import { useMarketTrades, PricePoint } from '../lib/contracts/useMarketTrades';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface PolymarketChartProps {
    marketId: number;
    metricName: string;
    targetValue: string;
}

export const PolymarketChart: React.FC<PolymarketChartProps> = ({ marketId, metricName, targetValue }) => {
    const { data, isLoading, error, refetch } = useMarketTrades(marketId);

    // Generate chart path from price history
    const { yesPath, noPath, yesAreaPath, noAreaPath } = useMemo(() => {
        if (!data?.priceHistory || data.priceHistory.length === 0) {
            // Default to 50/50 line if no data
            return {
                yesPath: 'M0,150 L800,150',
                noPath: 'M0,150 L800,150',
                yesAreaPath: 'M0,150 L800,150 V300 H0 Z',
                noAreaPath: 'M0,150 L800,150 V300 H0 Z',
            };
        }

        const points = data.priceHistory;
        const width = 800;
        const height = 300;
        const padding = 10;

        // Map prices to Y coordinates (0% at bottom, 100% at top)
        const getY = (price: number) => height - padding - ((price / 100) * (height - padding * 2));
        const getX = (index: number) => (index / (points.length - 1 || 1)) * width;

        // Build YES path
        let yesPathStr = `M${getX(0)},${getY(points[0].yesPrice)}`;
        let noPathStr = `M${getX(0)},${getY(points[0].noPrice)}`;

        for (let i = 1; i < points.length; i++) {
            yesPathStr += ` L${getX(i)},${getY(points[i].yesPrice)}`;
            noPathStr += ` L${getX(i)},${getY(points[i].noPrice)}`;
        }

        // Area paths (fill to bottom)
        const yesArea = yesPathStr + ` L${getX(points.length - 1)},${height} L0,${height} Z`;
        const noArea = noPathStr + ` L${getX(points.length - 1)},${height} L0,${height} Z`;

        return {
            yesPath: yesPathStr,
            noPath: noPathStr,
            yesAreaPath: yesArea,
            noAreaPath: noArea,
        };
    }, [data]);

    const currentYesPrice = data?.currentYesPrice ?? 50;
    const currentNoPrice = data?.currentNoPrice ?? 50;

    // Determine trend
    const priceChange = data?.priceHistory && data.priceHistory.length >= 2
        ? data.priceHistory[data.priceHistory.length - 1].yesPrice - data.priceHistory[0].yesPrice
        : 0;

    return (
        <div className="bg-black border-4 border-black p-1 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
            <div className="bg-gray-900 border-2 border-gray-700 p-4 h-[350px] md:h-[420px] relative overflow-hidden">

                {/* Chart Header with Market Info */}
                <div className="absolute top-4 left-4 z-10">
                    <div className="font-mono text-gray-400 text-xs uppercase mb-1">Predicting</div>
                    <div className="font-display text-xl md:text-2xl text-white uppercase">
                        Will it hit {targetValue} {metricName}?
                    </div>
                </div>

                {/* Price Change Badge */}
                <div className={`absolute top-4 right-4 z-10 ${priceChange >= 0 ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'} border px-3 py-1 rounded`}>
                    <div className={`font-mono text-sm font-bold flex items-center gap-2 ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {priceChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {priceChange >= 0 ? '+' : ''}{priceChange}% (24H)
                    </div>
                </div>

                {/* Legend */}
                <div className="absolute top-16 left-4 z-10 flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="font-mono text-xs text-white">YES {currentYesPrice}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="font-mono text-xs text-white">NO {currentNoPrice}%</span>
                    </div>
                </div>

                {/* PredBlink Logo Watermark */}
                <div className="absolute top-4 right-28 z-0 opacity-50">
                    <img
                        src="/square-image.png"
                        alt="PredBlink"
                        className="w-14 h-14 object-contain"
                    />
                </div>

                {/* Chart SVG */}
                <div className="absolute inset-0 pt-24 pb-8 px-4">
                    {isLoading && !data ? (
                        <div className="flex items-center justify-center h-full">
                            <RefreshCw className="animate-spin text-gray-500" size={32} />
                        </div>
                    ) : (
                        <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
                            {/* Gradients */}
                            <defs>
                                <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="noGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                                </linearGradient>
                            </defs>

                            {/* Grid Lines */}
                            <line x1="0" y1="60" x2="800" y2="60" stroke="#333" strokeWidth="1" strokeDasharray="4 4" />
                            <line x1="0" y1="150" x2="800" y2="150" stroke="#444" strokeWidth="1" />
                            <line x1="0" y1="240" x2="800" y2="240" stroke="#333" strokeWidth="1" strokeDasharray="4 4" />

                            {/* Y-axis labels */}
                            <text x="10" y="65" fill="#666" fontSize="12" fontFamily="monospace">75%</text>
                            <text x="10" y="155" fill="#666" fontSize="12" fontFamily="monospace">50%</text>
                            <text x="10" y="245" fill="#666" fontSize="12" fontFamily="monospace">25%</text>

                            {/* NO Area (behind) */}
                            <path d={noAreaPath} fill="url(#noGradient)" />

                            {/* YES Area (in front) */}
                            <path d={yesAreaPath} fill="url(#yesGradient)" />

                            {/* NO Line */}
                            <path
                                d={noPath}
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                            />

                            {/* YES Line */}
                            <path
                                d={yesPath}
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="3"
                                vectorEffect="non-scaling-stroke"
                            />

                            {/* Live dots at end */}
                            {data?.priceHistory && data.priceHistory.length > 0 && (
                                <>
                                    <circle
                                        cx="800"
                                        cy={300 - 10 - ((currentYesPrice / 100) * 280)}
                                        r="5"
                                        fill="#22c55e"
                                        className="animate-pulse"
                                    />
                                    <circle
                                        cx="800"
                                        cy={300 - 10 - ((currentNoPrice / 100) * 280)}
                                        r="4"
                                        fill="#ef4444"
                                        className="animate-pulse"
                                    />
                                </>
                            )}
                        </svg>
                    )}
                </div>

                {/* Time Labels */}
                <div className="absolute bottom-2 left-4 right-4 flex justify-between font-mono text-[10px] text-gray-500">
                    <span>START</span>
                    <span>•</span>
                    <span>•</span>
                    <span>•</span>
                    <span>NOW</span>
                </div>

                {/* Live Feed Indicator */}
                <div className="absolute bottom-2 right-4 flex items-center gap-1 text-[10px] font-mono text-banger-yellow animate-pulse">
                    <div className="w-1.5 h-1.5 bg-banger-yellow rounded-full"></div> LIVE FEED
                </div>
            </div>
        </div>
    );
};
