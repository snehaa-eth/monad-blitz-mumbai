/**
 * Deploy MarketFactoryV2 with full tweet storage
 * 
 * Usage: npx hardhat run scripts/deploy-v2.js --network bscTestnet
 */

require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 DEPLOYING MARKETFACTORY V2");
    console.log("=".repeat(60) + "\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("📍 Network:", hre.network.name);
    console.log("💳 Deployer:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", hre.ethers.formatEther(balance), "BNB");
    console.log("");

    // ============ DEPLOY MOCK USDC ============
    console.log("📝 Deploying MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();
    const mockUsdcAddress = await mockUsdc.getAddress();
    console.log("✅ MockUSDC deployed:", mockUsdcAddress);

    // ============ DEPLOY SHARE TOKEN ============
    console.log("\n📝 Deploying ShareToken...");
    const ShareToken = await hre.ethers.getContractFactory("ShareToken");
    const shareToken = await ShareToken.deploy("https://PredBlink.lol/api/token/{id}.json");
    await shareToken.waitForDeployment();
    const shareTokenAddress = await shareToken.getAddress();
    console.log("✅ ShareToken deployed:", shareTokenAddress);

    // ============ DEPLOY MARKET FACTORY V2 ============
    console.log("\n📝 Deploying MarketFactoryV2...");
    const MarketFactoryV2 = await hre.ethers.getContractFactory("MarketFactoryV2");
    const marketFactory = await MarketFactoryV2.deploy(
        mockUsdcAddress,      // USDC token
        shareTokenAddress,    // Share token
        deployer.address,     // Protocol wallet (deployer for now)
        deployer.address      // Oracle (deployer for now, can update later)
    );
    await marketFactory.waitForDeployment();
    const marketFactoryAddress = await marketFactory.getAddress();
    console.log("✅ MarketFactoryV2 deployed:", marketFactoryAddress);

    // ============ CONFIGURE SHARE TOKEN ============
    console.log("\n⚙️  Configuring ShareToken...");
    const setFactoryTx = await shareToken.setMarketFactory(marketFactoryAddress);
    await setFactoryTx.wait();
    console.log("✅ ShareToken.setMarketFactory() done");

    // ============ SAVE ADDRESSES ============
    const deployedAddresses = {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        mockUSDC: mockUsdcAddress,
        shareToken: shareTokenAddress,
        marketFactory: marketFactoryAddress,
        protocolWallet: deployer.address,
        oracle: deployer.address,
        version: "V2",
        deployedAt: new Date().toISOString(),
    };

    const addressPath = path.join(__dirname, "..", "deployed-addresses-v2.json");
    fs.writeFileSync(addressPath, JSON.stringify(deployedAddresses, null, 2));
    console.log("\n📁 Addresses saved to:", addressPath);

    // ============ SUMMARY ============
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log("\n📋 Contract Addresses:");
    console.log("   MockUSDC:          ", mockUsdcAddress);
    console.log("   ShareToken:        ", shareTokenAddress);
    console.log("   MarketFactoryV2:   ", marketFactoryAddress);
    console.log("\n⚠️  Next Steps:");
    console.log("   1. Update frontend/lib/contracts/addresses.ts with new addresses");
    console.log("   2. Update ABIs if needed");
    console.log("   3. Mint test USDC to your wallet");
    console.log("=".repeat(60) + "\n");

    return deployedAddresses;
}

main()
    .then((addresses) => {
        console.log("Deployed addresses:", addresses);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
