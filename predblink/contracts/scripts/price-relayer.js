/**
 * Price Relayer — fetches prices from Pyth Hermes API and pushes to PriceOracle.
 *
 * Two modes:
 *   --mode pyth     Uses on-chain Pyth (updateFromPyth). Requires Pyth contract on Monad.
 *   --mode manual   Parses Pyth REST response and calls submitPrice() directly.
 *                   No on-chain Pyth dependency — perfect for testnet / dev.
 *
 * Usage:
 *   node scripts/price-relayer.js --mode manual --interval 10
 *   node scripts/price-relayer.js --mode pyth   --interval 15
 *
 * Env:
 *   PRIVATE_KEY     — relayer wallet private key
 *   MONAD_RPC_URL   — default https://testnet-rpc.monad.xyz
 */

require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// ── Pyth Hermes endpoints ──────────────────
const HERMES_BASE = "https://hermes.pyth.network";

// Pyth price feed IDs (mainnet/stable)
const PYTH_FEED_IDS = {
    "BTC/USD": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    "ETH/USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    "MON/USD": "0x4ef5c05f1de389dbe4cf29ab80e6de509c63e894b1b8503d3c187cdd84903607",
};

// ── Config ──────────────────────────────────

const MODE     = process.argv.includes("--mode") ?
    process.argv[process.argv.indexOf("--mode") + 1] : "manual";
const INTERVAL = process.argv.includes("--interval") ?
    parseInt(process.argv[process.argv.indexOf("--interval") + 1]) : 15;

const RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

// ── ABI fragments ───────────────────────────

const PRICE_ORACLE_ABI = [
    "function submitPrice(bytes32 feedId, uint256 price) external",
    "function submitPrices(bytes32[] calldata feedIds, uint256[] calldata prices) external",
    "function updateFromPyth(bytes32 feedId, bytes[] calldata priceUpdate) external payable",
    "function batchUpdateFromPyth(bytes32[] calldata feedIds, bytes[] calldata priceUpdate) external payable",
    "function feeds(bytes32) external view returns (uint256 price, uint256 updatedAt, bool active)",
    "function getPriceByPair(string calldata pair) external view returns (uint256 price, uint256 updatedAt)",
];

// ── Load deployed addresses ─────────────────

function loadAddresses() {
    const p = path.join(__dirname, "..", "deployed-predblink.json");
    if (!fs.existsSync(p)) {
        console.error("deployed-predblink.json not found. Run deploy first.");
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(p, "utf-8"));
}

// ── Pyth Hermes API ─────────────────────────

async function fetchPythPrices(pairs) {
    const ids = pairs.map(p => PYTH_FEED_IDS[p]).filter(Boolean);
    if (ids.length === 0) return [];

    const params = ids.map(id => `ids[]=${id}`).join("&");
    const url = `${HERMES_BASE}/v2/updates/price/latest?${params}`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Hermes API error: ${resp.status}`);

    const data = await resp.json();
    return data;
}

function parsePythPrice(parsed) {
    const price = parseInt(parsed.price.price);
    const expo  = parseInt(parsed.price.expo);

    // Convert to 8-decimal USD
    const TARGET_EXPO = -8;
    let price8dec;
    if (expo === TARGET_EXPO) {
        price8dec = BigInt(Math.abs(price));
    } else if (expo > TARGET_EXPO) {
        const factor = 10 ** (expo - TARGET_EXPO);
        price8dec = BigInt(Math.abs(price)) * BigInt(factor);
    } else {
        const factor = 10 ** (TARGET_EXPO - expo);
        price8dec = BigInt(Math.abs(price)) / BigInt(factor);
    }

    return price8dec;
}

// ── Manual mode: parse off-chain, push via submitPrice ──

async function runManualMode(oracle, pairs) {
    console.log(`[${new Date().toISOString()}] Fetching prices from Pyth Hermes...`);

    const data = await fetchPythPrices(pairs);
    const parsed = data.parsed;
    if (!parsed || parsed.length === 0) {
        console.log("  No prices returned");
        return;
    }

    const feedIds = [];
    const prices  = [];

    for (const entry of parsed) {
        const pythId = "0x" + entry.id;
        const pair = Object.entries(PYTH_FEED_IDS)
            .find(([, v]) => v.toLowerCase() === pythId.toLowerCase());
        if (!pair) continue;

        const price8dec = parsePythPrice(entry);
        const feedId = ethers.keccak256(ethers.toUtf8Bytes(pair[0]));

        feedIds.push(feedId);
        prices.push(price8dec);

        const priceUsd = Number(price8dec) / 1e8;
        console.log(`  ${pair[0]}: $${priceUsd.toLocaleString()} (${price8dec.toString()} raw)`);
    }

    if (feedIds.length === 0) return;

    try {
        const tx = await oracle.submitPrices(feedIds, prices);
        const receipt = await tx.wait();
        console.log(`  TX: ${receipt.hash} (gas: ${receipt.gasUsed.toString()})`);
    } catch (err) {
        console.error("  Submit failed:", err.message);
    }
}

// ── Pyth mode: pass VAA to on-chain Pyth ────

async function runPythMode(oracle, pairs) {
    console.log(`[${new Date().toISOString()}] Fetching VAA from Pyth Hermes...`);

    const data = await fetchPythPrices(pairs);
    const vaaData = data.binary?.data;
    if (!vaaData || vaaData.length === 0) {
        console.log("  No VAA data returned");
        return;
    }

    const priceUpdate = vaaData.map(d => "0x" + Buffer.from(d, "base64").toString("hex"));

    for (const pair of pairs) {
        const feedId = ethers.keccak256(ethers.toUtf8Bytes(pair));
        try {
            const tx = await oracle.updateFromPyth(feedId, priceUpdate, {
                value: ethers.parseEther("0.001"),
            });
            const receipt = await tx.wait();
            console.log(`  ${pair}: TX ${receipt.hash}`);
        } catch (err) {
            console.error(`  ${pair} failed:`, err.message);
        }
    }
}

// ── Main ────────────────────────────────────

async function main() {
    console.log("╔═══════════════════════════════════════════╗");
    console.log("║   PredBlink Price Relayer (Pyth Hermes)   ║");
    console.log("╚═══════════════════════════════════════════╝");
    console.log(`Mode:     ${MODE}`);
    console.log(`Interval: ${INTERVAL}s\n`);

    const addrs = loadAddresses();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const oracle = new ethers.Contract(addrs.priceOracle, PRICE_ORACLE_ABI, wallet);

    console.log(`Relayer:  ${wallet.address}`);
    console.log(`Oracle:   ${addrs.priceOracle}\n`);

    const pairs = ["BTC/USD", "ETH/USD", "MON/USD"];

    const run = MODE === "pyth" ? runPythMode : runManualMode;

    // Initial run
    await run(oracle, pairs);

    // Loop
    setInterval(async () => {
        try {
            await run(oracle, pairs);
        } catch (err) {
            console.error(`[${new Date().toISOString()}] Error:`, err.message);
        }
    }, INTERVAL * 1000);
}

main().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});
