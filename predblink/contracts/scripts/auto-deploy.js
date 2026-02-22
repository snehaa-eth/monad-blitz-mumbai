/**
 * 🚀 Auto-Deploy Script for PredBlink
 * 
 * This script:
 * 1. Generates a new deployer wallet (or uses existing from .env)
 * 2. Shows the address to fund with testnet BNB
 * 3. Waits for funding (~0.02 BNB needed)
 * 4. Deploys all contracts automatically
 * 5. Saves the private key and deployed addresses
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Minimum BNB required for deployment (0.02 BNB ~= $12)
const MIN_BALANCE = hre.ethers.parseEther("0.01");

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForFunding(address, provider) {
    console.log("\n⏳ Waiting for funding...");
    console.log("   Checking every 10 seconds...\n");

    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max

    while (attempts < maxAttempts) {
        const balance = await provider.getBalance(address);
        const balanceEth = hre.ethers.formatEther(balance);

        process.stdout.write(`\r   Balance: ${balanceEth} BNB`);

        if (balance >= MIN_BALANCE) {
            console.log(`\n\n✅ Funding received! Balance: ${balanceEth} BNB`);
            return balance;
        }

        await sleep(10000); // Check every 10 seconds
        attempts++;
    }

    throw new Error("Timeout waiting for funding");
}

async function deployContracts(deployer) {
    console.log("\n" + "=".repeat(50));
    console.log("🚀 DEPLOYING PredBlink SIMPLIFIED CONTRACTS");
    console.log("=".repeat(50));
    console.log("\nNetwork:", hre.network.name);
    console.log("Deployer:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "BNB");

    // Step 1: Deploy MockUSDC
    console.log("\n📝 Step 1/4: Deploying MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC", deployer);
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const usdcAddress = await mockUSDC.getAddress();
    console.log("✅ MockUSDC deployed to:", usdcAddress);

    // Step 2: Deploy ShareToken
    console.log("\n📝 Step 2/4: Deploying ShareToken...");
    const ShareToken = await hre.ethers.getContractFactory("ShareToken", deployer);
    const shareToken = await ShareToken.deploy("https://PredBlink.io/api/metadata/{id}");
    await shareToken.waitForDeployment();
    const shareTokenAddress = await shareToken.getAddress();
    console.log("✅ ShareToken deployed to:", shareTokenAddress);

    // Step 3: Deploy MarketFactory
    console.log("\n📝 Step 3/4: Deploying MarketFactory...");
    const MarketFactory = await hre.ethers.getContractFactory("MarketFactory", deployer);
    const marketFactory = await MarketFactory.deploy(shareTokenAddress, usdcAddress);
    await marketFactory.waitForDeployment();
    const marketFactoryAddress = await marketFactory.getAddress();
    console.log("✅ MarketFactory deployed to:", marketFactoryAddress);

    // Step 4: Configure ShareToken
    console.log("\n📝 Step 4/4: Configuring ShareToken...");
    const setFactoryTx = await shareToken.setMarketFactory(marketFactoryAddress);
    await setFactoryTx.wait();
    console.log("✅ MarketFactory set in ShareToken");

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
    console.log("------------------------");
    console.log("MockUSDC:       ", usdcAddress);
    console.log("ShareToken:     ", shareTokenAddress);
    console.log("MarketFactory:  ", marketFactoryAddress);
    console.log("Protocol Wallet:", deployer.address);

    // Save addresses
    const addressFile = path.join(__dirname, "..", "deployed-addresses.json");
    fs.writeFileSync(addressFile, JSON.stringify(addresses, null, 2));
    console.log("\n✅ Addresses saved to deployed-addresses.json");

    // Check remaining balance
    const remainingBalance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("\n💰 Remaining BNB:", hre.ethers.formatEther(remainingBalance), "BNB");

    return addresses;
}

async function main() {
    console.log("\n" + "=".repeat(50));
    console.log("💥 PredBlink CONTRACT DEPLOYMENT");
    console.log("=".repeat(50));
    console.log("\nNetwork:", hre.network.name);

    // Check for existing private key in .env
    const envPath = path.join(__dirname, "..", ".env");
    let privateKey = process.env.PRIVATE_KEY;
    let walletGenerated = false;

    if (!privateKey) {
        // Generate a new wallet
        console.log("\n🔑 No existing wallet found. Generating new deployer wallet...\n");
        const wallet = hre.ethers.Wallet.createRandom();
        privateKey = wallet.privateKey;
        walletGenerated = true;

        // Save to .env file
        const envContent = `# Auto-generated deployer wallet\n# KEEP THIS SECRET - DO NOT SHARE OR COMMIT\nPRIVATE_KEY=${privateKey}\n`;
        fs.writeFileSync(envPath, envContent);
        console.log("✅ Private key saved to .env file");
        console.log("   ⚠️  KEEP THIS FILE SECRET - DO NOT COMMIT TO GIT");
    } else {
        console.log("\n🔑 Using existing wallet from .env");
    }

    // Create wallet instance connected to provider
    const provider = new hre.ethers.JsonRpcProvider(
        hre.network.config.url
    );
    const deployer = new hre.ethers.Wallet(privateKey, provider);

    console.log("\n" + "=".repeat(50));
    console.log("💳 DEPLOYER WALLET");
    console.log("=".repeat(50));
    console.log("\n🏦 Address:", deployer.address);

    // Check balance
    const balance = await provider.getBalance(deployer.address);
    const balanceEth = hre.ethers.formatEther(balance);
    console.log("💰 Balance:", balanceEth, "BNB");

    if (balance < MIN_BALANCE) {
        console.log("\n" + "=".repeat(50));
        console.log("⚡ FUNDING REQUIRED");
        console.log("=".repeat(50));
        console.log("\n📤 Please send at least 0.01 BNB to:\n");
        console.log("   " + "=".repeat(44));
        console.log("   " + deployer.address);
        console.log("   " + "=".repeat(44));
        console.log("\n🌐 Get testnet BNB from:");
        console.log("   https://testnet.bnbchain.org/faucet-smart");
        console.log("\n📊 Estimated deployment cost: ~0.015 BNB");
        console.log("   Recommended: Send 0.02 BNB to be safe\n");

        // Wait for funding
        await waitForFunding(deployer.address, provider);
    }

    // Deploy contracts
    await deployContracts(deployer);

    console.log("\n" + "=".repeat(50));
    console.log("🎊 ALL DONE!");
    console.log("=".repeat(50));
    console.log("\nNext steps:");
    console.log("1. Update frontend with contract addresses");
    console.log("2. Test contract functions");
    console.log("3. Verify contracts on BscScan (optional)");
    console.log("\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error.message);
        process.exit(1);
    });
