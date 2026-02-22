import React, { useState } from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { Flame, LogOut, RefreshCw, Plus, Coins } from 'lucide-react';
import { useDegenMode } from './contexts/DegenContext';
import { useWallet } from './lib/useWallet';
import { useMarkets } from './lib/contracts/useMarkets';
import { useMintUsdc } from './lib/contracts/hooks';
import { OnChainMarket, MarketType, MarketStatus } from './types';
import { MarketCard } from './components/MarketCard';
import { CreateMarketModal } from './components/CreateMarketModal';
import { BrutalistButton } from './components/BrutalistButton';
import { TestnetBanner } from './components/TestnetBanner';
import MarketPage from './pages/MarketPage';

type CategoryFilter = 'ALL' | 'PRICE' | 'TWITTER' | 'BLOCK';
const CATEGORY_FILTERS: CategoryFilter[] = ['ALL', 'PRICE', 'TWITTER', 'BLOCK'];

// ── Wallet controls (shared) ──────────────────────────────────────────────────

function WalletControls() {
    const { isConnected, shortAddress, connect, disconnect } = useWallet();
    const { mint, isPending: isMinting } = useMintUsdc();
    const [mintMsg, setMintMsg] = useState<string | null>(null);

    const handleMint = async () => {
        try {
            setMintMsg(null);
            await mint('1000');
            setMintMsg('Minted 1,000 USDC!');
            setTimeout(() => setMintMsg(null), 3000);
        } catch {
            setMintMsg('Mint failed');
            setTimeout(() => setMintMsg(null), 3000);
        }
    };

    return (
        <div className="flex gap-2 md:gap-3 items-center">
            {isConnected && (
                <div className="relative">
                    <BrutalistButton size="sm" variant="outline" onClick={handleMint} disabled={isMinting}>
                        <Coins size={12} /> {isMinting ? 'MINTING...' : 'GET USDC'}
                    </BrutalistButton>
                    {mintMsg && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] px-3 py-1.5 rounded-lg bg-nitro-purple text-white z-50">
                            {mintMsg}
                        </div>
                    )}
                </div>
            )}
            {isConnected ? (
                <BrutalistButton size="sm" variant="outline" onClick={disconnect}>
                    <LogOut size={12} /> {shortAddress}
                </BrutalistButton>
            ) : (
                <BrutalistButton size="sm" variant="secondary" onClick={connect}>
                    CONNECT WALLET
                </BrutalistButton>
            )}
        </div>
    );
}

// ── Home page ─────────────────────────────────────────────────────────────────

function HomePage() {
    const { degenMode, toggleDegenMode } = useDegenMode();
    const { markets, count, isLoading, refetch } = useMarkets();
    const [, setLocation] = useLocation();
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');
    const [showCreate, setShowCreate] = useState(false);

    const filteredMarkets = markets.filter((m) => {
        if (activeCategory === 'ALL') return true;
        if (activeCategory === 'PRICE') return m.marketType === MarketType.PRICE;
        if (activeCategory === 'TWITTER') return m.marketType === MarketType.TWITTER;
        if (activeCategory === 'BLOCK') return m.marketType === MarketType.BLOCK_DATA;
        return true;
    });

    const activeMarkets = filteredMarkets.filter(m => m.status === MarketStatus.ACTIVE);
    const resolvedMarkets = filteredMarkets.filter(m => m.status !== MarketStatus.ACTIVE);

    const totalVolume = markets.reduce((sum, m) => sum + Number(m.totalVolume) / 1e6, 0);
    const avgYes = markets.length > 0
        ? Math.round(markets.reduce((s, m) => s + m.yesPriceCents, 0) / markets.length)
        : 50;

    const handleTrade = (market: OnChainMarket) => setLocation(`/market/${market.id}`);

    return (
        <div className={`min-h-screen transition-all duration-500 selection:bg-nitro-purple selection:text-white pb-20 relative ${degenMode ? 'degen-mode' : ''}`}>
            <div className="scanline"></div>
            <div className="degen-bg-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
                <div className="shape shape-4"></div>
            </div>

            {/* Top banner */}
            <div className="font-mono uppercase text-[10px] py-2 border-b border-[#1a1a1f] overflow-hidden relative z-50 bg-[#0c0c0f] text-nitro-muted tracking-[0.25em]">
                <div className="marquee-container">
                    <div className="marquee-content font-bold">
                        {degenMode
                            ? '◆ DEGEN MODE ACTIVE ◆ MONAD TESTNET ◆ HIGH-FREQUENCY PREDICTIONS ◆'
                            : `◆ PREDBLINK ◆ MONAD TESTNET ◆ ${count} MARKETS LIVE ◆ $${totalVolume.toFixed(0)} VOLUME ◆ CONNECT WALLET TO TRADE ◆ DEGEN MODE ACTIVE ◆ MONAD TESTNET ◆ HIGH-FREQUENCY PREDICTIONS ◆  DEGEN MODE ACTIVE ◆ MONAD TESTNET ◆ HIGH-FREQUENCY PREDICTIONS  ◆ DEGEN MODE ACTIVE ◆ MONAD TESTNET ◆ HIGH-FREQUENCY PREDICTIONS ◆`}
                    </div>
                </div>
            </div>

            <TestnetBanner />

            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-[#1a1a1f] px-4 py-3 md:px-8 flex justify-between items-center h-[60px] md:h-[70px] transition-all duration-300 glass">
                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveCategory('ALL')}>
                    <div className="font-mono text-xl md:text-2xl tracking-tight font-bold flex items-center text-white">
                        <span>Pred</span>
                        <span
                            onClick={(e) => { e.stopPropagation(); toggleDegenMode(); }}
                            className="cursor-pointer text-nitro-purple"
                        >Blink</span>
                    </div>
                </div>

                <div className="flex gap-2 md:gap-3 items-center relative">
                    <BrutalistButton size="sm" variant="outline" onClick={() => setShowCreate(true)}>
                        <Plus size={12} /> CREATE
                    </BrutalistButton>
                    <BrutalistButton size="sm" variant="outline" onClick={refetch}>
                        <RefreshCw size={12} /> REFRESH
                    </BrutalistButton>
                    <WalletControls />
                </div>
            </header>

            {/* Hero section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 border-b border-[#1a1a1f] relative z-10">
                <div className="lg:col-span-7 p-8 md:p-14 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-[#1a1a1f] relative overflow-hidden">
                    <div className="ambient-shape w-[350px] h-[350px] bg-nitro-purple/15 -top-24 -left-24" style={{ position: 'absolute' }}></div>
                    <div className="relative z-10 space-y-7">
                        <div className="inline-block font-mono text-[10px] px-4 py-1.5 rounded-full uppercase font-bold tracking-[0.2em] border border-nitro-purple/40 text-nitro-purple">
                            PREDICTION MARKETS ON MONAD
                        </div>
                        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight font-bold text-white">
                            Bet on<br />
                            <span className="text-nitro-purple">Everything.</span>
                        </h1>
                        <p className="font-mono text-sm max-w-lg text-nitro-muted leading-relaxed">
                            Price feeds, tweet virality, and on-chain gas data — all settled by oracle-powered AMM markets on Monad Testnet.
                        </p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <BrutalistButton size="md" className="flex items-center gap-2" onClick={() => setShowCreate(true)}>
                                CREATE MARKET <Plus size={16} />
                            </BrutalistButton>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5 bg-[#0c0c0f] p-8 flex flex-col justify-center">
                    <div className="space-y-5">
                        <div className="font-mono text-[10px] tracking-[0.25em] uppercase flex items-center gap-2 text-nitro-muted font-bold">
                            <Flame size={14} className="text-nitro-purple" /> LIVE STATS
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { label: 'Avg. YES price', value: `${avgYes}¢` },
                                { label: 'Total volume', value: `$${totalVolume.toFixed(0)}` },
                                { label: 'Markets live', value: String(count) },
                            ].map((stat) => (
                                <div key={stat.label} className="bg-[#111114] border border-[#2a2a30] rounded-lg px-4 py-5 flex flex-col gap-1.5">
                                    <span className="text-[10px] uppercase tracking-[0.15em] text-nitro-muted font-mono font-bold">{stat.label}</span>
                                    <span className="font-display text-2xl font-bold text-white">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[9px] uppercase tracking-[0.3em] text-nitro-muted/40 font-mono">
                            DATA FROM ON-CHAIN • MONAD TESTNET
                        </p>
                    </div>
                </div>
            </section>

            {/* Category filters */}
            <div className="sticky top-[60px] md:top-[70px] z-40 border-b border-[#1a1a1f] bg-[#09090b]/90 backdrop-blur-md">
                <div className="flex gap-2 p-3 max-w-7xl mx-auto overflow-x-auto no-scrollbar relative z-10">
                    {CATEGORY_FILTERS.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`font-mono font-bold text-[10px] px-5 py-2 rounded-full transition-all uppercase tracking-[0.15em] ${
                                activeCategory === cat
                                    ? 'bg-nitro-purple text-white'
                                    : 'bg-transparent text-nitro-muted border border-[#2a2a30] hover:border-nitro-purple/40 hover:text-white'
                            }`}
                        >
                            {cat === 'BLOCK' ? 'BLOCK DATA' : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Markets grid */}
            <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="font-display text-2xl font-bold text-white flex items-center gap-3">
                        <Flame size={22} className="text-nitro-purple" />
                        Active Markets
                        {isLoading && <span className="text-nitro-muted text-sm font-mono animate-pulse">loading...</span>}
                    </h2>
                </div>

                {activeMarkets.length > 0 ? (
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {activeMarkets.map((market) => (
                            <MarketCard key={market.id} market={market} onTrade={handleTrade} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-[#111114] border border-[#2a2a30] rounded-xl p-8 text-center">
                        {isLoading ? (
                            <p className="font-display text-lg text-nitro-muted">Loading markets from chain...</p>
                        ) : (
                            <>
                                <p className="font-display text-lg text-nitro-muted mb-2">No active markets yet.</p>
                                <p className="font-mono text-[10px] text-nitro-muted/50 tracking-widest uppercase mb-4">Be the first to create one</p>
                                <BrutalistButton onClick={() => setShowCreate(true)}>
                                    <Plus size={14} /> CREATE MARKET
                                </BrutalistButton>
                            </>
                        )}
                    </div>
                )}

                {resolvedMarkets.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="font-display text-xl font-bold text-nitro-muted flex items-center gap-3">
                            Resolved Markets
                        </h2>
                        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                            {resolvedMarkets.map((market) => (
                                <MarketCard key={market.id} market={market} onTrade={handleTrade} />
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <CreateMarketModal isOpen={showCreate} onClose={() => { setShowCreate(false); refetch(); }} />
        </div>
    );
}

// ── Market detail page wrapper ────────────────────────────────────────────────

function MarketPageWrapper({ params }: { params: { id: string } }) {
    const [, setLocation] = useLocation();
    const { degenMode, toggleDegenMode } = useDegenMode();

    return (
        <div className={`min-h-screen transition-all duration-500 selection:bg-nitro-purple selection:text-white relative ${degenMode ? 'degen-mode' : ''}`}>
            <div className="scanline" />
            <header className="sticky top-0 z-50 border-b border-[#1a1a1f] px-4 py-3 md:px-8 flex justify-between items-center h-[60px] md:h-[70px] glass">
                <div
                    className="font-mono text-xl md:text-2xl tracking-tight font-bold flex items-center text-white cursor-pointer"
                    onClick={() => setLocation('/')}
                >
                    <span>Pred</span>
                    <span
                        onClick={(e) => { e.stopPropagation(); toggleDegenMode(); }}
                        className="cursor-pointer text-nitro-purple"
                    >Blink</span>
                </div>
                <WalletControls />
            </header>
            <MarketPage params={params} />
        </div>
    );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
    return (
        <Switch>
            <Route path="/market/:id" component={MarketPageWrapper} />
            <Route component={HomePage} />
        </Switch>
    );
}
