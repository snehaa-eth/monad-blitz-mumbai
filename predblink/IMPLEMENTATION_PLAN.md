# PredBlink Implementation Plan v2.0

> **Goal:** Ship a simple, working prediction market for Twitter metrics in 2-3 days.

---

## ✅ Core Concept: Polymarket for Tweets

**The One-Liner:**
> Bet on whether a tweet will hit a specific metric target.

**User Journey:**
1. See a tweet going viral
2. Think "this will blow up" (or not)
3. Bet YES or NO on whether it hits the target
4. Win $1 per share if you're right, $0 if wrong

---

## 📊 The Simplified Model

### Market Structure

| Feature | Decision |
|---------|----------|
| **Metrics** | 4 options: Views, Likes, Retweets, Comments |
| **Markets Per Tweet** | Max 4 (one per metric) |
| **Timeframe** | 24 hours (fixed) |
| **Trading** | YES/NO shares priced in ¢ |
| **Resolution** | YES wins → $1/share, NO wins → $0 |
| **Creation Cost** | $10 USDC → Scout gets 10 YES + 10 NO shares |

### Market Uniqueness Rule

```
Each (TweetID + Metric) combo can only exist ONCE.

EXAMPLE - @elonmusk tweet:
├── VIEWS market   → "Will it hit 50M views?"    ✅ Created
├── LIKES market   → "Will it hit 2M likes?"     ✅ Created  
├── RETWEETS market → (not created yet)          ⬜ Available
└── COMMENTS market → (not created yet)          ⬜ Available

Total possible: 4 markets per tweet (one per metric)
```

**Why This Works:**
- ✅ Simple - max 4 markets, no fragmentation
- ✅ Different bets - each metric has different dynamics
- ✅ Prevents "burning" tweets - bad VIEWS market? Bet on LIKES instead
- ✅ Scout incentive per metric

---

## 🎨 UI Design

### Market Card
```
┌─────────────────────────────────────┐
│ @elonmusk • 2h ago       [ALPHA] 🔥 │
│                                     │
│ "Considering removing 'W' from      │
│ the alphabet..."                    │
│ [Tweet media]                       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │     WILL IT HIT?                │ │
│ │     50M VIEWS                   │ │
│ │     in 24 hours                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│   ✅ YES        ❌ NO               │
│    72¢          28¢                 │
│                                     │
│  📊 $4.2K vol   ⏰ 23h left         │
└─────────────────────────────────────┘
```

### Market Creation Flow
```
1. Paste tweet URL
2. System fetches current metrics
3. See which metrics are available:
   ├── VIEWS    → [Already exists - TRADE]
   ├── LIKES    → [CREATE MARKET]
   ├── RETWEETS → [CREATE MARKET]
   └── COMMENTS → [CREATE MARKET]
4. Pick metric → Set target → Pay $10 → Market live
```

---

## 💰 Economic Model

### Pricing
```
$1 = 1 YES share + 1 NO share (invariant)

YES at 72¢ = Market thinks 72% chance of hitting target
NO at 28¢ = Market thinks 28% chance of missing

Prices always sum to ~$1 (minus spread/fees)
```

### Resolution
```
IF target is HIT:
  → YES holders get $1 per share
  → NO holders get $0

IF target is MISSED:
  → YES holders get $0  
  → NO holders get $1 per share

IF oracle fails (tweet deleted, etc.):
  → BOTH get $0.50 per share (50/50 refund)
```

### Fees (Simplified)
```
2% fee on trades

Before Author Claims:
  - Scout: 50%
  - Protocol: 50%

After Author Claims:
  - Author: 70%
  - Protocol: 20%
  - Scout: 10%
```

---

## 🔧 Technical Spec

### Smart Contract
```solidity
// Market uniqueness hash
bytes32 marketHash = keccak256(abi.encode(tweetId, metric));
require(!marketExists[marketHash], "Market exists");

// 4 metrics only
enum MetricType { VIEWS, LIKES, RETWEETS, COMMENTS }

// Fixed 24h duration
uint duration = 24 hours;
```

### Minimum Thresholds (Anti-Spam)
```
VIEWS: 10,000 minimum
LIKES: 500 minimum
RETWEETS: 100 minimum
COMMENTS: 50 minimum
```

---

## 📅 3-Day Sprint

### Day 1: Smart Contracts
- [ ] Deploy simplified MarketFactory
- [ ] Market creation (4 metrics max per tweet)
- [ ] YES/NO share minting
- [ ] Basic buy/sell functions

### Day 2: Frontend Integration
- [ ] Wallet connection (Privy/RainbowKit)
- [ ] Wire TradePanel to contracts
- [ ] Market creation modal
- [ ] Portfolio view

### Day 3: Polish & Ship
- [ ] Oracle integration (Apify)
- [ ] Resolution logic
- [ ] Test full flow
- [ ] Deploy to testnet
- [ ] Record demo

---

## ✅ Definition of Done

**MVP Complete When:**
1. ✅ User can browse markets with YES/NO prices
2. ✅ User can click market → see "Will it hit X?" question
3. ✅ User can buy YES or NO shares
4. ✅ User can see their positions
5. ✅ Markets show resolution status
6. ✅ Max 4 markets per tweet enforced
7. ✅ Looks good (neo-brutalist aesthetic)

---

## 🚫 Out of Scope (V1)

- Multiple timeframes (6h/24h options)
- Multiplier selection (2x/5x/10x/20x)
- Order book / limit orders
- AI analysis
- Streaks/badges
- Battle mode
- Comments/chat

**Ship simple first. Add features in V2.**

---

*Last updated: 2024-12-19*
*Status: LOCKED - Ready to build*
