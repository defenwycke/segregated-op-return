# 07_buds_mixed_t1_t2_no_t3

## Summary

This test was intended to represent a BUDS payload carrying “mixed Tier 1 / Tier 2” style content without any Tier 3 (arbitrary) data.

For this prototype, the payload is a single text string:

- "BUDS mixed T1/T2 no T3"

We call segopsend with:

- buds_tier = "T1_METADATA"
- buds_type = "TEXT_NOTE"
- p2sop = true

In the current implementation of segOP + BUDS, the resulting classification is:

- buds_tier = "T1_METADATA"
- buds_type = "TEXT_NOTE"
- arbda_tier = "T1"

So this vector currently behaves like a Tier 1 metadata text note, but is reserved in the matrix as the “mixed T1/T2, no T3” slot for future behaviour.

## segOP payload (current behaviour)

According to decodesegop, the segOP payload hex is:

- f00110f10101011642554453206d697865642054312f5432206e6f205433

and the TLV sequence is:

- buds_tier TLV (type 0xf0, length 1, value_hex "10") marking Tier 1 metadata.
- buds_type TLV (type 0xf1, length 1, value_hex "01") marking TEXT_NOTE.
- text TLV (type 0x01, length 22) whose value decodes to "BUDS mixed T1/T2 no T3".

## Expected decode (current prototype)

Key fields from the current decodesegop output are:

- has_segop = true
- version = 1
- buds_tier_code = "0x10"
- buds_tier = "T1_METADATA"
- buds_type_code = "0x01"
- buds_type = "TEXT_NOTE"
- arbda_tier = "T1"

The tlv array includes:

- a buds_tier entry for Tier 1 metadata
- a buds_type entry for TEXT_NOTE
- a text entry with the string "BUDS mixed T1/T2 no T3"

## Spec intent (future behaviour)

Spec-wise, this test vector is reserved for a future design where “mixed Tier 1 / Tier 2” semantics can be expressed and recognised, while still excluding Tier 3 arbitrary data.

When the implementation gains explicit mixed-tier semantics, this test can be regenerated to reflect the new classification while keeping the same filename and index.

## CLI recipe (current call)

1. Generate a fresh destination address in the lab wallet.
2. Call segopsend with:
   - encoding = "text"
   - text = "BUDS mixed T1/T2 no T3"
   - buds_tier = "T1_METADATA"
   - buds_type = "TEXT_NOTE"
   - p2sop = true
3. Retrieve the raw transaction with getrawtransaction and decode the segOP lane with decodesegop.

## Fixture files

- Hex fixture: segop/lab/tests/tx_valid/07_buds_mixed_t1_t2_no_t3.hex
- JSON fixture: segop/lab/tests/tx_valid/07_buds_mixed_t1_t2_no_t3.json

These fixtures are derived from transaction:

- txid = 8ce2ebf9238ac2b51ed9562db4b1b5aef27bfdf4c83b3d72b14121b145bf97c0
