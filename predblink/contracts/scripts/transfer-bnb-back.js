const hre = require("hardhat");

async function main() {
  // We'll transfer from Privy wallet back to deployer
  // But we can't do that with hardhat since we don't control Privy wallet
  
  // Instead, let's just check if we can deploy only OrderBook (the one with fees)
  console.log("Option 1: Deploy only OrderBook with new fees");
  console.log("Cost: ~0.008 BNB (we have 0.014) ✅");
  console.log("\nOption 2: Get more testnet BNB from faucet");
  console.log("Option 3: Continue testing with current contracts, fix fees for mainnet");
  
  console.log("\nRecommendation: Deploy only OrderBook now (cheapest)");
  console.log("The fee logic is only in OrderBook contract");
  console.log("ShareToken, MarketFactory, Oracle don't need changes");
}

main();
