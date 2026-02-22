/**
 * STEP 2: Check Deployer Balance
 * 
 * This script checks if the deployer wallet has been funded.
 * Run this after sending BNB to the wallet address.
 * 
 * Usage: npx hardhat run scripts/step2-check-balance.js --network bscTestnet
 */

const hre = require("hardhat");

async function main() {
    console.log("\n" + "=".repeat(50));
    console.log("💥 PredBlink - STEP 2: CHECK BALANCE");
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

    console.log("\n💳 Wallet:", deployer.address);
    console.log("💰 Balance:", balanceEth, "BNB");

    const minRequired = 0.01;
    const hasEnough = parseFloat(balanceEth) >= minRequired;

    console.log("\n" + "=".repeat(50));

    if (hasEnough) {
        console.log("✅ FUNDING CONFIRMED!");
        console.log("=".repeat(50));
        console.log("\n🎉 Your wallet has", balanceEth, "BNB");
        console.log("   This is enough to deploy all contracts!");
        console.log("\n📋 READY TO DEPLOY!");
        console.log("\nRun the following command to deploy:");
        console.log("   npx hardhat run scripts/step3-deploy.js --network bscTestnet");
    } else {
        console.log("❌ INSUFFICIENT FUNDS");
        console.log("=".repeat(50));
        console.log("\n💰 Current Balance:", balanceEth, "BNB");
        console.log("📊 Minimum Required:", minRequired, "BNB");
        console.log("📉 Shortfall:", (minRequired - parseFloat(balanceEth)).toFixed(4), "BNB");
        console.log("\n📤 Send more BNB to:", deployer.address);
        console.log("🌐 Faucet: https://testnet.bnbchain.org/faucet-smart");
        console.log("\nThen run this script again to confirm.");
    }

    console.log("\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });
