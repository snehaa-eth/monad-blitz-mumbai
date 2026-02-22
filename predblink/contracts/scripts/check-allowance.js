const hre = require("hardhat");

async function main() {
  const usdcAddress = "0x64142706680e2707e5D23887505c5DD54855a779";
  const walletAddress = "0xD59D85C97fCA768B35c781779d0a9e0e6b177F0a";
  const marketFactoryAddress = "0x3ffB880761A8E9c0cDF40718AC8BAEFEf40aC627";
  
  console.log("Checking USDC allowance...");
  console.log("USDC:", usdcAddress);
  console.log("User wallet:", walletAddress);
  console.log("MarketFactory:", marketFactoryAddress);
  
  const mockUSDC = await hre.ethers.getContractAt(
    ["function allowance(address owner, address spender) view returns (uint256)", "function decimals() view returns (uint8)"],
    usdcAddress
  );
  
  const decimals = await mockUSDC.decimals();
  const allowance = await mockUSDC.allowance(walletAddress, marketFactoryAddress);
  
  console.log("\nCurrent allowance:", hre.ethers.formatUnits(allowance, decimals), "USDC");
  console.log("Required for market:", "10 USDC");
  
  if (allowance < hre.ethers.parseUnits("10", decimals)) {
    console.log("\n❌ Insufficient allowance! MarketFactory cannot spend your USDC.");
    console.log("This is why the transaction failed.");
    console.log("\nThe approval transaction from the frontend needs to succeed first.");
  } else {
    console.log("\n✅ Sufficient allowance!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
