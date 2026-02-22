const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredBlink - Market Creation & Trading", function () {
  let shareToken, marketFactory, orderBook, usdc;
  let owner, scout, trader1, trader2;

  const INITIAL_LIQUIDITY = ethers.parseUnits("10", 6); // 10 USDC
  const SHARES_PER_MARKET = ethers.parseUnits("10", 18); // 10 shares

  beforeEach(async function () {
    [owner, scout, trader1, trader2] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("Mock USDC", "USDC", 6);
    await usdc.waitForDeployment();

    // Deploy ShareToken
    const ShareToken = await ethers.getContractFactory("ShareToken");
    shareToken = await ShareToken.deploy("https://PredBlink.io/api/metadata/{id}");
    await shareToken.waitForDeployment();

    // Deploy MarketFactory
    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    marketFactory = await MarketFactory.deploy(
      await shareToken.getAddress(),
      await usdc.getAddress()
    );
    await marketFactory.waitForDeployment();

    // Deploy OrderBook
    const OrderBook = await ethers.getContractFactory("OrderBook");
    orderBook = await OrderBook.deploy(
      await shareToken.getAddress(),
      await usdc.getAddress(),
      await marketFactory.getAddress(),
      owner.address
    );
    await orderBook.waitForDeployment();

    // Set MarketFactory in ShareToken
    await shareToken.setMarketFactory(await marketFactory.getAddress());

    // Mint USDC to scout and traders
    await usdc.mint(scout.address, ethers.parseUnits("1000", 6));
    await usdc.mint(trader1.address, ethers.parseUnits("1000", 6));
    await usdc.mint(trader2.address, ethers.parseUnits("1000", 6));
  });

  describe("Market Creation", function () {
    it("Should create a market and mint shares to scout", async function () {
      // Scout approves USDC
      await usdc.connect(scout).approve(await marketFactory.getAddress(), INITIAL_LIQUIDITY);

      // Create market
      const tx = await marketFactory.connect(scout).createMarket(
        "https://twitter.com/elonmusk/status/123456",
        0, // VIEWS
        1, // TWENTY_FOUR_HOURS
        10, // 10x multiplier
        50000, // Current value: 50K views
        "123456", // Tweet ID
        "@elonmusk" // Author handle
      );

      await tx.wait();

      // Check market was created
      const market = await marketFactory.getMarket(0);
      expect(market.id).to.equal(0);
      expect(market.scout).to.equal(scout.address);
      expect(market.currentValue).to.equal(50000);
      expect(market.targetValue).to.equal(500000); // 50K * 10x

      // Check shares were minted to scout
      const yesBalance = await shareToken.balanceOf(scout.address, market.yesTokenId);
      const noBalance = await shareToken.balanceOf(scout.address, market.noTokenId);

      expect(yesBalance).to.equal(SHARES_PER_MARKET);
      expect(noBalance).to.equal(SHARES_PER_MARKET);

      // Check USDC was transferred
      const scoutBalance = await usdc.balanceOf(scout.address);
      expect(scoutBalance).to.equal(ethers.parseUnits("990", 6)); // 1000 - 10
    });

    it("Should reject market below minimum threshold", async function () {
      await usdc.connect(scout).approve(await marketFactory.getAddress(), INITIAL_LIQUIDITY);

      // Try to create market with < 10K views
      await expect(
        marketFactory.connect(scout).createMarket(
          "https://twitter.com/someone/status/789",
          0, // VIEWS
          1, // TWENTY_FOUR_HOURS
          2, // 2x
          5000, // Only 5K views (< 10K minimum)
          "789",
          "@someone"
        )
      ).to.be.revertedWith("Tweet must have 10K+ views");
    });

    it("Should reject duplicate market", async function () {
      await usdc.connect(scout).approve(await marketFactory.getAddress(), INITIAL_LIQUIDITY * 2n);

      // Create first market
      await marketFactory.connect(scout).createMarket(
        "https://twitter.com/elonmusk/status/123456",
        0, // VIEWS
        1, // TWENTY_FOUR_HOURS
        10,
        50000,
        "123456",
        "@elonmusk"
      );

      // Try to create duplicate
      await expect(
        marketFactory.connect(scout).createMarket(
          "https://twitter.com/elonmusk/status/123456",
          0, // Same metric
          1, // Same duration
          10, // Same multiplier
          50000,
          "123456", // Same tweet ID
          "@elonmusk"
        )
      ).to.be.revertedWith("Market already exists");
    });
  });

  describe("Fee Distribution", function () {
    it("Should return correct fees before author claims", async function () {
      await usdc.connect(scout).approve(await marketFactory.getAddress(), INITIAL_LIQUIDITY);

      await marketFactory.connect(scout).createMarket(
        "https://twitter.com/elonmusk/status/123456",
        0, 1, 10, 50000, "123456", "@elonmusk"
      );

      const [authorAddr, scoutAddr, authorShare, scoutShare, protocolShare] =
        await marketFactory.getFeeRecipients(0);

      expect(authorAddr).to.equal(ethers.ZeroAddress);
      expect(scoutAddr).to.equal(scout.address);
      expect(authorShare).to.equal(0);
      expect(scoutShare).to.equal(50);
      expect(protocolShare).to.equal(50);
    });

    it("Should return correct fees after author claims", async function () {
      await usdc.connect(scout).approve(await marketFactory.getAddress(), INITIAL_LIQUIDITY);

      await marketFactory.connect(scout).createMarket(
        "https://twitter.com/elonmusk/status/123456",
        0, 1, 10, 50000, "123456", "@elonmusk"
      );

      // Author claims
      await marketFactory.connect(trader1).claimAccount("@elonmusk", "0x");

      const [authorAddr, scoutAddr, authorShare, scoutShare, protocolShare] =
        await marketFactory.getFeeRecipients(0);

      expect(authorAddr).to.equal(trader1.address);
      expect(scoutAddr).to.equal(scout.address);
      expect(authorShare).to.equal(70);
      expect(scoutShare).to.equal(10);
      expect(protocolShare).to.equal(20);
    });
  });

  describe("Token ID Calculation", function () {
    it("Should calculate correct token IDs", async function () {
      expect(await shareToken.getYesTokenId(0)).to.equal(0);
      expect(await shareToken.getNoTokenId(0)).to.equal(1);

      expect(await shareToken.getYesTokenId(1)).to.equal(2);
      expect(await shareToken.getNoTokenId(1)).to.equal(3);

      expect(await shareToken.getMarketId(0)).to.equal(0);
      expect(await shareToken.getMarketId(1)).to.equal(0);
      expect(await shareToken.getMarketId(2)).to.equal(1);

      expect(await shareToken.isYesShare(0)).to.be.true;
      expect(await shareToken.isYesShare(1)).to.be.false;
    });
  });
});
