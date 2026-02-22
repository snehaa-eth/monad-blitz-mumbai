/**
 * Deploy ONLY MarketFactoryV2 using existing MockUSDC and ShareToken
 */

require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n🚀 Deploying MarketFactoryV2 only...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "BNB\n");

    // Use already deployed MockUSDC and ShareToken from previous partial deployment
    const mockUsdcAddress = "0xf71A99BD244a1f73Aa07A2ccaA315ADB9D41CaCf";
    const shareTokenAddress = "0x331042bf992BcD11521DfC88bB7b17f2B83f9336";

    console.log("Using MockUSDC:", mockUsdcAddress);
    console.log("Using ShareToken:", shareTokenAddress);

    // Deploy MarketFactoryV2
    console.log("\n📝 Deploying MarketFactoryV2...");
    const MarketFactoryV2 = await hre.ethers.getContractFactory("MarketFactoryV2");
    const marketFactory = await MarketFactoryV2.deploy(
        mockUsdcAddress,
        shareTokenAddress,
        deployer.address,  // Protocol wallet
        deployer.address   // Oracle
    );
    await marketFactory.waitForDeployment();
    const marketFactoryAddress = await marketFactory.getAddress();
    console.log("✅ MarketFactoryV2 deployed:", marketFactoryAddress);

    // Configure ShareToken to allow new MarketFactory to mint/burn
    console.log("\n⚙️  Configuring ShareToken...");
    const shareToken = await hre.ethers.getContractAt("ShareToken", shareTokenAddress);
    const tx = await shareToken.setMarketFactory(marketFactoryAddress);
    await tx.wait();
    console.log("✅ ShareToken configured!");

    // Save addresses
    const addresses = {
        network: "bscTestnet",
        chainId: 97,
        mockUSDC: mockUsdcAddress,
        shareToken: shareTokenAddress,
        marketFactory: marketFactoryAddress,
        protocolWallet: deployer.address,
        oracle: deployer.address,
        version: "V2",
        deployedAt: new Date().toISOString()
    };

    const addressPath = path.join(__dirname, "..", "deployed-addresses-v2.json");
    fs.writeFileSync(addressPath, JSON.stringify(addresses, null, 2));
    console.log("\n📁 Saved to:", addressPath);

    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log("\n📋 Addresses:");
    console.log("   MockUSDC:        ", mockUsdcAddress);
    console.log("   ShareToken:      ", shareTokenAddress);
    console.log("   MarketFactoryV2: ", marketFactoryAddress);
    console.log("\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
