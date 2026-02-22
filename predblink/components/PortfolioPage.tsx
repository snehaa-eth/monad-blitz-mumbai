/**
 * PortfolioPage - Full portfolio view page (not a modal)
 */

import React, { useState } from 'react';
import { useAccount, useReadContract, useBalance } from 'wagmi';
import { MOCK_USDC_ABI, SHARE_TOKEN_ABI, MARKET_FACTORY_ABI } from '../lib/contracts/abis';
import { CONTRACTS } from '../lib/contracts/addresses';
import { useMarkets } from '../lib/contracts/useMarkets';
import { useAllUserPositions, useUserTradeHistory, useUserCreatedMarkets } from '../lib/contracts/hooks';
import { formatUnits } from 'viem';
import {
    ArrowLeft, TrendingUp, TrendingDown, Wallet, Coins, Activity,
    Copy, Check, ExternalLink, Zap, Eye, RefreshCw, Clock
} from 'lucide-react';
import { BrutalistButton } from './BrutalistButton';

interface PortfolioPageProps {
    onBack: () => void;
    onNavigateToMarket: (marketId: number) => void;
}

import { useDegenMode } from '../contexts/DegenContext';
import { Sparkles, Trophy, Star, Ghost } from 'lucide-react';

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onBack, onNavigateToMarket }) => {
    const { degenMode } = useDegenMode();
    const { address } = useAccount();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'history'>('positions');
    const { markets, isLoading: isMarketsLoading, refetch } = useMarkets();

    // Get all market IDs for position lookup
    const marketIds = markets.map(m => m.id);

    // Fetch user positions across all markets
    const { positions, isLoading: isPositionsLoading, refetch: refetchPositions } = useAllUserPositions(
        marketIds,
        address as `0x${string}` | undefined
    );

    // Fetch user trade history from blockchain events
    const { trades, isLoading: isTradesLoading, refetch: refetchTrades } = useUserTradeHistory(
        address as `0x${string}` | undefined
    );

    // Fetch markets created by the user from blockchain events
    const { markets: createdMarkets, isLoading: isCreatedMarketsLoading, refetch: refetchCreatedMarkets } = useUserCreatedMarkets(
        address as `0x${string}` | undefined
    );

    // Get BNB balance
    const { data: bnbBalance } = useBalance({
        address: address,
    });

    // Get USDC balance
    const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
        address: CONTRACTS.bscTestnet.mockUSDC as `0x${string}`,
        abi: MOCK_USDC_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
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

    return (
        <div className={`min-h-screen transition-colors duration-500 ${degenMode ? 'degen-mode' : 'bg-[#f0f0f0]'}`}>
            {/* Header */}
            <div className={`border-b-4 border-black p-4 md:p-6 relative overflow-hidden transition-colors ${degenMode ? 'bg-[#ff00ff]' : 'bg-white'}`}>
                {degenMode && (
                    <>
                        <div className="absolute top-4 right-10 animate-bounce text-yellow-300 transform rotate-12 opacity-50"><Trophy size={48} /></div>
                        <div className="absolute bottom-2 left-1/4 animate-pulse text-cyan-300 transform -rotate-12 opacity-50"><Star size={32} /></div>
                        <div className="absolute top-1/2 right-1/4 opacity-30 text-purple-300"><Sparkles size={64} className="animate-pulse" /></div>
                    </>
                )}
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <BrutalistButton size="sm" variant="outline" onClick={onBack}>
                            <ArrowLeft size={16} />
                        </BrutalistButton>
                        <h1 className={`font-display text-3xl md:text-5xl tracking-tighter ${degenMode ? 'text-black drop-shadow-[4px_4px_0px_#ecfd00]' : ''}`}>
                            MY PORTFOLIO
                        </h1>
                    </div>

                    {/* Wallet Info */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className={`flex items-center gap-2 border-4 border-black px-4 py-2 shadow-hard-sm transition-colors ${degenMode ? 'bg-[#ecfd00] text-black' : 'bg-banger-yellow'}`}>
                            <Wallet size={18} strokeWidth={3} />
                            <span className="font-mono text-sm font-bold">{shortAddress}</span>
                            <button onClick={copyAddress} className="hover:scale-110 transition-transform">
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                        <a
                            href={`https://testnet.bscscan.com/address/${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1 text-sm font-mono font-bold transition-colors ${degenMode ? 'text-white hover:text-black' : 'text-gray-600 hover:text-black'}`}
                        >
                            View on BSCScan <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Balance Cards */}
            <div className="max-w-6xl mx-auto p-4 md:p-6 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className={`bg-white border-4 border-black p-4 shadow-hard transition-all ${degenMode ? 'text-black hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#ecfd00]' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                        <div className={`flex items-center gap-2 text-xs font-mono mb-2 ${degenMode ? 'text-black/60 font-bold' : 'text-gray-500'}`}>
                            <Coins size={14} />
                            USDC BALANCE
                        </div>
                        <div className={`font-display text-3xl ${degenMode ? 'text-[#00aa88] drop-shadow-[1px_1px_0px_#000]' : 'text-green-600'}`}>
                            ${formattedUSDC}
                        </div>
                    </div>

                    <div className={`bg-white border-4 border-black p-4 shadow-hard transition-all ${degenMode ? 'text-black hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#00ffff]' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                        <div className={`flex items-center gap-2 text-xs font-mono mb-2 ${degenMode ? 'text-black/60 font-bold' : 'text-gray-500'}`}>
                            <Activity size={14} />
                            BNB (GAS)
                        </div>
                        <div className={`font-display text-3xl ${degenMode ? 'text-[#ccbb00] drop-shadow-[1px_1px_0px_#000]' : 'text-yellow-600'}`}>
                            {formattedBNB}
                        </div>
                    </div>

                    <div className={`bg-white border-4 border-black p-4 shadow-hard transition-all ${degenMode ? 'text-black hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#ff00ff]' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                        <div className={`flex items-center gap-2 text-xs font-mono mb-2 ${degenMode ? 'text-black/60 font-bold' : 'text-gray-500'}`}>
                            <Zap size={14} />
                            CREATED
                        </div>
                        <div className={`font-display text-3xl ${degenMode ? 'text-black' : ''}`}>
                            {isCreatedMarketsLoading ? '...' : createdMarkets.length}
                        </div>
                    </div>

                    <div className={`bg-white border-4 border-black p-4 shadow-hard transition-all ${degenMode ? 'text-black hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#ecfd00]' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                        <div className={`flex items-center gap-2 text-xs font-mono mb-2 ${degenMode ? 'text-black/60 font-bold' : 'text-gray-500'}`}>
                            <TrendingUp size={14} className={degenMode ? 'text-black' : "text-green-500"} />
                            TOTAL P&L
                        </div>
                        <div className={`font-display text-3xl ${degenMode ? 'text-[#ff00ff] drop-shadow-[1px_1px_0px_#000]' : 'text-gray-400'}`}>
                            $0.00
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-0 border-4 border-black bg-white mb-6">
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
                <div className={`bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${degenMode ? 'text-black' : ''}`}>
                    {activeTab === 'overview' && (
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-display text-xl">MY MARKETS</h2>
                                <button
                                    onClick={() => { refetchCreatedMarkets(); refetch(); refetchBalance(); }}
                                    className="flex items-center gap-1 text-sm font-mono text-gray-500 hover:text-black"
                                >
                                    <RefreshCw size={14} />
                                    Refresh
                                </button>
                            </div>

                            {isCreatedMarketsLoading ? (
                                <div className="text-center py-12 text-gray-500">
                                    <RefreshCw className="mx-auto mb-3 animate-spin" size={32} />
                                    <p className="font-mono">Loading your markets...</p>
                                </div>
                            ) : createdMarkets.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded">
                                    <Zap className="mx-auto mb-3" size={48} strokeWidth={1} />
                                    <p className="font-mono text-sm">You haven't created any markets yet</p>
                                    <p className="text-xs mt-1">Create a market to start scouting viral content!</p>
                                </div>
                            ) : (
                                <div
                                    className="grid gap-4 max-h-[400px] overflow-y-auto pr-2"
                                    style={{
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: '#000 #f5f5f5',
                                    }}
                                >
                                    {createdMarkets.map(createdMarket => {
                                        // Find full market data
                                        const fullMarket = markets.find(m => m.id === createdMarket.marketId);
                                        const metricLabels = ['Views', 'Likes', 'Retweets', 'Comments'];

                                        return (
                                            <div
                                                key={createdMarket.marketId}
                                                onClick={() => onNavigateToMarket(createdMarket.marketId)}
                                                className="flex items-center justify-between p-4 border-2 border-black hover:bg-gray-50 cursor-pointer transition-colors"
                                            >
                                                <div>
                                                    {fullMarket && (
                                                        <div className={`font-mono text-sm ${degenMode ? 'text-black font-bold' : 'text-gray-500'}`}>@{fullMarket.authorHandle}</div>
                                                    )}
                                                    <div className="font-display text-lg">
                                                        {Number(createdMarket.targetValue).toLocaleString()} {metricLabels[createdMarket.metric]}
                                                    </div>
                                                    {createdMarket.category && (
                                                        <div className={`text-xs font-mono ${degenMode ? 'text-black' : 'text-gray-500'}`}>{createdMarket.category}</div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    {fullMarket ? (
                                                        <>
                                                            <div className="text-sm font-mono">
                                                                <span className="text-green-600">{Math.round(fullMarket.yesPrice)}¢</span>
                                                                {' / '}
                                                                <span className="text-red-600">{Math.round(fullMarket.noPrice)}¢</span>
                                                            </div>
                                                            <div className={`text-xs font-mono ${fullMarket.status === 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                                {fullMarket.status === 0 ? 'ACTIVE' : 'ENDED'}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-xs font-mono text-gray-400">Market #{createdMarket.marketId}</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'positions' && (
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-display text-xl">MY POSITIONS</h2>
                                <button
                                    onClick={() => { refetch(); refetchPositions(); }}
                                    className="flex items-center gap-1 text-sm font-mono text-gray-500 hover:text-black"
                                >
                                    <RefreshCw size={14} />
                                    Refresh
                                </button>
                            </div>

                            {isPositionsLoading || isMarketsLoading ? (
                                <div className="text-center py-12 text-gray-500">
                                    <RefreshCw className="mx-auto mb-3 animate-spin" size={32} />
                                    <p className="font-mono">Loading positions...</p>
                                </div>
                            ) : positions.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded">
                                    <Activity className="mx-auto mb-3" size={48} strokeWidth={1} />
                                    <p className="font-mono text-sm">No active positions yet</p>
                                    <p className="text-xs mt-1">Trade on a market to see your positions here</p>
                                </div>
                            ) : (
                                <div
                                    className="grid gap-4 max-h-[400px] overflow-y-auto pr-2"
                                    style={{
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: '#000 #f5f5f5',
                                    }}
                                >
                                    {positions.map(position => {
                                        const market = markets.find(m => m.id === position.marketId);
                                        if (!market) return null;

                                        const yesSharesFormatted = Number(position.yesShares) / 1e6;
                                        const noSharesFormatted = Number(position.noShares) / 1e6;
                                        const metricLabels = ['Views', 'Likes', 'Retweets', 'Comments'];

                                        return (
                                            <div
                                                key={position.marketId}
                                                onClick={() => onNavigateToMarket(position.marketId)}
                                                className="flex items-center justify-between p-4 border-2 border-black hover:bg-gray-50 cursor-pointer transition-colors"
                                            >
                                                <div className="flex-1">
                                                    <div className={`font-mono text-sm ${degenMode ? 'text-black font-bold' : 'text-gray-500'}`}>@{market.authorHandle}</div>
                                                    <div className="font-display text-lg">
                                                        {Number(market.targetValue).toLocaleString()} {metricLabels[market.metric]}
                                                    </div>
                                                    <div className={`text-xs mt-1 line-clamp-1 ${degenMode ? 'text-gray-700' : 'text-gray-500'}`}>
                                                        {market.tweetText}
                                                    </div>
                                                </div>
                                                <div className="text-right ml-4">
                                                    {yesSharesFormatted > 0 && (
                                                        <div className="flex items-center gap-2 text-green-600">
                                                            <TrendingUp size={14} />
                                                            <span className="font-mono font-bold">{yesSharesFormatted.toFixed(2)} YES</span>
                                                        </div>
                                                    )}
                                                    {noSharesFormatted > 0 && (
                                                        <div className="flex items-center gap-2 text-red-600">
                                                            <TrendingDown size={14} />
                                                            <span className="font-mono font-bold">{noSharesFormatted.toFixed(2)} NO</span>
                                                        </div>
                                                    )}
                                                    <div className={`text-xs font-mono mt-1 ${market.status === 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                        {market.status === 0 ? 'ACTIVE' : 'ENDED'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-display text-xl">TRADE HISTORY</h2>
                                <button
                                    onClick={() => refetchTrades()}
                                    className="flex items-center gap-1 text-sm font-mono text-gray-500 hover:text-black"
                                >
                                    <RefreshCw size={14} />
                                    Refresh
                                </button>
                            </div>

                            {isTradesLoading ? (
                                <div className="text-center py-12 text-gray-500">
                                    <RefreshCw className="mx-auto mb-3 animate-spin" size={32} />
                                    <p className="font-mono">Loading trade history...</p>
                                </div>
                            ) : trades.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded">
                                    <Clock className="mx-auto mb-3" size={48} strokeWidth={1} />
                                    <p className="font-mono text-sm">No transaction history</p>
                                    <p className="text-xs mt-1">Your trades will appear here</p>
                                </div>
                            ) : (
                                <div
                                    className="grid gap-3 max-h-[400px] overflow-y-auto pr-2"
                                    style={{
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: '#000 #f5f5f5',
                                    }}
                                >
                                    {trades.map((trade, index) => {
                                        const market = markets.find(m => m.id === trade.marketId);
                                        const usdcFormatted = Number(trade.usdcAmount) / 1e6;
                                        const sharesFormatted = Number(trade.sharesReceived) / 1e6;
                                        const metricLabels = ['Views', 'Likes', 'Retweets', 'Comments'];

                                        return (
                                            <div
                                                key={`${trade.transactionHash}-${index}`}
                                                className="flex items-center justify-between p-3 border-2 border-gray-200 hover:border-black transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded flex items-center justify-center ${trade.isYes ? 'bg-green-100' : 'bg-red-100'}`}>
                                                        {trade.isYes ? (
                                                            <TrendingUp size={20} className="text-green-600" />
                                                        ) : (
                                                            <TrendingDown size={20} className="text-red-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-mono text-sm font-bold">
                                                            {trade.isYes ? 'Bought YES' : 'Bought NO'}
                                                        </div>
                                                        <div className={`text-xs ${degenMode ? 'text-black' : 'text-gray-500'}`}>
                                                            {market ? (
                                                                <>{Number(market.targetValue).toLocaleString()} {metricLabels[market.metric]}</>
                                                            ) : (
                                                                <>Market #{trade.marketId}</>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono text-sm">
                                                        <span className="text-gray-500">-${usdcFormatted.toFixed(2)}</span>
                                                        <span className="mx-1">→</span>
                                                        <span className={trade.isYes ? 'text-green-600' : 'text-red-600'}>
                                                            {sharesFormatted.toFixed(2)} shares
                                                        </span>
                                                    </div>
                                                    <a
                                                        href={`https://testnet.bscscan.com/tx/${trade.transactionHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-500 hover:underline flex items-center justify-end gap-1"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        View tx <ExternalLink size={10} />
                                                    </a>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                    <a
                        href="https://testnet.bnbchain.org/faucet-smart"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2 p-4 bg-white border-4 border-black font-mono text-sm font-bold transition-colors ${degenMode ? 'text-black hover:bg-[#ecfd00]' : 'hover:bg-banger-yellow'}`}
                    >
                        Get Testnet BNB <ExternalLink size={14} />
                    </a>
                    <a
                        href={`https://testnet.bscscan.com/token/${CONTRACTS.bscTestnet.mockUSDC}?a=${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2 p-4 bg-white border-4 border-black font-mono text-sm font-bold transition-colors ${degenMode ? 'text-black hover:bg-[#ecfd00]' : 'hover:bg-banger-yellow'}`}
                    >
                        View USDC Txns <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        </div>
    );
};
