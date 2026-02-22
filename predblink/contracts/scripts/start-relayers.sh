#!/usr/bin/env bash
# Start all PredBlink relayers/keepers in the background.
# Usage: ./scripts/start-relayers.sh
#
# Prerequisites:
#   1. Deploy contracts: npx hardhat run scripts/deploy-predblink.js --network monadTestnet
#   2. Set PRIVATE_KEY in .env
#
# Logs go to scripts/*.log

set -e
cd "$(dirname "$0")/.."

echo "╔═══════════════════════════════════════════╗"
echo "║   Starting PredBlink Relayers (Monad)      ║"
echo "╚═══════════════════════════════════════════╝"

if [ ! -f deployed-predblink.json ]; then
    echo "ERROR: deployed-predblink.json not found. Deploy first."
    exit 1
fi

if [ -z "$PRIVATE_KEY" ] && ! grep -q "PRIVATE_KEY" .env 2>/dev/null; then
    echo "ERROR: PRIVATE_KEY not set. Add it to .env"
    exit 1
fi

echo ""
echo "[1/3] Starting Price Relayer (manual mode, 15s interval)..."
nohup node scripts/price-relayer.js --mode manual --interval 15 > scripts/price-relayer.log 2>&1 &
echo "  PID: $!"

echo "[2/3] Starting Twitter Resolver (30s interval)..."
nohup node scripts/twitter-resolver.js --interval 30 > scripts/twitter-resolver.log 2>&1 &
echo "  PID: $!"

echo "[3/3] Starting Block Keeper (5s interval)..."
nohup node scripts/block-keeper.js --interval 5 > scripts/block-keeper.log 2>&1 &
echo "  PID: $!"

echo ""
echo "All relayers started. Check logs:"
echo "  tail -f scripts/price-relayer.log"
echo "  tail -f scripts/twitter-resolver.log"
echo "  tail -f scripts/block-keeper.log"
echo ""
echo "To stop: kill \$(jobs -p)"
