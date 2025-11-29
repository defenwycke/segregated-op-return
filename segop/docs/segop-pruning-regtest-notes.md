# segOP Pruning — Regtest Manual Test Notes

These are **manual regtest test flows** used to verify the segOP pruning windows and the `-segopprune` RPC policy flag.

They are not automated functional tests (yet), but they define the behaviour that future tests and the **Pruning Spec v1.0** MUST match.

---

# 0. Environment

Assumes:

- Linux host (Ubuntu 24.04 in our case)
- segOP build at: `/root/bitcoin-segop/build`
- Built with CMake (`cmake .. && make -j$(nproc)`)

Useful aliases (adjust paths if needed):

```
alias segcli="/root/bitcoin-segop/build/bin/bitcoin-cli"
alias segd="/root/bitcoin-segop/build/bin/bitcoind"
```

---

# 1. Test A — Basic Validation Window Pruning

**Goal:**  
Show that with:

- `segopvalidationwindow = 5`
- `segoparchivewindow  = 0`
- `segopoperatorwindow = 5`
- `-segopprune=1`

a segOP payload is **visible** at shallow depth and becomes **pruned in RPC** once depth exceeds the effective window.

## 1.1. Fresh datadir + config

```
pkill bitcoind || true

rm -rf /root/segop-prune-test
mkdir -p /root/segop-prune-test

cat <<EOF > /root/segop-prune-test/bitcoin.conf
regtest=1
server=1
fallbackfee=0.0001

[regtest]
fallbackfee=0.0001
EOF

alias segcli_p="/root/bitcoin-segop/build/bin/bitcoin-cli -regtest -datadir=/root/segop-prune-test"
```

Start node:

```
segd \
  -regtest \
  -datadir=/root/segop-prune-test \
  -server=1 \
  -daemon \
  -segopprune=1 \
  -segopvalidationwindow=5 \
  -segoparchivewindow=0 \
  -segopoperatorwindow=5
```

Create wallet + mining address, mine 101 blocks:

```
segcli_p -named createwallet wallet_name="segoptest" descriptors=true
ADDR_MINE=$(segcli_p -rpcwallet=segoptest getnewaddress)
segcli_p generatetoaddress 101 "$ADDR_MINE"
segcli_p -rpcwallet=segoptest getbalance
segcli_p getblockchaininfo | jq '.blocks'
```

## 1.2. Create segOP transaction (depth 0)

```
ADDR_PAY=$(segcli_p -rpcwallet=segoptest getnewaddress)
TX_JSON=$(
  segcli_p -rpcwallet=segoptest segopsend "$ADDR_PAY" 0.001 "segop prune test" \
  '{"encoding":"text","version":1,"p2sop":true}'
)
TXID=$(echo "$TX_JSON" | jq -r '.txid')
```

Check segOP:

```
segcli_p getrawtransaction "$TXID" true | jq '.segop'
```

## 1.3. Mine blocks until depth > 5 (validation window)

```
ADDR_MINE2=$(segcli_p -rpcwallet=segoptest getnewaddress)
segcli_p generatetoaddress 5 "$ADDR_MINE2"

BLOCKHASH=$(segcli_p -rpcwallet=segoptest gettransaction "$TXID" | jq -r '.blockhash')
TX_HEIGHT=$(segcli_p getblock "$BLOCKHASH" | jq '.height')
TIP_HEIGHT=$(segcli_p getblockchaininfo | jq '.blocks')
DEPTH=$((TIP_HEIGHT - TX_HEIGHT))
```

At depth > 5:

```
segcli_p getrawtransaction "$TXID" true "$BLOCKHASH" | jq '.segop'
# { "pruned": true, "version": 1, "size": N }
```

---

# 2. Test B — Archive Window Retention

**Goal:**  
With:

- `segopvalidationwindow = 5`
- `segoparchivewindow  = 10`
- `segopoperatorwindow = 5`
- `-segopprune=1`

segOP should stay **unpruned** for depth ≤ 10.

## 2.1. Setup

```
pkill bitcoind || true

rm -rf /root/segop-archive-test
mkdir -p /root/segop-archive-test

cat <<EOF > /root/segop-archive-test/bitcoin.conf
regtest=1
server=1
fallbackfee=0.0001

[regtest]
fallbackfee=0.0001
EOF

alias segcli2="/root/bitcoin-segop/build/bin/bitcoin-cli -regtest -datadir=/root/segop-archive-test"
```

Start node:

```
segd \
  -regtest \
  -datadir=/root/segop-archive-test \
  -server=1 \
  -daemon \
  -segopprune=1 \
  -segopvalidationwindow=5 \
  -segoparchivewindow=10 \
  -segopoperatorwindow=5
```

Make wallet + mine 101 blocks:

```
segcli2 -named createwallet wallet_name="archivewallet" descriptors=true
ADDR_MINE=$(segcli2 -rpcwallet=archivewallet getnewaddress)
segcli2 generatetoaddress 101 "$ADDR_MINE"
```

## 2.2. segOP tx

```
ADDR_PAY=$(segcli2 -rpcwallet=archivewallet getnewaddress)
TXID=$(
  segcli2 -rpcwallet=archivewallet segopsend "$ADDR_PAY" 0.001 "archive window test" \
  '{"encoding":"text","version":1,"p2sop":true}' | jq -r '.txid'
)
```

Check segOP immediately:

```
segcli2 getrawtransaction "$TXID" true | jq '.segop'
```

Mine 4 blocks → depth 3:

```
ADDR_MINE2=$(segcli2 -rpcwallet=archivewallet getnewaddress)
segcli2 generatetoaddress 4 "$ADDR_MINE2"
```

segOP still visible:

```
BLOCKHASH=$(segcli2 -rpcwallet=archivewallet gettransaction "$TXID" | jq -r '.blockhash')
TX_HEIGHT=$(segcli2 getblock "$BLOCKHASH" | jq '.height')
TIP_HEIGHT=$(segcli2 getblockchaininfo | jq '.blocks')
DEPTH=$((TIP_HEIGHT - TX_HEIGHT))
segcli2 getrawtransaction "$TXID" true "$BLOCKHASH" | jq '.segop'
```

## 2.3. depth 9

Mine until depth = 9:

```
segcli2 generatetoaddress 6 "$ADDR_MINE2"

TIP_HEIGHT=$(segcli2 getblockchaininfo | jq '.blocks')
TX_HEIGHT=$(segcli2 getblock "$BLOCKHASH" | jq '.height')
DEPTH=$((TIP_HEIGHT - TX_HEIGHT))
```

segOP still visible:

```
segcli2 getrawtransaction "$TXID" true "$BLOCKHASH" | jq '.segop'
```

## 2.4. depth 11 → archive prunes

```
segcli2 generatetoaddress 2 "$ADDR_MINE2"

TIP_HEIGHT=$(segcli2 getblockchaininfo | jq '.blocks')
TX_HEIGHT=$(segcli2 getblock "$BLOCKHASH" | jq '.height')
DEPTH=$((TIP_HEIGHT - TX_HEIGHT))
segcli2 getrawtransaction "$TXID" true "$BLOCKHASH" | jq '.segop'
# { "pruned": true, "version": 1, "size": N }
```

---

# 3. Test C — `-segopprune` as a View/Policy Toggle

**Goal:**  
Show that `-segopprune` only controls **RPC exposure**, not disk/consensus.

## 3.1. Setup “noprune” datadir

```
pkill bitcoind || true
rm -rf /root/segop-noprune-test
mkdir -p /root/segop-noprune-test

cat <<EOF > /root/segop-noprune-test/bitcoin.conf
regtest=1
server=1
fallbackfee=0.0001

[regtest]
fallbackfee=0.0001
EOF

alias segcli_np="/root/bitcoin-segop/build/bin/bitcoin-cli -regtest -datadir=/root/segop-noprune-test"
```

Start with pruning **enabled**:

```
segd \
  -regtest \
  -datadir=/root/segop-noprune-test \
  -server=1 \
  -daemon \
  -segopprune=1 \
  -segopvalidationwindow=5 \
  -segoparchivewindow=0 \
  -segopoperatorwindow=5
```

Create wallet + mine 101 blocks:

```
segcli_np -named createwallet wallet_name="noprune" descriptors=true
ADDR_MINE=$(segcli_np -rpcwallet=noprune getnewaddress)
segcli_np generatetoaddress 101 "$ADDR_MINE"
```

## 3.2. Create segOP tx + push past window

```
ADDR_PAY=$(segcli_np -rpcwallet=noprune getnewaddress)
TX_JSON=$(
  segcli_np -rpcwallet=noprune segopsend "$ADDR_PAY" 0.001 "noprune view test" \
  '{"encoding":"text","version":1,"p2sop":true}'
)
TXID=$(echo "$TX_JSON" | jq -r '.txid')
```

Mine >20 blocks → depth 20:

```
ADDR_MINE2=$(segcli_np -rpcwallet=noprune getnewaddress)
segcli_np generatetoaddress 20 "$ADDR_MINE2"

BLOCKHASH=$(segcli_np -rpcwallet=noprune gettransaction "$TXID" | jq -r '.blockhash')
TX_HEIGHT=$(segcli_np getblock "$BLOCKHASH" | jq '.height')
TIP_HEIGHT=$(segcli_np getblockchaininfo | jq '.blocks')
DEPTH=$((TIP_HEIGHT - TX_HEIGHT))
```

Check segOP while pruning enabled:

```
segcli_np getrawtransaction "$TXID" true "$BLOCKHASH" | jq '.segop'
# { "pruned": true, "version": 1, "size": N }
```

## 3.3. Restart with pruning **disabled**

```
pkill bitcoind || true
segd \
  -regtest \
  -datadir=/root/segop-noprune-test \
  -server=1 \
  -daemon \
  -segopprune=0 \
  -segopvalidationwindow=5 \
  -segoparchivewindow=0 \
  -segopoperatorwindow=5
```

Now:

```
segcli_np getrawtransaction "$TXID" true "$BLOCKHASH" | jq '.segop'
# { "version": 1, "size": N, "hex": "..." }
```

**Meaning:**  
Turning `-segopprune` off restores full RPC access to bytes still on disk.

**Not:**  
It does **not** “undelete” bytes that were actually removed from disk (future feature if we ever wire it to real disk pruning).

---

# 4. Summary

1. **Effective window**:  

```
   E = max(segopvalidationwindow, segopoperatorwindow)
```

2. **RPC views**:  

   - unpruned:

```
     {
       "version": 1,
       "size": N,
       "hex": "..."
     }
```

   - pruned:

```
     {
       "pruned": true,
       "version": 1,
       "size": N
     }
```

3. **Policy only (for now)**:  
   segOP pruning currently affects **RPC exposure**, not consensus and not actual blockfile layout.

These notes define the **expected behaviour** for Pruning Spec v1.0 and future automated regression tests.
(code end)
