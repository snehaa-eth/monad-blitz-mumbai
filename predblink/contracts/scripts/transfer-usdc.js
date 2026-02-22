const hre = require("hardhat");

async function main() {
  const mockUSDCAddress = "0xF9386589c0d96b4E384Fa2FE7373BA68f13e5980";
  const recipientAddress = "0x3a263ea24497c71eba2146a1090df26da54fd6c9";
  const amount = hre.ethers.parseUnits("1000", 6);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Transferring USDC from:", deployer.address);
  console.log("To:", recipientAddress);
  console.log("Amount:", hre.ethers.formatUnits(amount, 6), "USDC");
  
  const mockUSDC = await hre.ethers.getContractAt(
    ["function transfer(address to, uint256 amount) returns (bool)", "function balanceOf(address) view returns (uint256)", "function name() view returns (string)", "function symbol() view returns (string)"],
    mockUSDCAddress
  );
  
  const name = await mockUSDC.name();
  const symbol = await mockUSDC.symbol();
  console.log("\nToken:", name, `(${symbol})`);
  
  const deployerBalanceBefore = await mockUSDC.balanceOf(deployer.address);
  const recipientBalanceBefore = await mockUSDC.balanceOf(recipientAddress);
  console.log("\nBalances before:");
  console.log("Deployer:", hre.ethers.formatUnits(deployerBalanceBefore, 6), "USDC");
  console.log("Recipient:", hre.ethers.formatUnits(recipientBalanceBefore, 6), "USDC");
  
  console.log("\nTransferring...");
  const tx = await mockUSDC.transfer(recipientAddress, amount);
  await tx.wait();
  
  const deployerBalanceAfter = await mockUSDC.balanceOf(deployer.address);
  const recipientBalanceAfter = await mockUSDC.balanceOf(recipientAddress);
  console.log("\n✅ Balances after:");
  console.log("Deployer:", hre.ethers.formatUnits(deployerBalanceAfter, 6), "USDC");
  console.log("Recipient:", hre.ethers.formatUnits(recipientBalanceAfter, 6), "USDC");
  
  console.log("\n🎉 Success! You now have", hre.ethers.formatUnits(recipientBalanceAfter, 6), "USDC!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
