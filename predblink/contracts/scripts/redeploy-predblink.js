/**
 * Redeploy only PredBlink.sol (keeping MockUSDC, ShareToken, PriceOracle, BlockOracle).
 * Re-wires ShareToken → new PredBlink, and sets oracles + deployer as resolver.
 * Also configures Pyth on PriceOracle.
 *
 * Usage:
 *   npx hardhat run scripts/redeploy-predblink.js --network monadTestnet
 */

require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Keep these — don't redeploy
const EXISTING = {
    mockUSDC:    "0xa3823ef745DD8Df93222C4dA74665E9Ce515dAeF",
    shareToken:  "0x4923AB84c1b2043C4215ce446Ccc42ede1854462",
    priceOracle: "0x5462539809fc8F822e81f8Da6BA0B71615d9a366",
    blockOracle: "0xE2654a34B262aB6399F22a7A75981f2E79DEfbD1",
    marketResolver: "0x417DBe5D70e873f19f5B252F7fEc6054e9529949", // kept for reference, unused
};

// Pyth contract on Monad Testnet
const PYTH_MONAD_TESTNET = "0x2880aB155794e7179c9eE2e38200202908C17B43";

async function main() {
    console.log("\n" + "=".repeat(60));
    console.log("  REDEPLOYING PredBlink (Pyth-native resolution)");
    console.log("=".repeat(60) + "\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Network:  ", hre.network.name);
    console.log("Deployer: ", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:  ", hre.ethers.formatEther(balance), "MON\n");

    // ── 1. Deploy new PredBlink ─────────────────
    console.log("[1/4] Deploying new PredBlink...");
    const PredBlink = await hre.ethers.getContractFactory("PredBlink");
    const predBlink = await PredBlink.deploy(EXISTING.mockUSDC, EXISTING.shareToken, deployer.address);
    await predBlink.waitForDeployment();
    const predBlinkAddr = await predBlink.getAddress();
    console.log("  PredBlink:", predBlinkAddr);

    // ── 2. Rewire ShareToken ────────────────────
    console.log("[2/4] Rewiring ShareToken → new PredBlink...");
    const shareToken = await hre.ethers.getContractAt("ShareToken", EXISTING.shareToken);
    await (await shareToken.setMarketFactory(predBlinkAddr)).wait();
    console.log("  ShareToken.setMarketFactory ->", predBlinkAddr);

    // ── 3. Wire oracles into new PredBlink ─────
    console.log("[3/4] Wiring oracles...");
    await (await predBlink.setOracle(0, EXISTING.priceOracle)).wait();
    console.log("  setOracle(PRICE -> PriceOracle)");
    await (await predBlink.setOracle(2, EXISTING.blockOracle)).wait();
    console.log("  setOracle(BLOCK_DATA -> BlockOracle)");

    // ── 4. Configure Pyth on PriceOracle ───────
    console.log("[4/4] Configuring Pyth on PriceOracle...");
    const priceOracle = await hre.ethers.getContractAt("PriceOracle", EXISTING.priceOracle);
    try {
        await (await priceOracle.configurePyth(PYTH_MONAD_TESTNET, 120)).wait();
        console.log("  PriceOracle.configurePyth ->", PYTH_MONAD_TESTNET);
    } catch (e) {
        console.log("  Warning: Pyth config failed (might already be set or address wrong):", e.shortMessage);
    }

    // ── Save updated addresses ──────────────────
    const addresses = {
        network:        hre.network.name,
        chainId:        hre.network.config.chainId || 10143,
        mockUSDC:       EXISTING.mockUSDC,
        shareToken:     EXISTING.shareToken,
        predBlink:      predBlinkAddr,
        priceOracle:    EXISTING.priceOracle,
        blockOracle:    EXISTING.blockOracle,
        marketResolver: "0x0000000000000000000000000000000000000000", // not used
        protocolWallet: deployer.address,
        deployer:       deployer.address,
        version:        "PredBlink-v2-pyth",
        deployedAt:     new Date().toISOString(),
    };

    const outPath = path.join(__dirname, "..", "deployed-predblink.json");
    fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
    console.log(`\nAddresses saved to ${outPath}`);

    console.log("\n" + "=".repeat(60));
    console.log("  DONE");
    console.log("=".repeat(60));
    console.log("  MockUSDC:    ", EXISTING.mockUSDC);
    console.log("  ShareToken:  ", EXISTING.shareToken);
    console.log("  PredBlink:   ", predBlinkAddr, " ← NEW");
    console.log("  PriceOracle: ", EXISTING.priceOracle, "(Pyth-backed)");
    console.log("  BlockOracle: ", EXISTING.blockOracle);
    console.log("=".repeat(60) + "\n");
    console.log("  Resolution flow for PRICE markets:");
    console.log("    1. Call priceOracle.updateFromPyth(feedId, pythVAA)");
    console.log("    2. Call predBlink.resolveMarket(id)  ← permissionless");
    console.log("  For TWITTER/BLOCK markets:");
    console.log("    Call predBlink.resolveManual(id, finalValue)  ← owner only");
    console.log("=".repeat(60) + "\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Failed:", error);
        process.exit(1);
    });
