<div align="center">

# PredBlink

### High-Frequency Prediction Markets on Monad

**Bet on tweet virality, crypto prices, and on-chain block data — all in one place.**

</div>

---

## What is PredBlink?

PredBlink is a decentralized prediction market protocol built natively on **Monad Testnet**. It lets anyone create and trade YES/NO markets on real-world outcomes across three categories:

| Market Type | Example |
|-------------|---------|
| **Price** | "Will ETH close above $4,000 in the next 10 minutes?" |
| **Twitter/X** | "Will this tweet hit 100k views in 30 minutes?" |
| **Block Data** | "Will gas price spike above 50 gwei in the next 100 blocks?" |

Markets are priced by a **Constant Product AMM** (x·y = k, like Uniswap). YES and NO positions are **ERC-1155 tokens** — tradeable until expiry.

---

## Why Monad?

Monad's high throughput and low block times make prediction markets actually usable:
- Markets can expire in **seconds to minutes**, not just days
- **Block-data markets** are a native Monad primitive — bet on gas price or base fee across a block interval
- Fast finality means prices update and resolve quickly

---

## Features

- **3 Market Types** — Price, Twitter, and Block Data markets
- **Constant Product AMM** — Dynamic YES/NO pricing with 1% trading fee
- **ERC-1155 Share Tokens** — YES/NO positions as tradeable tokens (ID: `marketId*2` / `marketId*2+1`)
- **Pyth Oracle Integration** — Permissionless price market resolution via on-chain Pyth data
- **Blinks Support** — Trade directly from any Blinks-compatible interface via the Cloudflare Worker
- **AI Vibe Check** — Gemini-powered virality analysis when creating tweet markets
- **Brutalist UI** — Bold, high-contrast neo-brutalist design

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│    React 19 + Vite + wagmi v2 + Reown AppKit                    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼──────────────────────┐
        ▼                     ▼                      ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────────────┐
│ Monad Testnet │   │  Blinks Provider │   │   Twitter Proxy      │
│               │   │  (CF Worker)     │   │   (CF Worker)        │
│  PredBlink    │   │                  │   │                      │
│  ShareToken   │   │  Serve market    │   │  Fetch tweet data    │
│  MockUSDC     │   │  blinks for any  │   │  for market creation │
│  PriceOracle  │   │  blink client    │   │                      │
│  BlockOracle  │   └──────────────────┘   └──────────────────────┘
└───────────────┘
```

---

## Smart Contracts (Monad Testnet — Chain ID: 10143)

| Contract | Address |
|----------|---------|
| PredBlink (core) | `0x3adc0beB3B447878a156BB15E1179267cc225553` |
| ShareToken (ERC-1155) | `0x4923AB84c1b2043C4215ce446Ccc42ede1854462` |
| MockUSDC | `0xa3823ef745DD8Df93222C4dA74665E9Ce515dAeF` |
| PriceOracle | `0x5462539809fc8F822e81f8Da6BA0B71615d9a366` |
| BlockOracle | `0xE2654a34B262aB6399F22a7A75981f2E79DEfbD1` |

Deployed: `2026-02-22`

---

## How It Works

### Create a Market (Scout)
1. Choose a market type: Price, Tweet, or Block Data
2. Set a target value and duration
3. Seed the market with **10 USDC**
4. Market goes live with a 50/50 AMM starting price

### Trade
- **Buy YES** if you believe the target will be hit
- **Buy NO** if you don't
- Prices shift with each trade via the AMM (`x·y = k`)
- 1% fee on every trade

### Resolution
- **Price markets**: Permissionless — anyone can call `resolveMarket()` after expiry; reads the final Pyth price on-chain
- **Twitter / Block Data markets**: Resolved manually by the owner based on observed final values
- **Winning shares**: Each winning share redeems for **$1 USDC**
- **Voided markets**: Shares reclaimed at **$0.50 each**

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Monad Testnet (Chain ID: 10143) |
| Smart Contracts | Solidity 0.8.20, Hardhat, OpenZeppelin |
| Price Oracle | Pyth Network |
| Frontend | React 19, Vite, Tailwind CSS |
| Wallet | wagmi v2, viem, Reown AppKit |
| Workers | Cloudflare Workers (Blinks + Twitter proxy) |
| AI | Google Gemini API |

---

## Quick Start

### Prerequisites
- Node.js 18+
- A wallet compatible with Monad Testnet

### Run the frontend

```bash
cd predblink
npm install
npm run dev
```

### Run the Blinks worker locally

```bash
cd predblink/workers/blinks-provider
npx wrangler dev
```

The blinks worker exposes:
- `GET /actions.json` — Blinks registry
- `GET /api/actions/market/:id` — Market blink metadata
- `POST /api/actions/market/:id?side=yes&amount=5` — Buy YES/NO transaction payload

---

## Team

Built for **Monad Blitz Mumbai** hackathon.

---

<div align="center">

**If it BANGS, you BANK.**

</div>
