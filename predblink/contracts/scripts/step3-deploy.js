/**
 * STEP 3: Deploy Contracts
 * 
 * This script deploys all PredBlink simplified contracts:
 * - MockUSDC (for testnet)
 * - ShareToken (ERC-1155 for YES/NO shares)
 * - MarketFactory (creates and manages prediction markets)
 * 
 * Usage: npx hardhat run scripts/step3-deploy.js --network bscTestnet
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n" + "=".repeat(50));
    console.log("💥 PredBlink - STEP 3: DEPLOY CONTRACTS");
    console.log("=".repeat(50));
    console.log("\nNetwork:", hre.network.name);

    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        console.log("\n❌ No wallet found! Run step1-show-wallet.js first.");
        process.exit(1);
    }

    // Create wallet instance connected to provider
    const provider = new hre.ethers.JsonRpcProvider(hre.network.config.url);
    const deployer = new hre.ethers.Wallet(privateKey, provider);

    // Check balance
    const balance = await provider.getBalance(deployer.address);
    const balanceEth = hre.ethers.formatEther(balance);

    console.log("\n💳 Deployer:", deployer.address);
    console.log("💰 Balance:", balanceEth, "BNB");

    const minRequired = 0.01;
    if (parseFloat(balanceEth) < minRequired) {
        console.log("\n❌ Insufficient funds! Need at least", minRequired, "BNB");
        console.log("   Run step2-check-balance.js to check your balance.");
        process.exit(1);
    }

    console.log("\n" + "=".repeat(50));
    console.log("🚀 DEPLOYING CONTRACTS...");
    console.log("=".repeat(50));

    // Step 1: Deploy MockUSDC
    console.log("\n📝 [1/4] Deploying MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC", deployer);
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const usdcAddress = await mockUSDC.getAddress();
    console.log("   ✅ MockUSDC deployed to:", usdcAddress);

    // Step 2: Deploy ShareToken
    console.log("\n📝 [2/4] Deploying ShareToken...");
    const ShareToken = await hre.ethers.getContractFactory("ShareToken", deployer);
    const shareToken = await ShareToken.deploy("https://PredBlink.io/api/metadata/{id}");
    await shareToken.waitForDeployment();
    const shareTokenAddress = await shareToken.getAddress();
    console.log("   ✅ ShareToken deployed to:", shareTokenAddress);

    // Step 3: Deploy MarketFactory
    console.log("\n📝 [3/4] Deploying MarketFactory...");
    const MarketFactory = await hre.ethers.getContractFactory("MarketFactory", deployer);
    const marketFactory = await MarketFactory.deploy(shareTokenAddress, usdcAddress);
    await marketFactory.waitForDeployment();
    const marketFactoryAddress = await marketFactory.getAddress();
    console.log("   ✅ MarketFactory deployed to:", marketFactoryAddress);

    // Step 4: Configure ShareToken
    console.log("\n📝 [4/4] Configuring ShareToken...");
    const setFactoryTx = await shareToken.setMarketFactory(marketFactoryAddress);
    await setFactoryTx.wait();
    console.log("   ✅ MarketFactory configured in ShareToken");

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));

    const addresses = {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        mockUSDC: usdcAddress,
        shareToken: shareTokenAddress,
        marketFactory: marketFactoryAddress,
        protocolWallet: deployer.address,
        deployedAt: new Date().toISOString()
    };

    console.log("\n📋 Contract Addresses:");
    console.log("   ─────────────────────────────────────────────");
    console.log("   MockUSDC:        ", usdcAddress);
    console.log("   ShareToken:      ", shareTokenAddress);
    console.log("   MarketFactory:   ", marketFactoryAddress);
    console.log("   Protocol Wallet: ", deployer.address);
    console.log("   ─────────────────────────────────────────────");

    // Save addresses
    const addressFile = path.join(__dirname, "..", "deployed-addresses.json");
    fs.writeFileSync(addressFile, JSON.stringify(addresses, null, 2));
    console.log("\n✅ Addresses saved to: deployed-addresses.json");

    // Check remaining balance
    const remainingBalance = await provider.getBalance(deployer.address);
    console.log("\n💰 Remaining BNB:", hre.ethers.formatEther(remainingBalance), "BNB");

    console.log("\n" + "=".repeat(50));
    console.log("🎊 ALL DONE!");
    console.log("=".repeat(50));
    console.log("\n📋 NEXT STEPS:");
    console.log("   1. Copy contract addresses to your frontend");
    console.log("   2. Update lib/contracts/addresses.ts");
    console.log("   3. Test the contracts");
    console.log("   4. (Optional) Verify on BscScan");
    console.log("\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error.message);
        console.error(error);
        process.exit(1);
    });
