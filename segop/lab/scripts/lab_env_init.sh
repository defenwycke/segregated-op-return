#!/usr/bin/env bash
set -e

# Basic env paths
ROOT="/root/bitcoin-segop"
DATADIR="/root/.bitcoin-segop-regtest"
CLI="$ROOT/build/bin/bitcoin-cli -regtest -datadir=$DATADIR"

WALLET="lab"

echo "[lab_env_init] Using datadir: $DATADIR"
echo "[lab_env_init] Using wallet:  $WALLET"
echo

echo "[lab_env_init] Creating wallet (if missing)..."
$CLI createwallet "$WALLET" 2>/dev/null || echo "  (wallet already exists)"

echo "[lab_env_init] Getting funding address..."
ADDR=$($CLI -rpcwallet="$WALLET" getnewaddress "lab-funds" bech32)
echo "  Address: $ADDR"

echo "[lab_env_init] Mining 101 blocks to that address..."
$CLI generatetoaddress 101 "$ADDR" > /dev/null

echo "[lab_env_init] Final wallet balance:"
$CLI -rpcwallet="$WALLET" getbalance
