const hre = require("hardhat");

async function main() {
  const usdcAddress = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  
  // Get the contract at the address without needing the full ABI
  const usdc = await hre.ethers.getContractAt(
    ["function name() view returns (string)", "function symbol() view returns (string)", "function decimals() view returns (uint8)", "function mint(address to, uint256 amount)", "function balanceOf(address) view returns (uint256)"],
    usdcAddress
  );
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Your address:", signer.address);
  
  try {
    console.log("USDC Name:", await usdc.name());
    console.log("USDC Symbol:", await usdc.symbol());
    console.log("USDC Decimals:", await usdc.decimals());
    
    // Check your balance
    const balance = await usdc.balanceOf(signer.address);
    console.log("Your USDC Balance:", hre.ethers.formatUnits(balance, 6));
    
    // Try to mint some USDC
    console.log("\nAttempting to mint 1000 USDC...");
    const tx = await usdc.mint(signer.address, hre.ethers.parseUnits("1000", 6));
    await tx.wait();
    
    const newBalance = await usdc.balanceOf(signer.address);
    console.log("New USDC Balance:", hre.ethers.formatUnits(newBalance, 6));
    console.log("✅ Successfully minted USDC!");
    
  } catch (error) {
    console.log("❌ Error:", error.message);
    
    if (error.message.includes("mint")) {
      console.log("\nThe testnet USDC doesn't have a public mint function.");
      console.log("Let's deploy our own mock USDC instead.");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
