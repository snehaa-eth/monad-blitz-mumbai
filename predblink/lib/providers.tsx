import React from 'react';
import { AppKitProvider, createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiAdapter, wagmiConfig, networks, projectId } from './wagmi';
import { DegenProvider } from '../contexts/DegenContext';

const queryClient = new QueryClient();
const appKitInstance = createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata: {
        name: 'Predblink',
        description: 'Prediction market UI running on Monad Testnet'
    }
});

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <AppKitProvider instance={appKitInstance}>
            <WagmiProvider config={wagmiConfig}>
                <QueryClientProvider client={queryClient}>
                    <DegenProvider>
                        {children}
                    </DegenProvider>
                </QueryClientProvider>
            </WagmiProvider>
        </AppKitProvider>
    );
}
