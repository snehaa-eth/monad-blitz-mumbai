import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { monadTestnet } from '@reown/appkit/networks';
import { useWallet } from '../lib/useWallet';

export const TestnetBanner: React.FC = () => {
    const { isConnected, isWrongChain, switchToCorrectChain, chainId } = useWallet();

    if (!isConnected) return null;

    if (isWrongChain) {
        return (
            <div className="bg-nitro-red/15 border-b border-nitro-red/30 px-4 py-2 flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-nitro-red" />
                    <span className="font-mono text-sm font-semibold text-nitro-red">
                        Wrong Network — Switch to Monad Testnet
                    </span>
                </div>
                <button
                    onClick={switchToCorrectChain}
                    className="flex items-center gap-2 px-3 py-1 font-mono text-sm font-semibold rounded-lg bg-nitro-red/20 text-nitro-red border border-nitro-red/30 hover:bg-nitro-red/30 transition-colors"
                >
                    <RefreshCw size={14} />
                    SWITCH
                </button>
            </div>
        );
    }

    if (chainId !== monadTestnet.id) return null;

    return (
        // <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-center gap-2">
        //     <AlertTriangle size={14} className="text-amber-400" />
        //     <span className="font-mono text-xs font-semibold text-amber-400">
        //         TESTNET — Monad Testnet (Chain ID: {monadTestnet.id})
        //     </span>
        // </div>
        <></>
    );
};
