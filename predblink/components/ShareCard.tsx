
import React from 'react';
import { BrutalistButton } from './BrutalistButton';
import { Twitter, Link, Share2 } from 'lucide-react';

export const ShareCard: React.FC = () => {
    return (
        <div className="bg-white dark:bg-zinc-900 border-4 border-black dark:border-white shadow-hard dark:shadow-hard-white p-6">
            <div className="flex items-center gap-2 mb-4 border-b-4 border-black dark:border-white pb-3">
                <Share2 size={20} className="stroke-[3px]" />
                <h3 className="font-display text-xl uppercase leading-none">SPREAD THE HYPE</h3>
            </div>

            <div className="flex gap-4">
                <BrutalistButton
                    className="flex-1 flex items-center justify-center gap-2 bg-[#1DA1F2] hover:bg-[#1a91da] text-white border-2 border-black"
                    onClick={() => window.open('https://twitter.com/intent/tweet?text=Betting%20on%20this%20banger%20at%20PredBlink.PH', '_blank')}
                >
                    <Twitter size={18} fill="currentColor" /> TWEET
                </BrutalistButton>

                <BrutalistButton
                    className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-black border-2 border-black"
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(window.location.href)}
                >
                    <Link size={18} /> LINK
                </BrutalistButton>
            </div>
        </div>
    );
};
