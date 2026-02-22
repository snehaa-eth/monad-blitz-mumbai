import React from 'react';
import { Share2, Twitter } from 'lucide-react';

interface SpreadTheHypeProps {
    marketId: string;
    marketQuestion: string;
}

export const SpreadTheHype: React.FC<SpreadTheHypeProps> = ({ marketId, marketQuestion }) => {
    const handleShare = () => {
        const text = `Will it hit? ${marketQuestion}\n\nBet now on PredBlink:`;
        const url = `https://PredBlink.fun/market/${marketId}`; // Mock URL
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank');
    };

    return (
        <div className="bg-[#1DA1F2] border-4 border-black dark:border-white shadow-hard dark:shadow-hard-white p-4 relative overflow-hidden group cursor-pointer hover:bg-[#1a91da] transition-colors" onClick={handleShare}>
            {/* Halftone pattern overlay */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:4px_4px]"></div>

            <div className="relative z-10 flex items-center justify-between">
                <div className="flex flex-col">
                    <div className="bg-black text-white text-xs font-mono inline-block px-1 mb-1 transform -rotate-1 w-max">SPREAD THE HYPE</div>
                    <div className="font-display text-4xl text-white uppercase leading-none drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                        Share This
                    </div>
                </div>
                <div className="bg-white border-2 border-black p-3 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform group-hover:rotate-12 transition-transform">
                    <Twitter size={32} className="text-[#1DA1F2]" fill="currentColor" />
                </div>
            </div>
        </div>
    );
};
