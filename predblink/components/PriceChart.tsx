
import React from 'react';
import { MetricType } from '../types';

interface PriceChartProps {
    data?: { time: string; value: number }[];
    color: string; // e.g., 'text-green-500' or hex
    label?: string;
    isPositive?: boolean;
}

export const PriceChart: React.FC<PriceChartProps> = ({
    data = [],
    color = 'text-green-500',
    label = 'PROBABILITY OVER TIME',
    isPositive = true
}) => {
    // Mock data generator if none provided
    const chartData = data.length > 0 ? data : Array.from({ length: 24 }, (_, i) => ({
        time: `${i}h`,
        value: 50 + Math.sin(i / 3) * 20 + (Math.random() * 10 - 5)
    }));

    // Simple SVG path generation
    const width = 100; // viewBox width
    const height = 40; // viewBox height
    const max = Math.max(...chartData.map(d => d.value)) * 1.1;
    const min = Math.min(...chartData.map(d => d.value)) * 0.9;
    const range = max - min;

    const points = chartData.map((d, i) => {
        const x = (i / (chartData.length - 1)) * width;
        const y = height - ((d.value - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const areaPath = `${points} L ${width},${height} L 0,${height} Z`;

    // Determine colors based on isPositive
    const strokeColor = isPositive ? '#22c55e' : '#ef4444'; // green-500 : red-500
    const fillColor = isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';

    return (
        <div className="bg-white dark:bg-zinc-900 border-4 border-black dark:border-white shadow-hard dark:shadow-hard-white p-4 relative overflow-hidden group">
            {/* Header */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <div className="font-mono text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {label}
                    </div>
                    <div className={`font-display text-4xl leading-none ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                        {isPositive ? 'YES' : 'NO'} <span className="text-2xl text-black dark:text-white ml-2">72¢</span>
                    </div>
                    <div className={`font-mono text-xs font-bold ${isPositive ? 'text-green-600' : 'text-red-500'} flex items-center gap-1 mt-1`}>
                        {isPositive ? '▲' : '▼'} {isPositive ? '+12.4%' : '-5.2%'} (24H)
                    </div>
                </div>
                <div className="bg-black dark:bg-white text-white dark:text-black font-mono text-[10px] px-2 py-0.5 font-bold uppercase">
                    LIVE FEED
                </div>
            </div>

            {/* Chart Container */}
            <div className="relative h-48 w-full">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between text-[10px] font-mono text-gray-300 pointer-events-none">
                    <div className="border-b border-dashed border-gray-200 w-full"></div>
                    <div className="border-b border-dashed border-gray-200 w-full"></div>
                    <div className="border-b border-dashed border-gray-200 w-full"></div>
                    <div className="border-b border-dashed border-gray-200 w-full"></div>
                </div>

                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full preserve-3d" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                        </linearGradient>
                    </defs>
                    <path d={areaPath} fill="url(#chartGradient)" stroke="none" />
                    <path d={points} fill="none" stroke={strokeColor} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Interactive Dot (Simulation) */}
                <div className="absolute top-0 right-0 h-full w-[2px] bg-black/10 dark:bg-white/10 pointer-events-none"></div>
                <div className={`absolute right-0 w-3 h-3 rounded-full border-2 border-white shadow-sm ${isPositive ? 'bg-green-500' : 'bg-red-500'}`} style={{ top: '20%' }}>
                    <div className={`absolute inset-0 rounded-full animate-ping ${isPositive ? 'bg-green-500' : 'bg-red-500'} opacity-50`}></div>
                </div>
            </div>

            {/* Time Axis */}
            <div className="flex justify-between font-mono text-[10px] text-gray-400 mt-2 uppercase">
                <span>24H Ago</span>
                <span>12H Ago</span>
                <span>Now</span>
            </div>
        </div>
    );
};
