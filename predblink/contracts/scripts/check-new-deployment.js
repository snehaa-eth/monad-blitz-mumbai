const hre = require("hardhat");

async function main() {
  const marketFactoryAddress = "0xeDe61b1194A2D9C695596eAED97d8CEb587A1F34";

  console.log("Checking MarketFactory at:", marketFactoryAddress);

  const marketFactory = await hre.ethers.getContractAt(
    "MarketFactory",
    marketFactoryAddress
  );

  const nextMarketId = await marketFactory.nextMarketId();
  console.log("Next Market ID (total markets):", nextMarketId.toString());

  if (nextMarketId > 0) {
    console.log("\nFound", nextMarketId.toString(), "markets:");
    for (let i = 0; i < Number(nextMarketId); i++) {
      const market = await marketFactory.getMarket(i);
      console.log(`\nMarket ${i}:`);
      console.log("  Tweet ID:", market.tweetId);
      console.log("  Author:", market.authorHandle);
      console.log("  End Time:", new Date(Number(market.endTime) * 1000).toISOString());
    }
  } else {
    console.log("\n✅ Contract has 0 markets (clean deployment confirmed)");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
