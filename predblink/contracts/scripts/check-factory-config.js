const hre = require("hardhat");

async function main() {
  const marketFactoryAddress = "0x3ffB880761A8E9c0cDF40718AC8BAEFEf40aC627";
  const expectedUSDC = "0x64142706680e2707e5D23887505c5DD54855a779";
  
  console.log("Checking MarketFactory configuration...");
  console.log("MarketFactory:", marketFactoryAddress);
  
  const marketFactory = await hre.ethers.getContractAt(
    ["function collateralToken() view returns (address)", "function shareToken() view returns (address)"],
    marketFactoryAddress
  );
  
  const actualUSDC = await marketFactory.collateralToken();
  const shareToken = await marketFactory.shareToken();
  
  console.log("\nConfigured USDC:", actualUSDC);
  console.log("Expected USDC:", expectedUSDC);
  console.log("ShareToken:", shareToken);
  
  if (actualUSDC.toLowerCase() !== expectedUSDC.toLowerCase()) {
    console.log("\n🚨 MISMATCH! MarketFactory is using a different USDC contract!");
    console.log("This is why transactions are failing - the contract needs to be redeployed.");
  } else {
    console.log("\n✅ USDC addresses match!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
