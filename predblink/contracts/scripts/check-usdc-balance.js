const hre = require("hardhat");

async function main() {
  const usdcAddress = "0x64142706680e2707e5D23887505c5DD54855a779";
  const walletAddress = "0xD59D85C97fCA768B35c781779d0a9e0e6b177F0a"; // User's wallet from MetaMask
  
  console.log("Checking USDC balance...");
  console.log("MockUSDC:", usdcAddress);
  console.log("Wallet:", walletAddress);
  
  const mockUSDC = await hre.ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)", "function mint(address to, uint256 amount)", "function name() view returns (string)", "function symbol() view returns (string)", "function decimals() view returns (uint8)"],
    usdcAddress
  );
  
  const name = await mockUSDC.name();
  const symbol = await mockUSDC.symbol();
  const decimals = await mockUSDC.decimals();
  console.log(`\nToken: ${name} (${symbol}) - ${decimals} decimals`);
  
  const balance = await mockUSDC.balanceOf(walletAddress);
  console.log("Current balance:", hre.ethers.formatUnits(balance, decimals), symbol);
  
  if (balance === 0n) {
    console.log("\n🚨 Balance is ZERO! Minting 10000 USDC...");
    const amount = hre.ethers.parseUnits("10000", decimals);
    const tx = await mockUSDC.mint(walletAddress, amount);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    
    const newBalance = await mockUSDC.balanceOf(walletAddress);
    console.log("✅ New balance:", hre.ethers.formatUnits(newBalance, decimals), symbol);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
