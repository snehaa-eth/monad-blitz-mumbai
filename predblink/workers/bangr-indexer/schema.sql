-- PredBlink Events Database Schema (Monad Testnet)
-- Indexes Trade and MarketCreated events from PredBlink.sol

-- Trades table: Stores Trade events
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id INTEGER NOT NULL,
    trader TEXT NOT NULL,
    is_yes INTEGER NOT NULL,       -- 0 = NO, 1 = YES
    is_buy INTEGER NOT NULL,       -- 0 = SELL, 1 = BUY
    usdc_amount TEXT NOT NULL,     -- BigInt as string (6 decimals)
    shares TEXT NOT NULL,          -- BigInt as string (18 decimals)
    new_yes_price TEXT NOT NULL,   -- BigInt as string (18 decimals)
    tx_hash TEXT NOT NULL UNIQUE,
    block_number INTEGER NOT NULL,
    indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Created markets table: Stores MarketCreated events
CREATE TABLE IF NOT EXISTS created_markets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id INTEGER NOT NULL UNIQUE,
    market_type INTEGER NOT NULL,  -- 0=PRICE, 1=TWITTER, 2=BLOCK_DATA
    feed_id TEXT NOT NULL,         -- bytes32 hex
    question TEXT,
    target_value TEXT NOT NULL,    -- BigInt as string
    end_time INTEGER NOT NULL,
    end_block INTEGER NOT NULL,
    creator TEXT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    block_number INTEGER NOT NULL,
    indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Resolution events
CREATE TABLE IF NOT EXISTS resolutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id INTEGER NOT NULL UNIQUE,
    outcome INTEGER NOT NULL,      -- 1=YES, 2=NO, 3=VOIDED
    final_value TEXT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    block_number INTEGER NOT NULL,
    indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sync state table
CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_block INTEGER NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize sync state
INSERT OR IGNORE INTO sync_state (id, last_block) VALUES (1, 0);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trades_trader ON trades(trader);
CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_block ON trades(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_markets_creator ON created_markets(creator);
CREATE INDEX IF NOT EXISTS idx_markets_block ON created_markets(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_markets_type ON created_markets(market_type);
CREATE INDEX IF NOT EXISTS idx_resolutions_market ON resolutions(market_id);
