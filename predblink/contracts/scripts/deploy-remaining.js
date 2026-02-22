const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying remaining PredBlink contracts to", hre.network.name);
  console.log("=".repeat(50));

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Already deployed addresses
  const USDC_ADDRESS = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  const SHARE_TOKEN_ADDRESS = "0xA9dC1aBD1Bef785f9cE7a369836Bc0678e24CD97";
  const MARKET_FACTORY_ADDRESS = "0x6BAad96CDf18014AFD790fA80B64f1AcF259c115";

  console.log("\n✅ Using existing contracts:");
  console.log("USDC:          ", USDC_ADDRESS);
  console.log("ShareToken:    ", SHARE_TOKEN_ADDRESS);
  console.log("MarketFactory: ", MARKET_FACTORY_ADDRESS);

  // Deploy OrderBook
  console.log("\n📝 Deploying OrderBook...");
  const OrderBook = await hre.ethers.getContractFactory("OrderBook");
  const orderBook = await OrderBook.deploy(
    SHARE_TOKEN_ADDRESS,
    USDC_ADDRESS,
    MARKET_FACTORY_ADDRESS,
    deployer.address // Protocol wallet
  );
  await orderBook.waitForDeployment();
  const orderBookAddress = await orderBook.getAddress();
  console.log("✅ OrderBook deployed to:", orderBookAddress);

  // Deploy Oracle
  console.log("\n📝 Deploying Oracle...");
  const Oracle = await hre.ethers.getContractFactory("Oracle");
  const oracle = await Oracle.deploy(MARKET_FACTORY_ADDRESS);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("✅ Oracle deployed to:", oracleAddress);

  // Configure ShareToken
  console.log("\n📝 Configuring ShareToken...");
  const shareToken = await hre.ethers.getContractAt("ShareToken", SHARE_TOKEN_ADDRESS);
  const setFactoryTx = await shareToken.setMarketFactory(MARKET_FACTORY_ADDRESS);
  await setFactoryTx.wait();
  console.log("✅ MarketFactory set in ShareToken");

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(50));
  console.log("\nAll Contract Addresses:");
  console.log("------------------------");
  console.log("USDC:           ", USDC_ADDRESS);
  console.log("ShareToken:     ", SHARE_TOKEN_ADDRESS);
  console.log("MarketFactory:  ", MARKET_FACTORY_ADDRESS);
  console.log("OrderBook:      ", orderBookAddress);
  console.log("Oracle:         ", oracleAddress);
  console.log("Protocol Wallet:", deployer.address);
  console.log("\n" + "=".repeat(50));

  // Save addresses to file
  const fs = require("fs");
  const addresses = {
    network: hre.network.name,
    usdc: USDC_ADDRESS,
    shareToken: SHARE_TOKEN_ADDRESS,
    marketFactory: MARKET_FACTORY_ADDRESS,
    orderBook: orderBookAddress,
    oracle: oracleAddress,
    protocolWallet: deployer.address,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    "deployed-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n✅ Addresses saved to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
