const hre = require("hardhat");

async function main() {
  const marketFactoryAddress = "0x3ffB880761A8E9c0cDF40718AC8BAEFEf40aC627";
  
  console.log("Checking markets on MarketFactory:", marketFactoryAddress);
  
  const marketFactory = await hre.ethers.getContractAt("MarketFactory", marketFactoryAddress);
  
  try {
    // Try to get market count
    const marketCount = await marketFactory.marketCount();
    console.log("\nTotal markets created:", marketCount.toString());
    
    if (marketCount > 0) {
      console.log("\nMarkets:");
      for (let i = 0; i < marketCount; i++) {
        try {
          const marketId = await marketFactory.markets(i);
          const market = await marketFactory.marketDetails(marketId);
          console.log(`\nMarket #${i}:`);
          console.log("  ID:", marketId);
          console.log("  Tweet URL:", market.tweetUrl || "N/A");
          console.log("  Status:", market.status);
        } catch (err) {
          console.log(`  Error fetching market #${i}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
    console.log("\nTrying alternative methods...");
    
    // Try to call marketCount with different approaches
    try {
      const code = await hre.ethers.provider.getCode(marketFactoryAddress);
      console.log("Contract exists:", code !== "0x");
    } catch (e) {
      console.error("Error checking contract:", e.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
