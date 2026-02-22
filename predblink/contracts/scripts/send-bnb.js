const hre = require("hardhat");

async function main() {
  const recipientAddress = "0x3a263ea24497c71eba2146a1090df26da54fd6c9";
  const amount = hre.ethers.parseEther("0.05"); // 0.05 BNB (~$30 worth, enough for many transactions)
  
  const [sender] = await hre.ethers.getSigners();
  console.log("Sending BNB from:", sender.address);
  console.log("To:", recipientAddress);
  console.log("Amount:", hre.ethers.formatEther(amount), "BNB");
  
  // Check sender balance
  const senderBalance = await hre.ethers.provider.getBalance(sender.address);
  console.log("\nSender balance:", hre.ethers.formatEther(senderBalance), "BNB");
  
  if (senderBalance < amount) {
    throw new Error("Insufficient BNB in sender wallet");
  }
  
  // Check recipient balance before
  const recipientBalanceBefore = await hre.ethers.provider.getBalance(recipientAddress);
  console.log("Recipient balance before:", hre.ethers.formatEther(recipientBalanceBefore), "BNB");
  
  // Send BNB
  console.log("\nSending...");
  const tx = await sender.sendTransaction({
    to: recipientAddress,
    value: amount
  });
  
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  
  // Check recipient balance after
  const recipientBalanceAfter = await hre.ethers.provider.getBalance(recipientAddress);
  console.log("\n✅ Recipient balance after:", hre.ethers.formatEther(recipientBalanceAfter), "BNB");
  
  console.log("\n🎉 Success! You now have BNB for gas fees!");
  console.log("You can now approve USDC and create markets!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
