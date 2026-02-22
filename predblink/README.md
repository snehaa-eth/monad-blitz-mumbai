<div align="center">

# 🔥 PredBlink

### **The Nasdaq for Twitter. Bet on Viral Metrics.**

[![BSC Testnet](https://img.shields.io/badge/Network-BSC%20Testnet-yellow)](https://testnet.bscscan.com)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org/)

**Spot viral content early. Buy prediction tickets. Profit when the hype hits the target.**

</div>

---

## 🎯 What is PredBlink?

PredBlink is a **decentralized prediction market** for Twitter/X engagement metrics. Users can:

1. **Scout viral tweets** - Find potentially viral content and create a market
2. **Trade predictions** - Buy YES or NO shares on whether a tweet will hit engagement targets
3. **Profit from predictions** - Earn when your prediction is correct

Markets are powered by a **Constant Product AMM** (like Uniswap) for real-time price discovery, with all trades settling on-chain using USDC.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🐦 **Tweet Markets** | Create prediction markets for any tweet's Views, Likes, Retweets, or Comments |
| 📈 **AMM Trading** | Uniswap-style constant product market maker for dynamic pricing |
| 🎫 **ERC-1155 Shares** | YES/NO positions as tradeable tokens |
| 🏆 **Scout Rewards** | Market creators receive 10 YES + 10 NO shares as reward |
| 🤖 **AI Vibe Check** | Gemini-powered analysis of tweet virality potential |
| 📊 **Live Activity Feed** | Real-time trades and market creations |
| 🎨 **Brutalist UI** | Bold, high-contrast design with retro-arcade aesthetics |
| 🕹️ **Degen Mode** | Hidden Easter egg for true degens (hint: look at the logo!) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│    React + Vite + Tailwind CSS + wagmi + Coinbase Smart Wallet  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  BSC Testnet  │   │  Twitter Proxy  │   │  PredBlink Indexer  │
│               │   │  (CF Worker)    │   │  (CF Worker+D1) │
│ MarketFactory │   │                 │   │                 │
│  ShareToken   │   │  Fetches tweet  │   │ Indexes events  │
│   MockUSDC    │   │  metadata       │   │ Serves activity │
└───────────────┘   └─────────────────┘   └─────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A wallet (MetaMask or Coinbase Wallet)
- BNB Testnet tokens for gas

### Installation

```bash
# Clone the repository
git clone https://github.com/nocaligic/bangerph.git
cd bangerph

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Add your GEMINI_API_KEY to .env.local

# Start the development server
npm run dev
```

### Running Workers (Optional for full functionality)

```bash
# Terminal 1: Twitter Proxy (for fetching tweet data)
cd workers/twitter-proxy && npx wrangler dev --port 8787

# Terminal 2: Indexer (for activity feed)
cd workers/PredBlink-indexer && npx wrangler dev --port 8788
```

---

## 📜 Smart Contracts

Deployed on **BSC Testnet (Chain ID: 97)**

| Contract | Address |
|----------|---------|
| MarketFactory | `0x9cc98DE92B173e24be98543ffabcd5B28b528F60` |
| ShareToken (ERC-1155) | `0x331042bf992BcD11521DfC88bB7b17f2B83f9336` |
| MockUSDC | `0xf71A99BD244a1f73Aa07A2ccaA315ADB9D41CaCf` |

### Key Contract Features

- **Constant Product AMM**: `x * y = k` pricing for YES/NO shares
- **1% Trading Fee**: Built into all buy/sell operations
- **24-Hour Markets**: Markets auto-expire after 24 hours
- **Market Uniqueness**: Only one market per tweet+metric combination
- **Resolution System**: Owner can resolve markets as YES/NO/INVALID

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Wallet | wagmi v2, viem, Coinbase Smart Wallet |
| Contracts | Solidity 0.8.20, Hardhat, OpenZeppelin |
| Indexer | Cloudflare Workers, D1 (SQLite) |
| API Proxy | Cloudflare Workers |
| AI | Google Gemini API |

---

## 🕹️ How It Works

### 1. Create a Market (Scout)
1. Paste a Twitter/X URL
2. Select a metric (Views, Likes, Retweets, Comments)
3. Set a target value
4. Pay $10 USDC to seed the market
5. Receive 10 YES + 10 NO shares as reward

### 2. Trade Predictions
- **Buy YES** if you think the tweet will hit the target
- **Buy NO** if you think it won't
- Prices move based on demand (AMM)

### 3. Resolution
- After 24 hours, the market is resolved based on final metrics
- **YES wins**: Target was hit → YES shares worth $1 each
- **NO wins**: Target was not hit → NO shares worth $1 each

---

## 📸 Screenshots

*Coming soon*

---

## 🛣️ Roadmap

- [x] Core AMM trading engine
- [x] ERC-1155 share tokens
- [x] Real-time activity feed
- [x] AI-powered vibe check
- [ ] Automated resolution via oracle
- [ ] Mainnet deployment
- [ ] Mobile app

---

## 👥 Team

Built with 💜 for the hackathon.

---

## 📄 License

MIT License - feel free to fork and build on top!

---

<div align="center">

**If it BANGS, you BANK. 🔥**

</div>
