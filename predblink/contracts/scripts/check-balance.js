const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "BNB");
  console.log("Balance in wei:", balance.toString());
  
  if (balance > hre.ethers.parseEther("0.05")) {
    console.log("\n✅ Sufficient BNB for deployment!");
  } else {
    console.log("\n⚠️ May need more BNB for full deployment");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
