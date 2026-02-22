const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying MockUSDC with account:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB");
  
  if (balance < hre.ethers.parseEther("0.001")) {
    throw new Error("Insufficient BNB for deployment");
  }
  
  // Deploy MockUSDC
  console.log("\nDeploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", mockUSDCAddress);
  
  // Mint initial supply for deployer
  console.log("\nMinting 100,000 USDC for deployer...");
  const mintTx = await mockUSDC.mint(deployer.address, hre.ethers.parseUnits("100000", 6));
  await mintTx.wait();
  
  const balance_usdc = await mockUSDC.balanceOf(deployer.address);
  console.log("✅ Deployer USDC balance:", hre.ethers.formatUnits(balance_usdc, 6));
  
  // Save addresses
  const addresses = {
    network: "bscTestnet",
    mockUSDC: mockUSDCAddress,
    deployer: deployer.address
  };
  
  const addressesPath = path.join(__dirname, "../deployed-mock-usdc.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("\n✅ Addresses saved to:", addressesPath);
  
  console.log("\n📝 Update your .env.local with:");
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${mockUSDCAddress}`);
  
  console.log("\n🎉 Deployment complete!");
  console.log("\nYou can now mint USDC by calling:");
  console.log(`mockUSDC.mint(yourAddress, amount)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
