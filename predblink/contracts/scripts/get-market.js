const hre = require("hardhat");

async function main() {
  const marketFactoryAddress = "0x9Da9f70aF49dC464B7aec4646212875c59B1D82C";
  
  console.log("Checking new MarketFactory:", marketFactoryAddress);
  
  const marketFactory = await hre.ethers.getContractAt("MarketFactory", marketFactoryAddress);
  
  try {
    const nextMarketId = await marketFactory.nextMarketId();
    console.log("\n✅ nextMarketId:", nextMarketId.toString());
    console.log("Total markets created:", (nextMarketId - 1n).toString());
    
    if (nextMarketId > 0n) {
      for (let i = 0n; i < nextMarketId; i++) {
        try {
          const market = await marketFactory.markets(i);
          console.log(`\nMarket #${i}:`);
          console.log("  ID:", market.id?.toString());
          console.log("  Tweet URL:", market.tweetUrl);
          console.log("  Metric:", market.metric);
          console.log("  Author:", market.authorHandle);
        } catch (err) {
          console.log(`  Error fetching market #${i}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
