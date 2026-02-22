import { useAppKit, useAppKitAccount, useAppKitNetwork, useDisconnect } from '@reown/appkit/react';
import { monadTestnet } from '@reown/appkit/networks';
import { useSwitchChain } from 'wagmi';
import { useEffect, useMemo, useState } from 'react';

const TARGET_CHAIN_ID = monadTestnet.id;

export function useWallet() {
    const { address, isConnected: kitConnected, status, embeddedWalletInfo } = useAppKitAccount();
    const { chainId } = useAppKitNetwork();
    const { open } = useAppKit();
    const { disconnect } = useDisconnect();
    const { switchChain, isPending: isSwitching } = useSwitchChain();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!kitConnected || !switchChain || typeof chainId === 'undefined' || isSwitching) {
            return;
        }
        if (chainId !== TARGET_CHAIN_ID) {
            switchChain({ chainId: TARGET_CHAIN_ID });
        }
    }, [chainId, kitConnected, switchChain, isSwitching]);

    const ready = mounted;
    const shortAddress = useMemo(() => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }, [address]);

    const connect = async () => {
        if (!open) return;
        await open();
    };

    const disconnectWallet = async () => {
        if (disconnect) {
            await disconnect();
        }
    };

    const switchToCorrectChain = async () => {
        if (switchChain) {
            await switchChain({ chainId: TARGET_CHAIN_ID });
        }
    };

    const isConnected = ready && kitConnected;
    const isWrongChain = Boolean(chainId && chainId !== TARGET_CHAIN_ID);

    return {
        isConnected,
        isWrongChain,
        isSwitching,
        address: isConnected ? address ?? '' : '',
        shortAddress,
        connect,
        disconnect: disconnectWallet,
        switchToCorrectChain,
        ready,
        user: embeddedWalletInfo?.user,
        status,
        chainId,
    };
}
