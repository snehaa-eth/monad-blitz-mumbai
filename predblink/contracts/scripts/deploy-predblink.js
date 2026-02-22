/**
 * Deploy the full PredBlink system:
 *   MockUSDC → ShareToken → PredBlink → PriceOracle → BlockOracle → MarketResolver
 *
 * Usage:
 *   npx hardhat run scripts/deploy-predblink.js --network monadTestnet
 *   npx hardhat run scripts/deploy-predblink.js --network hardhat
 */

require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n" + "=".repeat(60));
    console.log("  DEPLOYING PREDBLINK — Monad Prediction Markets");
    console.log("=".repeat(60) + "\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Network:  ", hre.network.name);
    console.log("Deployer: ", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:  ", hre.ethers.formatEther(balance), "MON\n");

    // ── 1. MockUSDC ────────────────────────────
    console.log("[1/6] Deploying MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    const usdcAddr = await usdc.getAddress();
    console.log("  MockUSDC:", usdcAddr);

    // ── 2. ShareToken ──────────────────────────
    console.log("[2/6] Deploying ShareToken...");
    const ShareToken = await hre.ethers.getContractFactory("ShareToken");
    const shareToken = await ShareToken.deploy("https://predblink.xyz/api/token/{id}.json");
    await shareToken.waitForDeployment();
    const shareAddr = await shareToken.getAddress();
    console.log("  ShareToken:", shareAddr);

    // ── 3. PredBlink ───────────────────────────
    console.log("[3/6] Deploying PredBlink...");
    const PredBlink = await hre.ethers.getContractFactory("PredBlink");
    const predBlink = await PredBlink.deploy(usdcAddr, shareAddr, deployer.address);
    await predBlink.waitForDeployment();
    const predBlinkAddr = await predBlink.getAddress();
    console.log("  PredBlink:", predBlinkAddr);

    // Point ShareToken at PredBlink
    const txFactory = await shareToken.setMarketFactory(predBlinkAddr);
    await txFactory.wait();
    console.log("  ShareToken.setMarketFactory -> PredBlink");

    // ── 4. PriceOracle ─────────────────────────
    console.log("[4/6] Deploying PriceOracle...");
    const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy();
    await priceOracle.waitForDeployment();
    const priceOracleAddr = await priceOracle.getAddress();
    console.log("  PriceOracle:", priceOracleAddr);

    // Register common price feeds
    const pairs = ["BTC/USD", "ETH/USD", "MON/USD"];
    for (const pair of pairs) {
        const tx = await priceOracle.registerFeed(pair);
        await tx.wait();
        console.log(`    Registered feed: ${pair}`);
    }

    // Pyth feed ID mappings (for when Pyth is configured on Monad)
    const PYTH_FEED_IDS = {
        "BTC/USD": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
        "ETH/USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        "MON/USD": "0x4ef5c05f1de389dbe4cf29ab80e6de509c63e894b1b8503d3c187cdd84903607",
    };
    for (const [pair, pythId] of Object.entries(PYTH_FEED_IDS)) {
        const tx = await priceOracle.mapPythFeed(pair, pythId);
        await tx.wait();
        console.log(`    Mapped Pyth feed: ${pair} → ${pythId.slice(0, 10)}...`);
    }
    console.log("    (Pyth contract can be configured later via configurePyth())");

    // ── 5. BlockOracle ─────────────────────────
    console.log("[5/6] Deploying BlockOracle...");
    const BlockOracle = await hre.ethers.getContractFactory("BlockOracle");
    const blockOracle = await BlockOracle.deploy();
    await blockOracle.waitForDeployment();
    const blockOracleAddr = await blockOracle.getAddress();
    console.log("  BlockOracle:", blockOracleAddr);

    // Record initial block snapshot
    const txRecord = await blockOracle.recordBlock();
    await txRecord.wait();
    console.log("    Initial block recorded");

    // ── 6. MarketResolver ──────────────────────
    console.log("[6/6] Deploying MarketResolver...");
    const MarketResolver = await hre.ethers.getContractFactory("MarketResolver");
    const resolver = await MarketResolver.deploy(predBlinkAddr);
    await resolver.waitForDeployment();
    const resolverAddr = await resolver.getAddress();
    console.log("  MarketResolver:", resolverAddr);

    // ── Wire everything together ───────────────
    console.log("\nWiring contracts...");

    // PredBlink: set oracle adapters
    // MarketType: 0=PRICE, 1=TWITTER, 2=BLOCK_DATA
    await (await predBlink.setOracle(0, priceOracleAddr)).wait();
    console.log("  PredBlink.setOracle(PRICE -> PriceOracle)");

    await (await predBlink.setOracle(2, blockOracleAddr)).wait();
    console.log("  PredBlink.setOracle(BLOCK_DATA -> BlockOracle)");

    // PredBlink: authorise resolver
    await (await predBlink.setResolver(resolverAddr, true)).wait();
    console.log("  PredBlink.setResolver(MarketResolver -> true)");

    // Also authorise deployer as resolver for manual ops
    await (await predBlink.setResolver(deployer.address, true)).wait();
    console.log("  PredBlink.setResolver(deployer -> true)");

    // MarketResolver: set oracles
    await (await resolver.setOracle(0, priceOracleAddr)).wait();
    await (await resolver.setOracle(2, blockOracleAddr)).wait();
    console.log("  MarketResolver oracles configured");

    // ── Mint test USDC to deployer ─────────────
    const mintAmount = 1_000_000n * 10n ** 6n; // 1M USDC
    await (await usdc.mint(deployer.address, mintAmount)).wait();
    console.log(`  Minted 1,000,000 USDC to deployer`);

    // ── Save addresses ─────────────────────────
    const addresses = {
        network:        hre.network.name,
        chainId:        hre.network.config.chainId || 1337,
        mockUSDC:       usdcAddr,
        shareToken:     shareAddr,
        predBlink:      predBlinkAddr,
        priceOracle:    priceOracleAddr,
        blockOracle:    blockOracleAddr,
        marketResolver: resolverAddr,
        protocolWallet: deployer.address,
        deployer:       deployer.address,
        version:        "PredBlink-v1",
        deployedAt:     new Date().toISOString(),
    };

    const outPath = path.join(__dirname, "..", "deployed-predblink.json");
    fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
    console.log(`\nAddresses saved to ${outPath}`);

    // ── Summary ────────────────────────────────
    console.log("\n" + "=".repeat(60));
    console.log("  DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log("\n  MockUSDC:        ", usdcAddr);
    console.log("  ShareToken:      ", shareAddr);
    console.log("  PredBlink:       ", predBlinkAddr);
    console.log("  PriceOracle:     ", priceOracleAddr);
    console.log("  BlockOracle:     ", blockOracleAddr);
    console.log("  MarketResolver:  ", resolverAddr);
    console.log("\n  Next steps:");
    console.log("    1. Copy ABIs to frontend");
    console.log("    2. Update frontend contract addresses");
    console.log("    3. Start relayers:");
    console.log("       node scripts/price-relayer.js --mode manual --interval 15");
    console.log("       node scripts/twitter-resolver.js --interval 30");
    console.log("       node scripts/block-keeper.js --interval 5");
    console.log("=".repeat(60) + "\n");

    return addresses;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
