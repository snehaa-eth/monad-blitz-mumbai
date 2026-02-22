const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Deployer address:", signer.address);

  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "BNB");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
