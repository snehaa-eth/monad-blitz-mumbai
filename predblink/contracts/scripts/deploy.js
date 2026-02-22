const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying PredBlink contracts to", hre.network.name);
  console.log("=".repeat(50));

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // USDC addresses (update these for your network)
  const USDC_TESTNET = "0x64142706680e2707e5D23887505c5DD54855a779"; // MockUSDC on BNB testnet
  const USDC_MAINNET = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"; // BNB mainnet USDC
  const USDC_LOCAL = deployer.address; // For local testing, use deployer as mock USDC

  let usdcAddress;
  if (hre.network.name === "bscTestnet") {
    usdcAddress = USDC_TESTNET;
  } else if (hre.network.name === "bscMainnet") {
    usdcAddress = USDC_MAINNET;
  } else {
    // Local or hardhat network - deploy mock USDC
    console.log("\n📝 Deploying Mock USDC for local testing...");
    const MockUSDC = await hre.ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockUSDC.deploy("Mock USDC", "USDC", 6);
    await mockUSDC.waitForDeployment();
    usdcAddress = await mockUSDC.getAddress();
    console.log("Mock USDC deployed to:", usdcAddress);
  }

  console.log("\n✅ Using USDC at:", usdcAddress);

  // 1. Deploy ShareToken
  console.log("\n📝 Deploying ShareToken...");
  const ShareToken = await hre.ethers.getContractFactory("ShareToken");
  const shareToken = await ShareToken.deploy("https://PredBlink.io/api/metadata/{id}");
  await shareToken.waitForDeployment();
  const shareTokenAddress = await shareToken.getAddress();
  console.log("✅ ShareToken deployed to:", shareTokenAddress);

  // 2. Deploy MarketFactory
  console.log("\n📝 Deploying MarketFactory...");
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(shareTokenAddress, usdcAddress);
  await marketFactory.waitForDeployment();
  const marketFactoryAddress = await marketFactory.getAddress();
  console.log("✅ MarketFactory deployed to:", marketFactoryAddress);

  // 3. Deploy OrderBook
  console.log("\n📝 Deploying OrderBook...");
  const OrderBook = await hre.ethers.getContractFactory("OrderBook");
  const orderBook = await OrderBook.deploy(
    shareTokenAddress,
    usdcAddress,
    marketFactoryAddress,
    deployer.address // Protocol wallet (change this for production)
  );
  await orderBook.waitForDeployment();
  const orderBookAddress = await orderBook.getAddress();
  console.log("✅ OrderBook deployed to:", orderBookAddress);

  // 4. Deploy Oracle
  console.log("\n📝 Deploying Oracle...");
  const Oracle = await hre.ethers.getContractFactory("Oracle");
  const oracle = await Oracle.deploy(marketFactoryAddress);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("✅ Oracle deployed to:", oracleAddress);

  // 5. Set MarketFactory in ShareToken
  console.log("\n📝 Configuring ShareToken...");
  const setFactoryTx = await shareToken.setMarketFactory(marketFactoryAddress);
  await setFactoryTx.wait();
  console.log("✅ MarketFactory set in ShareToken");

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(50));
  console.log("\nContract Addresses:");
  console.log("-------------------");
  console.log("USDC:           ", usdcAddress);
  console.log("ShareToken:     ", shareTokenAddress);
  console.log("MarketFactory:  ", marketFactoryAddress);
  console.log("OrderBook:      ", orderBookAddress);
  console.log("Oracle:         ", oracleAddress);
  console.log("Protocol Wallet:", deployer.address);
  console.log("\n" + "=".repeat(50));

  // Save addresses to file
  const fs = require("fs");
  const addresses = {
    network: hre.network.name,
    usdc: usdcAddress,
    shareToken: shareTokenAddress,
    marketFactory: marketFactoryAddress,
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
