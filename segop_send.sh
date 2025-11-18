#!/usr/bin/env bash
set -euo pipefail

# segop_send.sh
#
# Usage:
#   ./segop_send.sh <wallet> <dest_address> <amount_btc> <payload_hex> [mine]
#
# Example:
#   ./segop_send.sh segoptest bcrt1qm7nmrglev9qt0fqvk8df9e7qjvdmvmgeectxhu 0.1 01020304 mine
#
# If the last argument is "mine", the script will:
#   - generate 1 block to a new regtest address
#   - fetch the confirmed transaction with getrawtransaction (verbose=1, with blockhash)

DATADIR="/root/segop-data"
CLI_BASE="/root/bitcoin-segop/build/bin/bitcoin-cli -regtest -datadir=${DATADIR}"

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required (apt install jq)" >&2
  exit 1
fi

if [ $# -lt 4 ]; then
  echo "Usage: $0 <wallet> <dest_address> <amount_btc> <payload_hex> [mine]"
  exit 1
fi

WALLET="$1"
DEST="$2"
AMOUNT="$3"
PAYLOAD_HEX="$4"
MINE="${5:-}"

CLI="${CLI_BASE} -rpcwallet=${WALLET}"

echo "[0] Checking wallet: ${WALLET}"
if ! $CLI getwalletinfo >/dev/null 2>&1; then
  echo "    Wallet not loaded, attempting loadwallet..."
  $CLI_BASE loadwallet "$WALLET" >/dev/null
  echo "    Wallet loaded."
fi

echo "[0] Wallet info:"
$CLI getwalletinfo | jq '{name, balance, txcount}'

echo "[1] Building P2SOP commitment for payload: ${PAYLOAD_HEX}"
COMMIT_JSON=$($CLI segopbuildp2sop "$PAYLOAD_HEX")
P2SOP_DATA=$(echo "$COMMIT_JSON" | jq -r '.data')
echo "    P2SOP_DATA = $P2SOP_DATA"

echo "[2] Creating base transaction (dest=${DEST}, amount=${AMOUNT})..."
RAW_BASE=$($CLI createrawtransaction "[]" \
  "[{\"$DEST\":$AMOUNT},{\"data\":\"$P2SOP_DATA\"}]")
echo "    RAW_BASE = $RAW_BASE"

echo "[3] Funding transaction..."
FUNDED_JSON=$($CLI fundrawtransaction "$RAW_BASE")
FUNDED_HEX=$(echo "$FUNDED_JSON" | jq -r '.hex')
FEE=$(echo "$FUNDED_JSON" | jq -r '.fee')
echo "    fee        = $FEE"
echo "    FUNDED_HEX = $FUNDED_HEX"

echo "[4] Signing transaction with wallet ${WALLET}..."
SIGNED_JSON=$($CLI signrawtransactionwithwallet "$FUNDED_HEX")
SIGNED_HEX=$(echo "$SIGNED_JSON" | jq -r '.hex')
COMPLETE=$(echo "$SIGNED_JSON" | jq -r '.complete')
echo "    complete   = $COMPLETE"

if [ "$COMPLETE" != "true" ]; then
  echo "ERROR: signrawtransactionwithwallet returned complete=false" >&2
  echo "$SIGNED_JSON" | jq .
  exit 1
fi

echo "[5] Attaching segOP payload..."
SEGOP_JSON=$($CLI createsegoptx "$SIGNED_HEX" "$PAYLOAD_HEX")
SEGOP_HEX=$(echo "$SEGOP_JSON" | jq -r '.hex')
echo "    SEGOP_HEX  = $SEGOP_HEX"

echo "[6] Broadcasting..."
TXID=$($CLI sendrawtransaction "$SEGOP_HEX")
echo "    TXID       = $TXID"

echo
echo "=== Decoderawtransaction view ==="
$CLI decoderawtransaction "$SEGOP_HEX" | jq '{txid, vout, segop}'

if [ "$MINE" = "mine" ]; then
  echo
  echo "[7] Mining 1 block to confirm..."
  MINER_ADDR=$($CLI_BASE getnewaddress)
  BLOCKS_JSON=$($CLI_BASE generatetoaddress 1 "$MINER_ADDR")
  BLOCKHASH=$(echo "$BLOCKS_JSON" | jq -r '.[0]')
  echo "    Mined block: $BLOCKHASH"

  echo
  echo "=== getrawtransaction (confirmed) ==="
  $CLI_BASE getrawtransaction "$TXID" 1 "$BLOCKHASH" \
    | jq '{txid, blockhash, confirmations, vout, segop}'
fi

echo
echo "Done."
