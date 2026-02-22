# PredBlink Smart Contracts

**Order Book-Based Prediction Market for Twitter Engagement**

This directory contains all smart contract code for PredBlink Phase 1.

---

## Architecture Overview

**Contract Structure:**
```
MarketFactory.sol    → Creates markets, validates thresholds
OrderBook.sol        → Manages limit/market orders, matching
ShareToken.sol       → ERC-1155 YES/NO share tokens
FeeDistributor.sol   → Handles fee splits (Scout/Author/Protocol)
Oracle.sol           → Fetches Twitter metrics via Apify
```

**Flow:**
1. Scout creates market → deposits $10 USDC → receives 10 YES + 10 NO shares
2. Traders place limit/market orders → order book matches them
3. Market expires → Oracle fetches final metrics → resolves YES/NO/INVALID
4. Winners redeem shares for USDC

---

## Development Timeline (Day 1-6)

### Day 1-2: Setup & Research ⏳ IN PROGRESS
- [x] Create contracts/ directory structure
- [ ] Initialize Hardhat project
- [ ] Install dependencies
- [ ] Research Gnosis Conditional Tokens
- [ ] Study Polymarket contracts
- [ ] Design contract interactions

### Day 3-4: Core Contracts
- [ ] MarketFactory.sol (market creation, validation)
- [ ] OrderBook.sol (order matching engine)
- [ ] ShareToken.sol (ERC-1155 tokens)
- [ ] FeeDistributor.sol (fee splits)

### Day 5: Oracle & Resolution
- [ ] Oracle integration (Apify API)
- [ ] Resolution logic (YES/NO/INVALID)
- [ ] Redemption system

### Day 6: Testing & Deployment
- [ ] Unit tests
- [ ] Integration tests
- [ ] Deploy to BNB testnet
- [ ] Verify on BscScan

---

## Quick Start

### Install Dependencies
```bash
cd contracts
npm install
```

### Compile Contracts
```bash
npx hardhat compile
```

### Run Tests
```bash
npx hardhat test
```

### Deploy to BNB Testnet
```bash
npx hardhat run scripts/deploy.js --network bscTestnet
```

---

## Contract Specifications

### MarketFactory.sol
**Purpose:** Create and manage prediction markets

**Key Functions:**
- `createMarket(tweetUrl, metric, duration, multiplier)` → Creates market, validates thresholds
- `getMarket(marketId)` → Returns market details
- `resolveMarket(marketId, finalValue)` → Resolves market after expiration

**Validations:**
- Views ≥ 10,000
- Likes ≥ 500
- Retweets ≥ 100
- Comments ≥ 50
- Market uniqueness (tweetId + metric + duration + multiplier)

### OrderBook.sol
**Purpose:** Manage order book and trade execution

**Key Functions:**
- `placeLimitOrder(marketId, isYes, shares, pricePerShare)` → Posts limit order
- `placeMarketOrder(marketId, isYes, shares)` → Executes at best price
- `cancelOrder(orderId)` → Cancels pending order
- `matchOrders()` → Internal matching engine

**Order Matching:**
- When bid price ≥ ask price → execute trade
- Partial fills supported
- FIFO (First In, First Out) for same-price orders

### ShareToken.sol (ERC-1155)
**Purpose:** YES/NO share tokens

**Token IDs:**
- Market ID × 2 = YES token
- Market ID × 2 + 1 = NO token

**Key Functions:**
- `mint(to, tokenId, amount)` → Mint shares (market creation)
- `burn(from, tokenId, amount)` → Burn shares (redemption)
- Standard ERC-1155 transfers

### FeeDistributor.sol
**Purpose:** Manage fee distribution

**Key Functions:**
- `claimAccount(twitterHandle, oauthProof, signature)` → Author claims account
- `distributeFees(marketId, feeAmount)` → Splits fees based on claim status
- `getFeeRecipients(marketId)` → Returns fee split percentages

**Fee Structure:**
- Before claim: Scout 50%, Protocol 50%
- After claim: Author 70%, Protocol 20%, Scout 10%

### Oracle.sol
**Purpose:** Fetch Twitter metrics and resolve markets

**Key Functions:**
- `fetchMetrics(tweetUrl, metric)` → Calls Apify API
- `submitResolution(marketId, finalValue)` → Resolves market
- `resolveAsInvalid(marketId)` → Handles deleted/private tweets

**Resolution Delay:**
- 2 hours after market expiration
- Allows Twitter to purge bot engagement

---

## Testing Strategy

### Unit Tests
- Market creation with all edge cases
- Order matching correctness
- Fee distribution accuracy
- Author claiming logic
- Resolution (YES/NO/INVALID)

### Integration Tests
- Full user journey: create → trade → resolve → redeem
- Multiple traders in one market
- Author claiming mid-trading
- Invalid tweet handling

### Test Coverage Goal
- 90%+ coverage on all contracts
- All edge cases covered

---

## Deployment

### BNB Testnet
- Network: BSC Testnet
- Chain ID: 97
- RPC: https://data-seed-prebsc-1-s1.binance.org:8545/
- Explorer: https://testnet.bscscan.com/

### Deployment Checklist
- [ ] Deploy ShareToken
- [ ] Deploy MarketFactory
- [ ] Deploy OrderBook
- [ ] Deploy FeeDistributor
- [ ] Deploy Oracle
- [ ] Set contract addresses in each other
- [ ] Verify all contracts on BscScan
- [ ] Test with real transactions

### Deployed Addresses (Testnet)
```
ShareToken:      TBD
MarketFactory:   TBD
OrderBook:       TBD
FeeDistributor:  TBD
Oracle:          TBD
```

---

## Security Considerations

### Reentrancy Protection
- Use OpenZeppelin's `ReentrancyGuard`
- Check-Effects-Interactions pattern

### Access Control
- `onlyOwner` for admin functions
- `onlyOracle` for resolution
- Multi-sig for protocol wallet (mainnet)

### Input Validation
- All external inputs validated
- Price ranges checked (0-100¢)
- Share amounts > 0

### Known Risks
- Oracle centralization (single Apify account)
- Tweet deletion edge cases
- Front-running on order book

---

## Next Steps

**Right now (Day 1):**
1. Initialize Hardhat project
2. Install OpenZeppelin contracts
3. Set up BNB testnet config
4. Research Gnosis/Polymarket architecture
5. Write first contract skeletons

**See [docs/DEVELOPMENT_ROADMAP.md](../docs/DEVELOPMENT_ROADMAP.md) for full timeline.**

---

*Last updated: 2025-11-02*
*Status: Day 1 - Setup & Research*
