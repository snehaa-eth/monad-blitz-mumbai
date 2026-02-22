import React from 'react';
import { ArrowUpRight, ArrowDownRight, User } from 'lucide-react';

interface Activity {
    id: string;
    user: string;
    type: 'BUY' | 'SELL';
    position: 'YES' | 'NO';
    amount: number;
    time: string;
}

const MOCK_ACTIVITY: Activity[] = [
    { id: '1', user: '0x12...34', type: 'BUY', position: 'YES', amount: 50, time: '2m ago' },
    { id: '2', user: '0x88...aa', type: 'BUY', position: 'NO', amount: 120, time: '5m ago' },
    { id: '3', user: '0xab...cd', type: 'SELL', position: 'YES', amount: 200, time: '12m ago' },
    { id: '4', user: '0x55...11', type: 'BUY', position: 'YES', amount: 10, time: '15m ago' },
    { id: '5', user: '0x99...22', type: 'BUY', position: 'NO', amount: 500, time: '32m ago' },
];

export const LiveActivityFeed: React.FC = () => {
    return (
        <div className="bg-white dark:bg-zinc-900 border-4 border-black dark:border-white shadow-hard dark:shadow-hard-white p-4">
            <div className="flex justify-between items-center mb-4 border-b-2 border-black dark:border-white pb-2">
                <h3 className="font-display text-xl uppercase">Live Activity</h3>
                <div className="animate-pulse w-2 h-2 rounded-full bg-green-500"></div>
            </div>

            <div className="space-y-3">
                {MOCK_ACTIVITY.map((activity) => (
                    <div key={activity.id} className="flex justify-between items-center text-sm font-mono border-b border-gray-200 dark:border-zinc-800 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                            <div className="bg-gray-200 dark:bg-zinc-800 p-1 rounded-sm">
                                <User size={12} />
                            </div>
                            <span className="text-gray-500">{activity.user}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className={`font-bold ${activity.type === 'BUY' ? 'text-green-600' : 'text-red-500'}`}>
                                {activity.type}
                            </span>
                            <span className={`px-1 font-bold ${activity.position === 'YES' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {activity.position}
                            </span>
                            <span>{activity.amount} shares</span>
                            <span className="text-xs text-gray-400">{activity.time}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
