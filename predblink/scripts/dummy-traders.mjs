/**
 * dummy-traders.mjs  (parallel version — much faster)
 *
 * Usage:
 *   FUNDER_PRIVATE_KEY=0x... node scripts/dummy-traders.mjs
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  parseUnits,
  formatEther,
  formatUnits,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL     = process.env.RPC_URL          || 'https://testnet-rpc.monad.xyz';
const NUM_TRADERS = parseInt(process.env.NUM_TRADERS || '25');
const MON_GAS     = process.env.MON_PER_TRADER   || '0.2';
const USDC_MINT   = process.env.USDC_PER_TRADER  || '500';
const MIN_BET     = parseFloat(process.env.MIN_BET || '5');
const MAX_BET     = parseFloat(process.env.MAX_BET || '40');

const FUNDER_KEY  = process.env.FUNDER_PRIVATE_KEY;
if (!FUNDER_KEY) { console.error('❌  Set FUNDER_PRIVATE_KEY'); process.exit(1); }

// ── Chain / clients ───────────────────────────────────────────────────────────

const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

const publicClient = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });

function makeClient(pk) {
  const account = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`);
  return { account, client: createWalletClient({ account, chain: monadTestnet, transport: http(RPC_URL) }) };
}

// ── Addresses ─────────────────────────────────────────────────────────────────

const MOCK_USDC  = '0xa3823ef745DD8Df93222C4dA74665E9Ce515dAeF';
const PRED_BLINK = '0x3adc0beB3B447878a156BB15E1179267cc225553';

// ── ABIs ──────────────────────────────────────────────────────────────────────

const USDC_ABI = [
  { name: 'mint',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
];

const PRED_ABI = [
  { name: 'marketCount',  type: 'function', stateMutability: 'view',         inputs: [],                                                                                    outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getMarketCore', type: 'function', stateMutability: 'view',         inputs: [{ name: 'id', type: 'uint256' }],                                                    outputs: [{ name: 'marketType', type: 'uint8' }, { name: 'feedId', type: 'bytes32' }, { name: 'targetValue', type: 'uint256' }, { name: 'snapshotValue', type: 'uint256' }, { name: 'endTime', type: 'uint256' }, { name: 'endBlock', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'resolvedValue', type: 'uint256' }] },
  { name: 'buyYes',       type: 'function', stateMutability: 'nonpayable',    inputs: [{ name: 'marketId', type: 'uint256' }, { name: 'usdcAmount', type: 'uint256' }],     outputs: [] },
  { name: 'buyNo',        type: 'function', stateMutability: 'nonpayable',    inputs: [{ name: 'marketId', type: 'uint256' }, { name: 'usdcAmount', type: 'uint256' }],     outputs: [] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randBet = () => parseUnits((MIN_BET + Math.random() * (MAX_BET - MIN_BET)).toFixed(2), 6);
const randBool = () => Math.random() < 0.5;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const funder = makeClient(FUNDER_KEY);
  console.log(`\n🚀  PredBlink Dummy Traders (parallel)\n    Funder: ${funder.account.address}\n    Traders: ${NUM_TRADERS}\n`);

  // 1. Fetch active markets
  console.log('📊  Fetching active markets...');
  const count = Number(await publicClient.readContract({ address: PRED_BLINK, abi: PRED_ABI, functionName: 'marketCount' }));
  const activeMarkets = [];
  for (let id = 0; id < count; id++) {
    const core = await publicClient.readContract({ address: PRED_BLINK, abi: PRED_ABI, functionName: 'getMarketCore', args: [BigInt(id)] });
    if (Number(core[6]) === 0) { activeMarkets.push(id); console.log(`    ✓ Market #${id} ACTIVE`); }
    else console.log(`    – Market #${id} status=${core[6]} (skipped)`);
  }
  if (!activeMarkets.length) { console.log('\n⚠️  No active markets.'); return; }
  console.log(`\n📋  Will trade on markets: [${activeMarkets.join(', ')}]\n`);

  // 2. Generate wallets
  const wallets = Array.from({ length: NUM_TRADERS }, () => makeClient(generatePrivateKey()));
  console.log(`👥  Generated ${wallets.length} wallets`);

  // 3. Funder: MON first (confirm), then USDC mints
  const funderBal = await publicClient.getBalance({ address: funder.account.address });
  console.log(`💰  Funder balance: ${formatEther(funderBal)} MON`);

  let funderNonce = await publicClient.getTransactionCount({ address: funder.account.address });

  // Phase A: send MON gas to all wallets
  console.log(`\n⛽  Sending ${MON_GAS} MON to each wallet...`);
  const monHashes = [];
  for (const w of wallets) {
    const hash = await funder.client.sendTransaction({
      to: w.account.address, value: parseEther(MON_GAS), nonce: funderNonce++,
    });
    monHashes.push(hash);
    process.stdout.write('.');
  }
  console.log('\n    Waiting for MON to land...');
  await Promise.all(monHashes.map((hash) => publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 })));
  console.log('    ✅ MON confirmed!\n');

  // Phase B: mint USDC for all wallets
  console.log('💵  Minting USDC for each wallet...');
  const mintHashes = [];
  for (const w of wallets) {
    const hash = await funder.client.writeContract({
      address: MOCK_USDC, abi: USDC_ABI, functionName: 'mint',
      args: [w.account.address, parseUnits(USDC_MINT, 6)],
      nonce: funderNonce++,
    });
    mintHashes.push(hash);
    process.stdout.write('.');
  }
  console.log('\n    Waiting for mints to land...');
  await Promise.all(mintHashes.map((hash) => publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 })));
  console.log('    ✅ USDC minted!\n');

  // 4. All traders run concurrently but each is staggered + sequential buys per trader
  console.log('🤖  All traders running (staggered start, sequential buys)...\n');

  async function writeTxWithRetry(client, params, retries = 3) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const hash = await client.writeContract(params);
        await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
        return hash;
      } catch (e) {
        const msg = e.shortMessage || e.message || '';
        const retryable = msg.includes('higher priority') || msg.includes('HTTP request') || msg.includes('nonce');
        if (retryable && attempt < retries) {
          await sleep(800 + Math.random() * 1200);
          continue;
        }
        throw e;
      }
    }
  }

  async function runTrader(w, i) {
    const label = `Trader ${String(i + 1).padStart(2)}`;
    // Stagger start: spread traders over 5 seconds to avoid block collisions
    await sleep(i * 200 + Math.random() * 300);
    try {
      await writeTxWithRetry(w.client, {
        address: MOCK_USDC, abi: USDC_ABI, functionName: 'approve',
        args: [PRED_BLINK, parseUnits('999999', 6)],
      });

      const results = [];
      for (const marketId of activeMarkets) {
        const isYes = randBool();
        const amount = randBet();
        try {
          await writeTxWithRetry(w.client, {
            address: PRED_BLINK, abi: PRED_ABI,
            functionName: isYes ? 'buyYes' : 'buyNo',
            args: [BigInt(marketId), amount],
          });
          results.push(`#${marketId} ${isYes ? 'YES' : 'NO'} $${formatUnits(amount, 6)}`);
        } catch (e) {
          const reason = e.shortMessage || e.message || '';
          const short = reason.split('\n')[0].slice(0, 120);
          results.push(`#${marketId} ✗(${short})`);
        }
        await sleep(300);
      }
      console.log(`  ✅ ${label}  →  ${results.join(' | ')}`);
    } catch (e) {
      console.log(`  ❌ ${label}: ${e.shortMessage || e.message}`);
    }
  }

  await Promise.all(wallets.map((w, i) => runTrader(w, i)));

  console.log(`\n🎉  Done! ${wallets.length} traders hit markets [${activeMarkets.join(', ')}]`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
