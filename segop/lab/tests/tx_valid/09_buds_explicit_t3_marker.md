# 09_buds_explicit_t3_marker

## Summary

This test is reserved in the matrix as the “explicit Tier 3 marker” example.

For this prototype, the payload is a single text string:

- "BUDS explicit T3 marker"

We call segopsend with:

- buds_tier = "T1_METADATA"
- buds_type = "TEXT_NOTE"
- p2sop = true

In the current implementation of segOP + BUDS, the resulting classification is:

- buds_tier = "T1_METADATA"
- buds_type = "TEXT_NOTE"
- arbda_tier = "T1"

So this vector currently behaves like a Tier 1 metadata text note, but its name and documentation mark it as the slot where an explicit Tier 3 marker test will live once Tier 3 semantics are implemented.

## segOP payload (current behaviour)

According to decodesegop, the segOP payload hex is:

- f00110f10101011742554453206578706c69636974205433206d61726b6572

and the TLV sequence is:

- buds_tier TLV (type 0xf0, length 1, value_hex "10") marking Tier 1 metadata
- buds_type TLV (type 0xf1, length 1, value_hex "01") marking TEXT_NOTE
- text TLV (type 0x01, length 23) whose value decodes to "BUDS explicit T3 marker"

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
- a text entry containing the string "BUDS explicit T3 marker"

## Spec intent (future behaviour)

Spec-wise, this test vector is meant to become the canonical “explicit Tier 3 marker” example once:

- the BUDS / segOP implementation supports a distinct Tier 3 marker value
- decodesegop can show Tier 3 semantics for such payloads

At that point, this test can be regenerated so that the fixtures demonstrate explicit Tier 3 behaviour rather than Tier 1 metadata.

## CLI recipe (current call)

1. Generate a fresh destination address in the lab wallet.
2. Call segopsend with:
   - encoding = "text"
   - text = "BUDS explicit T3 marker"
   - buds_tier = "T1_METADATA"
   - buds_type = "TEXT_NOTE"
   - p2sop = true
3. Retrieve the raw transaction with getrawtransaction and decode the segOP lane with decodesegop.

## Fixture files

- Hex fixture: segop/lab/tests/tx_valid/09_buds_explicit_t3_marker.hex
- JSON fixture: segop/lab/tests/tx_valid/09_buds_explicit_t3_marker.json

These fixtures are derived from transaction:

- txid = 959086352e455764ebc219e7b1603560fcfb67ce222ac89adc8b1b036852d7f9
