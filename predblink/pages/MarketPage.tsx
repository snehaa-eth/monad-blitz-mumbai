import React from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useMarket } from '../lib/contracts/useMarkets';
import { MarketDetailPage } from '../components/MarketDetailPage';

interface Props {
    params: { id: string };
}

export default function MarketPage({ params }: Props) {
    const [, setLocation] = useLocation();
    const id = parseInt(params.id, 10);
    const { market, isLoading } = useMarket(isNaN(id) ? undefined : id);

    if (isNaN(id)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="font-mono text-nitro-muted">Invalid market ID</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-nitro-purple" />
            </div>
        );
    }

    if (!market) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="font-mono text-nitro-muted">Market #{id} not found</p>
            </div>
        );
    }

    return (
        <MarketDetailPage
            market={market}
            onBack={() => setLocation('/')}
        />
    );
}
