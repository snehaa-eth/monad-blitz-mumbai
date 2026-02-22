const hre = require("hardhat");

async function main() {
  const mockUSDCAddress = "0x64142706680e2707e5D23887505c5DD54855a779"; // MockUSDC address from deployment
  // Use environment variable or default address
  const recipientAddress = process.env.RECIPIENT_ADDRESS || "0xD59D85C97fCA768B35c781779d0a9e0e6b177F0a";
  const amount = hre.ethers.parseUnits("1000", 6); // 1000 USDC
  
  console.log("Minting USDC...");
  console.log("MockUSDC:", mockUSDCAddress);
  console.log("Recipient:", recipientAddress);
  console.log("Amount:", hre.ethers.formatUnits(amount, 6), "USDC");
  
  const mockUSDC = await hre.ethers.getContractAt(
    ["function mint(address to, uint256 amount)", "function balanceOf(address) view returns (uint256)", "function name() view returns (string)", "function symbol() view returns (string)"],
    mockUSDCAddress
  );
  
  const name = await mockUSDC.name();
  const symbol = await mockUSDC.symbol();
  console.log("\nToken:", name, `(${symbol})`);
  
  // Check current balance
  const balanceBefore = await mockUSDC.balanceOf(recipientAddress);
  console.log("Balance before:", hre.ethers.formatUnits(balanceBefore, 6), "USDC");
  
  // Mint
  console.log("\nMinting...");
  const tx = await mockUSDC.mint(recipientAddress, amount);
  await tx.wait();
  
  // Check new balance
  const balanceAfter = await mockUSDC.balanceOf(recipientAddress);
  console.log("✅ Balance after:", hre.ethers.formatUnits(balanceAfter, 6), "USDC");
  
  console.log("\n🎉 Success! You now have", hre.ethers.formatUnits(balanceAfter, 6), "USDC to create markets!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
