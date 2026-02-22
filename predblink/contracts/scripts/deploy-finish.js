/**
 * Finish deployment: contracts 1-5 already deployed in the previous run.
 * This script deploys MarketResolver, wires everything, mints USDC, and saves addresses.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-finish.js --network monadTestnet
 */

require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Addresses from the partial run
const ALREADY_DEPLOYED = {
    mockUSDC:    "0xa3823ef745DD8Df93222C4dA74665E9Ce515dAeF",
    shareToken:  "0x4923AB84c1b2043C4215ce446Ccc42ede1854462",
    predBlink:   "0x5654FCfBdE831C6263de36f120605dAc2187879f",
    priceOracle: "0x5462539809fc8F822e81f8Da6BA0B71615d9a366",
    blockOracle: "0xE2654a34B262aB6399F22a7A75981f2E79DEfbD1",
};

async function main() {
    console.log("\n" + "=".repeat(60));
    console.log("  FINISHING PREDBLINK DEPLOYMENT (step 6/6)");
    console.log("=".repeat(60) + "\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Network:  ", hre.network.name);
    console.log("Deployer: ", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:  ", hre.ethers.formatEther(balance), "MON\n");

    // Attach to already-deployed contracts
    const predBlink   = await hre.ethers.getContractAt("PredBlink",    ALREADY_DEPLOYED.predBlink);
    const priceOracle = await hre.ethers.getContractAt("PriceOracle",  ALREADY_DEPLOYED.priceOracle);
    const blockOracle = await hre.ethers.getContractAt("BlockOracle",  ALREADY_DEPLOYED.blockOracle);
    const usdc        = await hre.ethers.getContractAt("MockUSDC",     ALREADY_DEPLOYED.mockUSDC);

    // ── 6. MarketResolver ──────────────────────
    console.log("[6/6] Deploying MarketResolver...");
    const MarketResolver = await hre.ethers.getContractFactory("MarketResolver");
    const resolver = await MarketResolver.deploy(ALREADY_DEPLOYED.predBlink);
    await resolver.waitForDeployment();
    const resolverAddr = await resolver.getAddress();
    console.log("  MarketResolver:", resolverAddr);

    // ── Wire everything ────────────────────────
    console.log("\nWiring contracts...");

    await (await predBlink.setOracle(0, ALREADY_DEPLOYED.priceOracle)).wait();
    console.log("  PredBlink.setOracle(PRICE -> PriceOracle)");

    await (await predBlink.setOracle(2, ALREADY_DEPLOYED.blockOracle)).wait();
    console.log("  PredBlink.setOracle(BLOCK_DATA -> BlockOracle)");

    await (await predBlink.setResolver(resolverAddr, true)).wait();
    console.log("  PredBlink.setResolver(MarketResolver -> true)");

    await (await predBlink.setResolver(deployer.address, true)).wait();
    console.log("  PredBlink.setResolver(deployer -> true)");

    await (await resolver.setOracle(0, ALREADY_DEPLOYED.priceOracle)).wait();
    await (await resolver.setOracle(2, ALREADY_DEPLOYED.blockOracle)).wait();
    console.log("  MarketResolver oracles configured");

    // ── Mint test USDC ─────────────────────────
    const mintAmount = 1_000_000n * 10n ** 6n;
    await (await usdc.mint(deployer.address, mintAmount)).wait();
    console.log(`  Minted 1,000,000 USDC to deployer`);

    // ── Save addresses ─────────────────────────
    const addresses = {
        network:        hre.network.name,
        chainId:        hre.network.config.chainId || 10143,
        mockUSDC:       ALREADY_DEPLOYED.mockUSDC,
        shareToken:     ALREADY_DEPLOYED.shareToken,
        predBlink:      ALREADY_DEPLOYED.predBlink,
        priceOracle:    ALREADY_DEPLOYED.priceOracle,
        blockOracle:    ALREADY_DEPLOYED.blockOracle,
        marketResolver: resolverAddr,
        protocolWallet: deployer.address,
        deployer:       deployer.address,
        version:        "PredBlink-v1",
        deployedAt:     new Date().toISOString(),
    };

    const outPath = path.join(__dirname, "..", "deployed-predblink.json");
    fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
    console.log(`\nAddresses saved to ${outPath}`);

    console.log("\n" + "=".repeat(60));
    console.log("  DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log("\n  MockUSDC:        ", ALREADY_DEPLOYED.mockUSDC);
    console.log("  ShareToken:      ", ALREADY_DEPLOYED.shareToken);
    console.log("  PredBlink:       ", ALREADY_DEPLOYED.predBlink);
    console.log("  PriceOracle:     ", ALREADY_DEPLOYED.priceOracle);
    console.log("  BlockOracle:     ", ALREADY_DEPLOYED.blockOracle);
    console.log("  MarketResolver:  ", resolverAddr);
    console.log("=".repeat(60) + "\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
