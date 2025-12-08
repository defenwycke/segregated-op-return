```
# 11_segop_no_witness

## Summary

This test represents a segOP transaction intended to illustrate a “no-witness” variant.  
The current segOP prototype wallet still constructs SegWit-style inputs, so this vector
documents the **actual prototype behaviour** while reserving the test slot for future
pure-legacy (no-witness) transactions.

The segOP payload is a simple text note:

- `"segOP no witness"`

Because this was produced using the `"encoding":"text"` mode of `segopsend`, the prototype
automatically assigns:

- `buds_tier = "T1_METADATA"`
- `buds_type = "TEXT_NOTE"`
- `arbda_tier = "T1"`

even though the spec intention for an unlabelled text payload would normally be
`UNSPECIFIED` / `T3`.  
This behaviour is documented here exactly as observed.

---

## Raw TLV Payload (from decoder)

```
f00110f1010101107365674f50206e6f207769746e657373
```

This decodes to:

- `0xF0` → BUDS Tier (T1_METADATA)
- `0xF1` → BUDS Type (TEXT_NOTE)
- `0x01` → Text TLV containing `"segOP no witness"`

---

## Expected Decode (actual prototype output)

```
{
  "has_segop": true,
  "version": 1,
  "size": 24,
  "hex": "f00110f1010101107365674f50206e6f207769746e657373",
  "buds_tier": "T1_METADATA",
  "buds_type": "TEXT_NOTE",
  "arbda_tier": "T1"
}
```

(See the full `.json` file for all TLVs.)

---

## CLI Recipe

1. Generate a new destination address:
   ```
   DEST=$(segop-cli -rpcwallet=lab getnewaddress "tx11-segop-no-witness" bech32)
   ```

2. Send the segOP text transaction:
   ```
   segopsend "$DEST" 0.0001 "segOP no witness" \
     '{"encoding":"text","version":1,"p2sop":true}'
   ```

3. Retrieve the raw transaction:
   ```
   RAWHEX=$(segop-cli getrawtransaction "$TXID")
   ```

4. Decode the segOP lane:
   ```
   segop-cli decodesegop "$RAWHEX"
   ```

---

## Fixture Files

- `11_segop_no_witness.hex`  
- `11_segop_no_witness.json`  
- `11_segop_no_witness.md`

These capture the **current** behaviour of a segOP text transaction produced by the wallet.
```
