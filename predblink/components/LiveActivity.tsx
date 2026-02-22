
import React from 'react';

// Mock data generator for live activity
const MOCK_ACTIVITY = [
    { id: 1, user: 'anon378', action: 'bought', side: 'NO', amount: 93, time: '2s ago' },
    { id: 2, user: 'anon382', action: 'bought', side: 'NO', amount: 216, time: '5s ago' },
    { id: 3, user: 'anon473', action: 'bought', side: 'YES', amount: 77, time: '12s ago' },
    { id: 4, user: 'anon508', action: 'bought', side: 'YES', amount: 438, time: '30s ago' },
    { id: 5, user: 'vitalik.eth', action: 'bought', side: 'YES', amount: 1000, time: '1m ago' },
];

export const LiveActivity: React.FC = () => {
    return (
        <div className="bg-white dark:bg-zinc-900 border-4 border-black dark:border-white shadow-hard dark:shadow-hard-white p-6">
            <div className="flex items-center justify-between mb-4 border-b-2 border-dashed border-gray-300 dark:border-zinc-700 pb-2">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">LIVE ACTIVITY</h3>
                </div>
            </div>

            <div className="space-y-3">
                {MOCK_ACTIVITY.map((activity) => (
                    <div key={activity.id} className="flex justify-between items-center font-mono text-xs border-b border-gray-100 dark:border-zinc-800 last:border-0 pb-2 last:pb-0">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-800 border-2 border-white dark:border-black"></div>
                            <span className="font-bold text-gray-600 dark:text-gray-300">{activity.user}</span>
                            <span className="text-gray-400">bought</span>
                            <span className={`font-bold ${activity.side === 'YES' ? 'text-green-600' : 'text-red-500'}`}>
                                {activity.side}
                            </span>
                        </div>
                        <div className="font-bold dark:text-white">
                            ${activity.amount}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
