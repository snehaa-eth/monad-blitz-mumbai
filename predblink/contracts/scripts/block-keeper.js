/**
 * Block Keeper — records Monad block snapshots and resolves expired BLOCK_DATA markets.
 *
 * Flow:
 *   1. Calls BlockOracle.recordBlock() every N seconds to snapshot gas/fee data
 *   2. Scans PredBlink for expired BLOCK_DATA markets
 *   3. Calls MarketResolver.resolve(marketId) which reads BlockOracle automatically
 *
 * Usage:
 *   node scripts/block-keeper.js --interval 5
 *
 * Env:
 *   PRIVATE_KEY     — keeper wallet private key
 *   MONAD_RPC_URL   — default https://testnet-rpc.monad.xyz
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const INTERVAL = process.argv.includes("--interval") ?
    parseInt(process.argv[process.argv.indexOf("--interval") + 1]) : 5;
const RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

// ── ABI fragments ───────────────────────────

const BLOCK_ORACLE_ABI = [
    "function recordBlock() external",
    "function latestGasPrice() external view returns (uint256)",
    "function latestBaseFee() external view returns (uint256)",
    "function latestBlockNumber() external view returns (uint256)",
    "function latestTimestamp() external view returns (uint256)",
    "function snapshotCount() external view returns (uint256)",
];

const PREDBLINK_ABI = [
    "function marketCount() external view returns (uint256)",
    "function isExpired(uint256 id) external view returns (bool)",
    "function getMarketCore(uint256 id) external view returns (uint8 marketType, bytes32 feedId, uint256 targetValue, uint256 snapshotValue, uint256 endTime, uint256 endBlock, uint8 status, uint256 resolvedValue)",
];

const RESOLVER_ABI = [
    "function resolve(uint256 marketId) external",
    "function resolveWithFeed(uint256 marketId, bytes32 oracleFeedId) external",
];

function loadAddresses() {
    const p = path.join(__dirname, "..", "deployed-predblink.json");
    if (!fs.existsSync(p)) {
        console.error("deployed-predblink.json not found. Run deploy first.");
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(p, "utf-8"));
}

// ── Record block snapshot ───────────────────

async function recordSnapshot(blockOracle) {
    try {
        const tx = await blockOracle.recordBlock();
        const receipt = await tx.wait();

        const gasPrice = await blockOracle.latestGasPrice();
        const baseFee  = await blockOracle.latestBaseFee();
        const blockNum = await blockOracle.latestBlockNumber();
        const count    = await blockOracle.snapshotCount();

        console.log(`  Block #${blockNum}: gas=${ethers.formatUnits(gasPrice, "gwei")} gwei, ` +
                     `baseFee=${ethers.formatUnits(baseFee, "gwei")} gwei ` +
                     `(snapshot #${count}, tx: ${receipt.hash.slice(0, 10)}...)`);
    } catch (err) {
        console.error("  recordBlock failed:", err.message);
    }
}

// ── Resolve expired BLOCK_DATA markets ──────

async function resolveBlockMarkets(predBlink, resolver) {
    const count = await predBlink.marketCount();
    let resolved = 0;

    for (let i = 0; i < count; i++) {
        const [marketType, feedId, , , , , status] = await predBlink.getMarketCore(i);

        // marketType 2 = BLOCK_DATA, status 0 = ACTIVE
        if (Number(marketType) !== 2 || Number(status) !== 0) continue;

        const expired = await predBlink.isExpired(i);
        if (!expired) continue;

        console.log(`  Market #${i}: BLOCK_DATA, expired — resolving...`);

        try {
            // Use resolveWithFeed to pass the correct oracle feed key
            // PredBlink stores keccak256("BLOCK:GAS_PRICE"), but BlockOracle expects keccak256("GAS_PRICE")
            // Extract the metric name from the feedId by trying known feeds
            const GAS_FEED   = ethers.keccak256(ethers.toUtf8Bytes("GAS_PRICE"));
            const FEE_FEED   = ethers.keccak256(ethers.toUtf8Bytes("BASE_FEE"));
            const BLOCK_FEED = ethers.keccak256(ethers.toUtf8Bytes("BLOCK_NUMBER"));

            // The feedId in PredBlink is keccak256("BLOCK:GAS_PRICE") etc.
            // We need the oracle's native key — try all three known block feeds
            let oracleFeedId;
            const blockGas = ethers.keccak256(ethers.toUtf8Bytes("BLOCK:GAS_PRICE"));
            const blockFee = ethers.keccak256(ethers.toUtf8Bytes("BLOCK:BASE_FEE"));

            if (feedId === blockGas) {
                oracleFeedId = GAS_FEED;
            } else if (feedId === blockFee) {
                oracleFeedId = FEE_FEED;
            } else {
                oracleFeedId = BLOCK_FEED;
            }

            const tx = await resolver.resolveWithFeed(i, oracleFeedId);
            const receipt = await tx.wait();
            console.log(`    Resolved: ${receipt.hash}`);
            resolved++;
        } catch (err) {
            console.error(`    Failed:`, err.message);
        }
    }

    if (resolved > 0) {
        console.log(`  Resolved ${resolved} BLOCK_DATA markets\n`);
    }
}

// ── Main loop ───────────────────────────────

async function tick(blockOracle, predBlink, resolver) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] Recording block & checking markets...`);

    await recordSnapshot(blockOracle);
    await resolveBlockMarkets(predBlink, resolver);
}

async function main() {
    console.log("╔═══════════════════════════════════════════╗");
    console.log("║   PredBlink Block Keeper (Monad RPC)      ║");
    console.log("╚═══════════════════════════════════════════╝");
    console.log(`Interval: ${INTERVAL}s\n`);

    const addrs = loadAddresses();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const blockOracle = new ethers.Contract(addrs.blockOracle, BLOCK_ORACLE_ABI, wallet);
    const predBlink   = new ethers.Contract(addrs.predBlink, PREDBLINK_ABI, wallet);
    const resolver    = new ethers.Contract(addrs.marketResolver, RESOLVER_ABI, wallet);

    console.log(`Keeper:      ${wallet.address}`);
    console.log(`BlockOracle: ${addrs.blockOracle}`);
    console.log(`PredBlink:   ${addrs.predBlink}`);
    console.log(`Resolver:    ${addrs.marketResolver}\n`);

    await tick(blockOracle, predBlink, resolver);

    setInterval(async () => {
        try {
            await tick(blockOracle, predBlink, resolver);
        } catch (err) {
            console.error(`[${new Date().toISOString()}] Error:`, err.message);
        }
    }, INTERVAL * 1000);
}

main().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});
