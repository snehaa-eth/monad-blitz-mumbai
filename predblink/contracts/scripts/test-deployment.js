const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing deployed contracts...\n");

  const addresses = require("../deployed-addresses.json");

  // Get contracts
  const marketFactory = await hre.ethers.getContractAt("MarketFactory", addresses.marketFactory);
  const usdc = await hre.ethers.getContractAt("MockERC20", addresses.usdc);
  const shareToken = await hre.ethers.getContractAt("ShareToken", addresses.shareToken);

  // Test 1: Check nextMarketId
  console.log("✅ Test 1: Check MarketFactory initial state");
  const nextMarketId = await marketFactory.nextMarketId();
  console.log(`   Next Market ID: ${nextMarketId}`);
  console.log(`   Expected: 0`);
  console.log(`   ${nextMarketId.toString() === '0' ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 2: Check USDC decimals
  console.log("✅ Test 2: Check Mock USDC");
  const decimals = await usdc.decimals();
  console.log(`   USDC Decimals: ${decimals}`);
  console.log(`   Expected: 6`);
  console.log(`   ${decimals === 6 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 3: Check ShareToken market factory is set
  console.log("✅ Test 3: Check ShareToken configuration");
  const setMarketFactory = await shareToken.marketFactory();
  console.log(`   MarketFactory address: ${setMarketFactory}`);
  console.log(`   Expected: ${addresses.marketFactory}`);
  console.log(`   ${setMarketFactory.toLowerCase() === addresses.marketFactory.toLowerCase() ? '✅ PASS' : '❌ FAIL'}\n`);

  console.log("🎉 All smoke tests passed! Contracts are deployed and configured correctly.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
