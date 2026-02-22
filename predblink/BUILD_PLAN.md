# PredBlink Build Plan: Phase-by-Phase

> **Objective:** Migrate and simplify PredBlinksh contracts into bangerph, then wire to the UI for a working prediction market prototype.

---

## Overview

| Phase | Focus | Estimated Time | Status |
|-------|-------|----------------|--------|
| Phase 1 | Migration & Setup | 1 hour | ✅ Complete |
| Phase 2 | Contract Simplification | 2-3 hours | ✅ Complete (with AMM!) |
| Phase 3 | Deploy to Testnet | 1 hour | ✅ Complete |
| Phase 4 | Frontend Integration | 3-4 hours | 🔄 In Progress |
| Phase 5 | Testing & Polish | 2 hours | ⬜ Not Started |

**Total Estimated Time: 9-11 hours (1.5-2 days)**

---

## Phase 1: Migration & Setup ✅ COMPLETE

### Goal
Copy necessary infrastructure from PredBlinksh to bangerph.

### Completed Tasks
- [x] Created `/contracts` folder in bangerph
- [x] Copied Hardhat config and dependencies
- [x] Copied smart contracts (MarketFactory.sol, ShareToken.sol, MockUSDC.sol)
- [x] Installed dependencies
- [x] Verified Hardhat compiles

---

## Phase 2: Contract Simplification ✅ COMPLETE (with AMM!)

### Goal
Simplify MarketFactory.sol and add AMM pricing for real prediction market trading.

### Completed Tasks
- [x] Removed complex features (Duration enum, multipliers)
- [x] Updated market uniqueness to (tweetId + metric) only
- [x] Simplified createMarket function
- [x] **Added full AMM (Automated Market Maker)**:
  - `buyYes()` / `buyNo()` - Buy individual shares
  - `sellYes()` / `sellNo()` - Sell shares back
  - `getYesPrice()` / `getNoPrice()` - Dynamic pricing
  - `estimateBuyYes()` / `estimateBuyNo()` - Preview trades
  - Constant product formula (like Uniswap)
  - 1% trading fee

### Contract Features
- ✅ Max 4 markets per tweet (one per metric)
- ✅ Fixed 24h duration
- ✅ Scout sets target directly
- ✅ Dynamic AMM pricing (50/50 start, moves with trades)
- ✅ 1% trading fee
- ✅ Resolution by owner (manual for MVP)

---

## Phase 3: Deploy to Testnet ✅ COMPLETE

### Goal
Deploy contracts to BNB Testnet

### Deployed Contracts (BSC Testnet - December 20, 2024)

| Contract | Address | BscScan |
|----------|---------|---------|
| MockUSDC | `0xb0edAB53b28B4A13B396e66e6892ad553429A49f` | [View](https://testnet.bscscan.com/address/0xb0edAB53b28B4A13B396e66e6892ad553429A49f) |
| ShareToken | `0x56591846d568350705F6238089dA36f8F459A553` | [View](https://testnet.bscscan.com/address/0x56591846d568350705F6238089dA36f8F459A553) |
| MarketFactory | `0xC1F10B760AAD6949f264122749E80b42C76b6b4F` | [View](https://testnet.bscscan.com/address/0xC1F10B760AAD6949f264122749E80b42C76b6b4F) |

**Deployer/Owner:** `0x7308b1B0Ab147713ADc079c7183be84a933Ee1D1`

### Completed Tasks
- [x] Funded deployer wallet with 0.1 tBNB
- [x] Deployed MockUSDC
- [x] Deployed ShareToken
- [x] Deployed MarketFactory (with AMM)
- [x] Configured ShareToken with MarketFactory address
- [x] Saved addresses to `contracts/deployed-addresses.json`

---

## Phase 4: Frontend Integration 🔄 IN PROGRESS

### Goal
Wire the existing UI to the deployed contracts.

### Completed Tasks
- [x] Created `lib/contracts/addresses.ts` - Contract addresses
- [x] Created `lib/contracts/abis.ts` - Contract ABIs
- [x] Created `lib/contracts/hooks.ts` - React hooks for all contract functions
- [x] Created `lib/contracts/index.ts` - Clean exports
- [x] Created `components/ConnectedTradePanel.tsx` - Trading UI with real contract calls
- [x] Created `components/ConnectedCreateMarketModal.tsx` - Market creation with contract integration
- [x] Created `services/twitterService.ts` - TwitterAPI.io integration for live tweet metrics
- [x] Wired ConnectedCreateMarketModal into App.tsx
- [x] Wired ConnectedTradePanel into MarketDetail.tsx

### Available Hooks

**Read Hooks:**
- `useMarketCount()` - Get total markets
- `useMarket(id)` - Get market details
- `useYesPrice(id)` - Get YES price (cents)
- `useNoPrice(id)` - Get NO price (cents)
- `useReserves(id)` - Get AMM reserves
- `useEstimateBuyYes(id, amount)` - Preview YES buy
- `useEstimateBuyNo(id, amount)` - Preview NO buy
- `useUsdcBalance(address)` - User's USDC balance
- `useYesBalance(address, marketId)` - User's YES shares
- `useNoBalance(address, marketId)` - User's NO shares

**Write Hooks:**
- `useApproveUsdc()` - Approve USDC spending
- `useMintUsdc()` - Mint test USDC (testnet)
- `useCreateMarket()` - Create new market
- `useBuyYes()` - Buy YES shares
- `useBuyNo()` - Buy NO shares
- `useSellYes()` - Sell YES shares
- `useSellNo()` - Sell NO shares
- `useRedeem()` - Redeem winning shares

### Remaining Tasks
- [ ] Wire CreateMarketModal to `useCreateMarket()`
- [ ] Wire TradePanel to `useBuyYes()` / `useBuyNo()`
- [ ] Wire MarketCard to read live prices
- [ ] Add USDC minting for testers
- [ ] Add transaction loading states
- [ ] Add success/error toasts
- [ ] Deploy frontend to Vercel/Cloudflare

---

## Phase 5: Testing & Polish ⬜ NOT STARTED

### Goal
Test full flow end-to-end and fix issues.

### Tasks
- [ ] Test market creation flow
- [ ] Test trading flow (buy/sell YES/NO)
- [ ] Test resolution (owner resolves manually)
- [ ] Test redemption (winners claim)
- [ ] Fix any bugs
- [ ] Add real tweet fetching (optional - TwitterAPI.io)
- [ ] Record demo video for hackathon

---

## Environment Variables

```bash
# .env.local (Frontend)
VITE_PRIVY_APP_ID=your_privy_app_id

# contracts/.env (Contracts)
PRIVATE_KEY=your_deployer_private_key
BSCSCAN_API_KEY=your_bscscan_key  # Optional for verification
```

---

## Quick Start Commands

```bash
# Frontend development
cd bangerph
npm run dev

# Compile contracts
cd contracts
npx hardhat compile

# Deploy to testnet (already done)
npx hardhat run scripts/step3-deploy.js --network bscTestnet

# Mint test USDC (via UI or script)
# Use the useMintUsdc() hook in frontend
```

---

## Resources

- **BNB Testnet Faucet:** https://testnet.bnbchain.org/faucet-smart
- **BscScan Testnet:** https://testnet.bscscan.com/
- **Privy Dashboard:** https://dashboard.privy.io/
- **Contract Source:** `bangerph/contracts/contracts/`
- **Deployed Addresses:** `bangerph/contracts/deployed-addresses.json`

---

*Last updated: 2024-12-20*
*Status: Contracts deployed ✅, frontend integration in progress*
