# 03_json_unlabelled

## Summary

This test demonstrates a segOP payload containing a JSON-style text body encoded in a single TEXT TLV.

The payload includes no BUDS Tier or Type markers, so classification is:

- buds_tier = UNSPECIFIED  
- buds_type = UNSPECIFIED  
- arbda_tier = T3  

---

## Raw TLV Payload (hex)

01147b22666f6f223a22626172222c226e223a34327d

This represents the UTF-8 string:

{"foo":"bar","n":42}

---

## Expected segOP Decode Output

{
  "has_segop": true,
  "version": 1,
  "size": 22,
  "hex": "01147b22666f6f223a22626172222c226e223a34327d",
  "buds_tier_code": "0xff",
  "buds_tier": "UNSPECIFIED",
  "buds_type_code": "0xff",
  "buds_type": "UNSPECIFIED",
  "arbda_tier": "T3",
  "tlv": [
    {
      "type": "0x01",
      "length": 20,
      "value_hex": "7b22666f6f223a22626172222c226e223a34327d",
      "text": "{\"foo\":\"bar\",\"n\":42}",
      "kind": "text"
    }
  ]
}

---

## CLI Recipe

1. Generate TLV payload

    cd /root/bitcoin-segop/segop/lab

    mkdir -p examples/json

    ./scripts/gen_tlv.py \
      --out examples/json/03_json_unlabelled.tlv \
      --text '{"foo":"bar","n":42}'

    HEX=$(xxd -p -c 999 examples/json/03_json_unlabelled.tlv)
    echo "$HEX"


2. Get destination address

    DEST=$(segop-cli -rpcwallet=lab getnewaddress "tx03-json-unlabelled" bech32)
    echo "$DEST"


3. Send segOP transaction

    TXJSON=$(segop-cli -rpcwallet=lab segopsend "$DEST" 0.0001 "$HEX" \
      '{"encoding":"hex","version":1,"p2sop":true,"raw_tlv":true}')

    echo "$TXJSON"


4. Decode segOP lane

    TXID=<the txid from TXJSON>

    RAWHEX=$(segop-cli getrawtransaction "$TXID")
    echo "$RAWHEX"

    segop-cli decodesegop "$RAWHEX"

---

## Hex Fixture File

Path:  
segop/lab/tests/tx_valid/03_json_unlabelled.hex

Contents:

020000000003018cf1a4422759a6acba7ebbfcd152ec7aefb3bc8cbadcf36ba967c017348d13520000000000fdffffff036ec5052a01000000160014e4ad7cf794e16de18557a6f74a4f43ea3ac2cca910270000000000001600145a29bfba40297f75992098f5c8d9064b927a51a50000000000000000276a255032534f50147fab203955501a793f2eec39b71850545ceb127f00d6cbf899b9486a1fc78b0247304402207d91fd4196b8db1650a13a2737213a4d8dcd13c8d1a79384607f6ba211e5b826022043b060df753203cfb8c891d42db2bf35b112279550343ab4bbdab8aa415613ca0121034fe769c380a4cde346852ca7c2eb2e7d6ba40087835a0a33fa3d38074f28019b53011601147b22666f6f223a22626172222c226e223a34327d00000000

---

## JSON Fixture File

Path:  
segop/lab/tests/tx_valid/03_json_unlabelled.json

Contents:

{
  "has_segop": true,
  "version": 1,
  "size": 22,
  "hex": "01147b22666f6f223a22626172222c226e223a34327d",
  "buds_tier_code": "0xff",
  "buds_tier": "UNSPECIFIED",
  "buds_type_code": "0xff",
  "buds_type": "UNSPECIFIED",
  "arbda_tier": "T3",
  "tlv": [
    {
      "type": "0x01",
      "length": 20,
      "value_hex": "7b22666f6f223a22626172222c226e223a34327d",
      "text": "{\"foo\":\"bar\",\"n\":42}",
      "kind": "text"
    }
  ]
}

---
