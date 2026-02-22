import deployedAddresses from '../../contracts/deployed-predblink.json';

export interface ContractAddresses {
    mockUSDC: `0x${string}`;
    shareToken: `0x${string}`;
    predBlink: `0x${string}`;
    priceOracle: `0x${string}`;
    blockOracle: `0x${string}`;
    marketResolver: `0x${string}`;
}

const monadTestnet: ContractAddresses = {
    mockUSDC: deployedAddresses.mockUSDC as `0x${string}`,
    shareToken: deployedAddresses.shareToken as `0x${string}`,
    predBlink: deployedAddresses.predBlink as `0x${string}`,
    priceOracle: deployedAddresses.priceOracle as `0x${string}`,
    blockOracle: deployedAddresses.blockOracle as `0x${string}`,
    marketResolver: deployedAddresses.marketResolver as `0x${string}`,
};

export const CONTRACTS: Record<string, ContractAddresses> = {
    monadTestnet,
    hardhat: monadTestnet,
};

export const getContracts = (): ContractAddresses => {
    return monadTestnet;
};
