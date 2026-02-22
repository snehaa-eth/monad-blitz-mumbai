/**
 * Seed PredBlink with demo markets for UI testing.
 * Creates: 3 PRICE markets, 2 TWITTER markets, 1 BLOCK_DATA market.
 *
 * Usage:
 *   npx hardhat run scripts/seed-markets.js --network monadTestnet
 */

require("dotenv").config();
const hre = require("hardhat");

const ADDRESSES = {
    mockUSDC:  "0xa3823ef745DD8Df93222C4dA74665E9Ce515dAeF",
    predBlink: "0x3adc0beB3B447878a156BB15E1179267cc225553",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function toUsdcWei(amount) {
    return hre.ethers.parseUnits(String(amount), 6);
}

async function approve(usdc, spender, amount) {
    const tx = await usdc.approve(spender, amount);
    await tx.wait();
}

async function createPrice(pb, pair, targetUsd, durationMin, question) {
    const targetPrice = BigInt(Math.floor(targetUsd * 1e8));
    const duration    = BigInt(durationMin * 60);
    const tx = await pb.createPriceMarket(pair, targetPrice, duration, question);
    const receipt = await tx.wait();
    const ev = receipt.logs.find(l => {
        try { return pb.interface.parseLog(l)?.name === "MarketCreated"; } catch { return false; }
    });
    const id = ev ? pb.interface.parseLog(ev).args.id : "?";
    console.log(`  ✅ PRICE  #${id}  ${pair} > $${targetUsd.toLocaleString()} in ${durationMin}min`);
    return id;
}

async function createTwitter(pb, tweetId, metric, target, durationMin, question, handle, name, text, avatar) {
    // metric: 0=VIEWS 1=LIKES 2=RETWEETS 3=COMMENTS
    const tx = await pb.createTwitterMarket(
        tweetId, metric, BigInt(target), BigInt(durationMin * 60),
        question, handle, name, text, avatar
    );
    const receipt = await tx.wait();
    const ev = receipt.logs.find(l => {
        try { return pb.interface.parseLog(l)?.name === "MarketCreated"; } catch { return false; }
    });
    const id = ev ? pb.interface.parseLog(ev).args.id : "?";
    const metricNames = ["VIEWS", "LIKES", "RETWEETS", "COMMENTS"];
    console.log(`  ✅ TWEET  #${id}  @${handle} — ${metricNames[metric]} > ${target.toLocaleString()} in ${durationMin}min`);
    return id;
}

async function createBlock(pb, metricName, targetWei, blockInterval, question) {
    const tx = await pb.createBlockMarket(metricName, BigInt(targetWei), BigInt(blockInterval), question);
    const receipt = await tx.wait();
    const ev = receipt.logs.find(l => {
        try { return pb.interface.parseLog(l)?.name === "MarketCreated"; } catch { return false; }
    });
    const id = ev ? pb.interface.parseLog(ev).args.id : "?";
    console.log(`  ✅ BLOCK  #${id}  ${metricName} > ${targetWei} in ${blockInterval} blocks`);
    return id;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log("\n" + "=".repeat(60));
    console.log("  SEEDING PREDBLINK WITH DEMO MARKETS");
    console.log("=".repeat(60) + "\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const usdc = await hre.ethers.getContractAt([
        "function approve(address,uint256) returns (bool)",
        "function balanceOf(address) view returns (uint256)",
        "function mint(address,uint256)",
    ], ADDRESSES.mockUSDC);

    const pb = await hre.ethers.getContractAt("PredBlink", ADDRESSES.predBlink);

    // Check / mint USDC if needed (need 10 USDC per market × 6 markets = 60 USDC)
    const bal = await usdc.balanceOf(deployer.address);
    console.log("USDC balance:", hre.ethers.formatUnits(bal, 6));
    if (bal < toUsdcWei(100)) {
        console.log("  Minting 10,000 USDC to deployer...");
        await (await usdc.mint(deployer.address, toUsdcWei(10_000))).wait();
        console.log("  Minted.");
    }

    // Approve a large amount once
    console.log("\nApproving USDC...");
    await approve(usdc, ADDRESSES.predBlink, toUsdcWei(10_000));
    console.log("  Approved 10,000 USDC\n");

    // ── PRICE markets ─────────────────────────────────────────────────────────
    console.log("Creating PRICE markets...");

    await createPrice(pb,
        "BTC/USD",
        95_000,       // target $95,000
        120,          // 2 hours
        "Will BTC close above $95,000 in the next 2 hours?"
    );

    await createPrice(pb,
        "ETH/USD",
        2_800,
        90,
        "Will ETH break $2,800 in the next 90 minutes?"
    );

    await createPrice(pb,
        "MON/USD",
        5,
        60,
        "Will MON hit $5 in the next hour?"
    );

    // ── TWITTER markets ───────────────────────────────────────────────────────
    console.log("\nCreating TWITTER markets...");

    // Elon Musk style tweet - VIEWS
    await createTwitter(pb,
        "1882345678901234567",   // fake tweet ID
        0,                       // VIEWS
        5_000_000,               // 5M views target
        120,
        "Will this viral tweet hit 5M views in 2 hours?",
        "elonmusk",
        "Elon Musk",
        "The thing I love most about Monad is that it actually delivers on the promises of crypto.",
        "https://pbs.twimg.com/profile_images/1590968738358079488/IY9Gx6Ok_400x400.jpg"
    );

    // Vitalik tweet - LIKES
    await createTwitter(pb,
        "1882345678901234568",   // different ID = different market
        1,                       // LIKES
        50_000,                  // 50k likes target
        180,
        "Will Vitalik's tweet hit 50k likes in 3 hours?",
        "VitalikButerin",
        "Vitalik Buterin",
        "Excited to see what builders create on Monad. The parallelization story is very compelling for DeFi.",
        "https://pbs.twimg.com/profile_images/977496875887558661/L86xyLF4_400x400.jpg"
    );

    // ── BLOCK_DATA market ─────────────────────────────────────────────────────
    console.log("\nCreating BLOCK_DATA market...");

    await createBlock(pb,
        "GAS_PRICE",
        hre.ethers.parseUnits("50", "gwei"),   // 50 gwei target
        1000,                                  // 1000 blocks
        "Will Monad gas price exceed 50 gwei within 1000 blocks?"
    );

    // ── Summary ───────────────────────────────────────────────────────────────
    const count = await pb.marketCount();
    console.log("\n" + "=".repeat(60));
    console.log(`  DONE — ${count} total markets on-chain`);
    console.log("  Open the UI and hit REFRESH to see them!");
    console.log("=".repeat(60) + "\n");
}

main()
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
