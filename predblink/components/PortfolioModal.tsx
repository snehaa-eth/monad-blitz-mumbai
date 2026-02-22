import React, { useState } from 'react';
import { useAccount, useReadContract, useBalance } from 'wagmi';
import { MOCK_USDC_ABI, MARKET_FACTORY_ABI, SHARE_TOKEN_ABI } from '../lib/contracts/abis';
import { CONTRACTS } from '../lib/contracts/addresses';
import { formatUnits } from 'viem';
import { X, TrendingUp, TrendingDown, Wallet, Coins, Activity, Copy, Check, ExternalLink } from 'lucide-react';

interface PortfolioModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ isOpen, onClose }) => {
    const { address } = useAccount();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'history'>('overview');

    // Get BNB balance
    const { data: bnbBalance } = useBalance({
        address: address,
    });

    // Get USDC balance
    const { data: usdcBalance } = useReadContract({
        address: CONTRACTS.bscTestnet.mockUSDC as `0x${string}`,
        abi: MOCK_USDC_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address }
    });

    // Get market count to iterate
    const { data: marketCount } = useReadContract({
        address: CONTRACTS.bscTestnet.marketFactory as `0x${string}`,
        abi: MARKET_FACTORY_ABI,
        functionName: 'nextMarketId',
        query: { enabled: !!address }
    });

    const formattedUSDC = usdcBalance
        ? parseFloat(formatUnits(usdcBalance as bigint, 6)).toFixed(2)
        : '0.00';

    const formattedBNB = bnbBalance
        ? parseFloat(formatUnits(bnbBalance.value, 18)).toFixed(4)
        : '0.0000';

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-banger-yellow border-b-4 border-black p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                            <Wallet className="text-banger-yellow" size={24} />
                        </div>
                        <div>
                            <h2 className="font-display text-2xl">MY PORTFOLIO</h2>
                            <button
                                onClick={copyAddress}
                                className="flex items-center gap-1 text-sm font-mono hover:underline"
                            >
                                {shortAddress}
                                {copied ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-black/10 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Balance Cards */}
                <div className="p-4 grid grid-cols-2 gap-3 border-b-4 border-black">
                    <div className="bg-gradient-to-br from-green-400 to-green-500 border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-2 text-black/70 text-sm font-mono mb-1">
                            <Coins size={14} />
                            USDC BALANCE
                        </div>
                        <div className="font-display text-2xl text-black">
                            ${formattedUSDC}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-400 to-orange-400 border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-2 text-black/70 text-sm font-mono mb-1">
                            <Activity size={14} />
                            BNB (GAS)
                        </div>
                        <div className="font-display text-2xl text-black">
                            {formattedBNB}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b-4 border-black">
                    {(['overview', 'positions', 'history'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                flex-1 py-3 font-mono text-sm font-bold uppercase
                transition-colors border-r-2 border-black last:border-r-0
                ${activeTab === tab
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black hover:bg-gray-100'
                                }
              `}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-100 border-2 border-black p-3">
                                    <div className="text-xs font-mono text-gray-500">Total Value</div>
                                    <div className="font-display text-xl">${formattedUSDC}</div>
                                </div>
                                <div className="bg-gray-100 border-2 border-black p-3">
                                    <div className="text-xs font-mono text-gray-500">Active Markets</div>
                                    <div className="font-display text-xl">{Number(marketCount || 0)}</div>
                                </div>
                                <div className="bg-gray-100 border-2 border-black p-3">
                                    <div className="text-xs font-mono text-gray-500 flex items-center gap-1">
                                        <TrendingUp size={12} className="text-green-500" />
                                        Total P&L
                                    </div>
                                    <div className="font-display text-xl text-green-600">$0.00</div>
                                </div>
                                <div className="bg-gray-100 border-2 border-black p-3">
                                    <div className="text-xs font-mono text-gray-500">Open Positions</div>
                                    <div className="font-display text-xl">0</div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="space-y-2">
                                <h3 className="font-mono text-sm font-bold text-gray-500">QUICK ACTIONS</h3>
                                <a
                                    href={`https://testnet.bscscan.com/address/${address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3 bg-white border-2 border-black hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-mono text-sm">View on BSCScan</span>
                                    <ExternalLink size={16} />
                                </a>
                                <a
                                    href="https://testnet.bnbchain.org/faucet-smart"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3 bg-white border-2 border-black hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-mono text-sm">Get Testnet BNB</span>
                                    <ExternalLink size={16} />
                                </a>
                            </div>
                        </div>
                    )}

                    {activeTab === 'positions' && (
                        <div className="text-center py-8 text-gray-500">
                            <Activity className="mx-auto mb-3" size={48} strokeWidth={1} />
                            <p className="font-mono text-sm">No active positions yet</p>
                            <p className="text-xs mt-1">Create or trade on a market to see positions here</p>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="text-center py-8 text-gray-500">
                            <Activity className="mx-auto mb-3" size={48} strokeWidth={1} />
                            <p className="font-mono text-sm">No transaction history</p>
                            <p className="text-xs mt-1">Your trades will appear here</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t-4 border-black p-3 bg-gray-50 text-center">
                    <p className="font-mono text-xs text-gray-500">
                        Connected to BSC Testnet • Chain ID: 97
                    </p>
                </div>
            </div>
        </div>
    );
};
