const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log("Deployment Wallet:", deployer.address);
  console.log("BNB Balance:", hre.ethers.formatEther(balance), "BNB");
  console.log("USD Value (approx):", "$" + (parseFloat(hre.ethers.formatEther(balance)) * 600).toFixed(2));
  
  const estimatedCost = hre.ethers.parseEther("0.02"); // ~$12 for full deployment
  const hasEnough = balance > estimatedCost;
  
  console.log("\nEstimated deployment cost: 0.02 BNB (~$12)");
  console.log("Can redeploy?", hasEnough ? "✅ YES" : "❌ NO - need more testnet BNB");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
