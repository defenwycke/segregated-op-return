# 01_basic_text_unlabelled

## Summary

Single **TEXT** TLV segOP payload: `"Hello BUDS"`.  
No BUDS tier or type markers are present.  
This is the canonical **unlabelled segOP payload** example.

- segOP payload TLV hex: `010a48656c6c6f2042554453`
- BUDS markers: **none**
- P2SOP: **present** (standard v1 behaviour)

---

## segOP Payload (conceptual)

TLV sequence in the segOP lane:

- **0x01 TEXT** TLV  
  - `type = 0x01` (text)  
  - `length = 0x0a` (10 bytes)  
  - `value = "Hello BUDS"` (UTF-8)

No:

- `buds_tier` TLV (0xF0)  
- `buds_type` TLV (0xF1)

This is an **unlabelled** segOP payload → classified as **ARBDA Tier 3**.

---

## Expected Classification (from `decodesegop`)

```json
{
  "has_segop": true,
  "version": 1,
  "size": 12,
  "hex": "010a48656c6c6f2042554453",
  "buds_tier": "UNSPECIFIED",
  "buds_type": "UNSPECIFIED",
  "arbda_tier": "T3",
  "tlv": [
    {
      "type": "0x01",
      "length": 10,
      "value_hex": "48656c6c6f2042554453",
      "text": "Hello BUDS",
      "kind": "text"
    }
  ]
}
```

---

## CLI Recipe (how this vector was produced)

Assumptions:

- segOP daemon running with  
  `-regtest -datadir=/root/.bitcoin-segop-regtest`
- Alias defined:

  ```bash
  alias segop-cli="/root/bitcoin-segop/build/bin/bitcoin-cli -regtest -datadir=/root/.bitcoin-segop-regtest"
  ```

- Wallet created and loaded:

  ```bash
  segop-cli createwallet lab
  segop-cli loadwallet lab
  ```

---

### 1. Generate the TLV payload

```bash
cd /root/bitcoin-segop/segop/lab

./scripts/gen_tlv.py \
  --out examples/text/plain_hello_buds.tlv \
  --text "Hello BUDS"

HEX=$(xxd -p -c 999 examples/text/plain_hello_buds.tlv)
echo "$HEX"
```

Expected:

```
010a48656c6c6f2042554453
```

---

### 2. Fresh destination address

```bash
DEST=$(segop-cli -rpcwallet=lab getnewaddress "segop-unlabelled" bech32)
echo "$DEST"
```

Example:

```
bcrt1q7fa9wlg63400hp4g3e0ll7zszwde4strw24wzu
```

---

### 3. Send with *raw* TLV (no blob wrapper)

```bash
TXJSON=$(segop-cli -rpcwallet=lab segopsend "$DEST" 0.0001 "$HEX" \
  '{"encoding":"hex","version":1,"p2sop":true,"raw_tlv":true}')
echo "$TXJSON"
```

Example output:

```json
{
  "txid": "4ec561ea72d0caa102039c4a0d92592f677deb06e98cd9cc33c15202724927db",
  "hex": "020000000003019e848e0edbc2cebe8cf600a33b8dba05d5291f23ce8f3db86e695ee5670b754f0000000000fdffffff031027000000000000160014f27a577d1a8d5efb86a88e5ffff850139b9ac1636ec5052a010000001600147af933f4f53018ba9cd65d17615876561adb66e00000000000000000276a255032534f50e42e3391f020f4c928d30cf2506a2de0b0d342e059f6c4d11449a392c3e6be2802473044022045932686098ae99f48a2c3fb1fd384aa3c27a0db2227879d74f23a1becb3c73b0220247e729bcf2293d97562745c7ef450d7924373995e680d1d7279f714d9c518a70121034fe769c380a4cde346852ca7c2eb2e7d6ba40087835a0a33fa3d38074f28019b53010c010a48656c6c6f204255445300000000",
  "amount": 0.00010000,
  "fee": 0.00001410,
  "complete": true
}
```

---

## Decoder Output

```bash
cd /root/bitcoin-segop

RAWHEX=$(segop-cli getrawtransaction 4ec561ea72d0caa102039c4a0d92592f677deb06e98cd9cc33c15202724927db)
segop-cli decodesegop "$RAWHEX"
```

Observed:

```json
{
  "has_segop": true,
  "version": 1,
  "size": 12,
  "hex": "010a48656c6c6f2042554453",
  "buds_tier": "UNSPECIFIED",
  "buds_type": "UNSPECIFIED",
  "arbda_tier": "T3",
  "tlv": [
    {
      "type": "0x01",
      "length": 10,
      "text": "Hello BUDS"
    }
  ]
}
```

This confirms correct classification.

---

## Hex Fixture File

Path: `segop/lab/tests/tx_valid/01_basic_text_unlabelled.hex`

Contents:

```
020000000003019e848e0edbc2cebe8cf600a33b8dba05d5291f23ce8f3db86e695ee5670b754f0000000000fdffffff031027000000000000160014f27a577d1a8d5efb86a88e5ffff850139b9ac1636ec5052a010000001600147af933f4f53018ba9cd65d17615876561adb66e00000000000000000276a255032534f50e42e3391f020f4c928d30cf2506a2de0b0d342e059f6c4d11449a392c3e6be2802473044022045932686098ae99f48a2c3fb1fd384aa3c27a0db2227879d74f23a1becb3c73b0220247e729bcf2293d97562745c7ef450d7924373995e680d1d7279f714d9c518a70121034fe769c380a4cde346852ca7c2eb2e7d6ba40087835a0a33fa3d38074f28019b53010c010a48656c6c6f204255445300000000
```

---
