import { createStorage } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { monadTestnet } from '@reown/appkit/networks';

const fallbackProjectId = '6577096a73d74c214d3434d5a85174fd';
export const projectId = fallbackProjectId;

if (!projectId) {
    throw new Error('Reown project ID is not configured.');
}

export const networks = [monadTestnet];

export const wagmiAdapter = new WagmiAdapter({
    storage: createStorage({ storage: localStorage }),
    ssr: false,
    projectId,
    networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
