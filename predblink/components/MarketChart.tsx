import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip, CartesianGrid } from 'recharts';

interface MarketChartProps {
    data: Array<{ time: string; value: number }>;
    target: number;
    metricLabel: string;
    color: string;
}

export const MarketChart: React.FC<MarketChartProps> = ({ data, target, metricLabel, color }) => {
    // Determine color hex based on passed class or default
    const getColorHex = (c: string) => {
        if (c.includes('green')) return '#16a34a';
        if (c.includes('blue')) return '#2563eb';
        if (c.includes('red')) return '#dc2626';
        if (c.includes('purple')) return '#9333ea';
        return '#000000';
    };

    const lineColor = getColorHex(color);

    return (
        <div className="bg-white dark:bg-zinc-900 border-4 border-black dark:border-white shadow-hard dark:shadow-hard-white p-4 h-[300px] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b-2 border-black dark:border-white pb-2">
                <h3 className="font-display text-xl uppercase">Performance</h3>
                <div className="font-mono text-xs bg-black text-white px-2 py-1">Target: {target.toLocaleString()}</div>
            </div>

            <div className="flex-grow w-full relative">
                {/* Brutalist "Chart Loading" or just the chart */}
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                            dataKey="time"
                            tick={{ fontFamily: 'monospace', fontSize: 10 }}
                            axisLine={{ stroke: '#000', strokeWidth: 2 }}
                            tickLine={{ stroke: '#000' }}
                        />
                        <YAxis
                            tick={{ fontFamily: 'monospace', fontSize: 10 }}
                            axisLine={{ stroke: '#000', strokeWidth: 2 }}
                            tickLine={{ stroke: '#000' }}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '2px solid #000',
                                boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
                                fontFamily: 'monospace'
                            }}
                            itemStyle={{ color: '#000' }}
                        />
                        <ReferenceLine y={target} stroke="#000" strokeDasharray="5 5" strokeWidth={2} label={{ position: 'right', value: 'TARGET', fill: 'black', fontSize: 10, fontFamily: 'monospace' }} />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={lineColor}
                            strokeWidth={4}
                            dot={{ stroke: '#000', strokeWidth: 2, fill: '#fff', r: 4 }}
                            activeDot={{ stroke: '#000', strokeWidth: 2, fill: lineColor, r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
