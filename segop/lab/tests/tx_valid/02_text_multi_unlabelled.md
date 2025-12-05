# 02_text_multi_unlabelled

## Summary

This test demonstrates a segOP lane containing **two TEXT TLVs**:

- `"first"`
- `"second"`

This is an **unlabelled** payload (no BUDS Tier or Type markers), therefore decoded as **ARBDA Tier = T3**.

Raw TLV payload:

```
0105666972737401067365636f6e64
```

Breakdown:

- TLV #1 → type `0x01`, length `0x05`, value `"first"`
- TLV #2 → type `0x01`, length `0x06`, value `"second"`

---

## Expected decode (decodesegop)

```
{
  "has_segop": true,
  "version": 1,
  "size": 15,
  "hex": "0105666972737401067365636f6e64",
  "buds_tier_code": "0xff",
  "buds_tier": "UNSPECIFIED",
  "buds_type_code": "0xff",
  "buds_type": "UNSPECIFIED",
  "arbda_tier": "T3",
  "tlv": [
    {
      "type": "0x01",
      "length": 5,
      "value_hex": "6669727374",
      "text": "first",
      "kind": "text"
    },
    {
      "type": "0x01",
      "length": 6,
      "value_hex": "7365636f6e64",
      "text": "second",
      "kind": "text"
    }
  ]
}
```

---

## CLI Recipe

### Assumptions

Daemon running:

```
 /root/bitcoin-segop/build/bin/bitcoind \
   -regtest \
   -datadir=/root/.bitcoin-segop-regtest \
   -server=1
```

Alias:

```
alias segop-cli="/root/bitcoin-segop/build/bin/bitcoin-cli -regtest -datadir=/root/.bitcoin-segop-regtest"
```

Wallet loaded:

```
segop-cli loadwallet lab
```

---

### 1. Fresh address

```
DEST=$(segop-cli -rpcwallet=lab getnewaddress "segop-textmulti" bech32)
echo "$DEST"
```
---

### 2. Send multi-text segOP

```
TXJSON=$(segop-cli -rpcwallet=lab segopsend "$DEST" 0.0001 "ignored" \
  '{"encoding":"text_multi","version":1,"p2sop":true,"texts":["first","second"]}')
echo "$TXJSON"
```

This attaches two `0x01` TEXT TLVs.

---

### 3. Decode segOP lane

```
TXID=<txid from previous step>

RAWHEX=$(segop-cli getrawtransaction "$TXID")
echo "$RAWHEX"

segop-cli decodesegop "$RAWHEX"
```

---

## Raw Transaction Hex

Place this into:  
**segop/lab/examples/json/02_text_multi_unlabelled.hex**

```
02000000000301de14adf227fab3bd3df08c86622fc578beb5959f0611481293361c63cacff3ab0000000000fdffffff036ec5052a010000001600146f5fe97ff91f2b68e247f8a76498787bf7ea22441027000000000000160014b309ad768ef97068b2384a8cf3ce3eefdd40a5220000000000000000276a255032534f5071f1a9d65b32182b9609c82ebf3e018e7c8e9e291eb8a814b20ea31022af6be80247304402201efa0ebb7f94ea62727f025568a6b20dc268972e1dead9a201c3d5d16005b8ae022025cc802ea1d3ffac8f652e1909a0f0eec84208359eb3c30a48a0da2b642749e80121034fe769c380a4cde346852ca7c2eb2e7d6ba40087835a0a33fa3d38074f28019b53010f0105666972737401067365636f6e6400000000
```
