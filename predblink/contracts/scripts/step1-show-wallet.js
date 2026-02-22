/**
 * STEP 1: Show/Generate Deployer Wallet
 * 
 * This script shows the deployer wallet address.
 * If no wallet exists, it generates one and saves it to .env
 * 
 * Usage: npx hardhat run scripts/step1-show-wallet.js --network bscTestnet
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n" + "=".repeat(50));
    console.log("💥 PredBlink - STEP 1: WALLET SETUP");
    console.log("=".repeat(50));
    console.log("\nNetwork:", hre.network.name);

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
        const envContent = `# Auto-generated deployer wallet for PredBlink\n# KEEP THIS SECRET - DO NOT SHARE OR COMMIT\n# Generated: ${new Date().toISOString()}\nPRIVATE_KEY=${privateKey}\n`;
        fs.writeFileSync(envPath, envContent);
        console.log("✅ NEW wallet generated and saved to .env file");
        console.log("   ⚠️  KEEP THIS FILE SECRET - DO NOT COMMIT TO GIT\n");
    } else {
        console.log("\n🔑 Using existing wallet from .env\n");
    }

    // Create wallet instance connected to provider
    const provider = new hre.ethers.JsonRpcProvider(hre.network.config.url);
    const deployer = new hre.ethers.Wallet(privateKey, provider);

    // Check balance
    const balance = await provider.getBalance(deployer.address);
    const balanceEth = hre.ethers.formatEther(balance);

    console.log("=".repeat(50));
    console.log("💳 DEPLOYER WALLET INFO");
    console.log("=".repeat(50));
    console.log("\n🏦 Address:");
    console.log("   " + deployer.address);
    console.log("\n💰 Current Balance:", balanceEth, "BNB");

    const minRequired = 0.01;
    const hasEnough = parseFloat(balanceEth) >= minRequired;

    console.log("📊 Minimum Required:", minRequired, "BNB");
    console.log("✅ Ready to Deploy?", hasEnough ? "YES ✅" : "NO ❌ - needs funding");

    console.log("\n" + "=".repeat(50));

    if (!hasEnough) {
        console.log("⚡ ACTION REQUIRED: FUND THIS WALLET");
        console.log("=".repeat(50));
        console.log("\n📤 Send at least 0.02 BNB to:\n");
        console.log("   ╔══════════════════════════════════════════════╗");
        console.log("   ║  " + deployer.address + "  ║");
        console.log("   ╚══════════════════════════════════════════════╝");
        console.log("\n🌐 Get testnet BNB from:");
        console.log("   https://testnet.bnbchain.org/faucet-smart");
        console.log("\n📊 Estimated deployment cost: ~0.015 BNB");
        console.log("   Recommended: Send 0.02 BNB to be safe");
        console.log("\n" + "=".repeat(50));
        console.log("NEXT STEPS:");
        console.log("=".repeat(50));
        console.log("\n1. Fund the wallet above with testnet BNB");
        console.log("2. Run: npx hardhat run scripts/step2-check-balance.js --network bscTestnet");
        console.log("3. Once confirmed, run: npx hardhat run scripts/step3-deploy.js --network bscTestnet");
    } else {
        console.log("🎉 WALLET IS FUNDED AND READY!");
        console.log("=".repeat(50));
        console.log("\nYou can now deploy by running:");
        console.log("   npx hardhat run scripts/step3-deploy.js --network bscTestnet");
    }

    console.log("\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });
