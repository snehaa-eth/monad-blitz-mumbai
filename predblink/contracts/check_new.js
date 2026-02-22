const { ethers } = require("hardhat");

async function main() {
  const marketFactoryAddress = "0xf7fC37078f59123BB2e96fAB578EdD94009c5675";
  console.log("Checking MarketFactory at:", marketFactoryAddress);
  
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = MarketFactory.attach(marketFactoryAddress);
  
  try {
    const nextId = await marketFactory.nextMarketId();
    console.log("nextMarketId:", nextId.toString());
    console.log("Total markets:", Number(nextId));
    
    if (Number(nextId) > 0) {
      console.log("\n❌ WARNING: Markets exist in the contract!");
      for (let i = 0; i < Number(nextId); i++) {
        try {
          const market = await marketFactory.getMarket(i);
          console.log(`\nMarket ${i}:`);
          console.log("  tweetId:", market.tweetId);
          console.log("  endTime:", new Date(Number(market.endTime) * 1000).toISOString());
        } catch (e) {
          console.log(`  Error reading market ${i}:`, e.message);
        }
      }
    } else {
      console.log("\n✅ No markets - contract is clean!");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main().catch(console.error);
