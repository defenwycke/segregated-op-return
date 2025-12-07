# 06_buds_t2_l2_anchor

## Summary

This test was intended to demonstrate a BUDS Tier 2 L2 anchor payload.

In the CLI call to segopsend, we requested:

- buds_tier = "T2_L2_ANCHOR"
- buds_type = "L2_ANCHOR"

with the text payload:

- "L2 anchor test 01"

However, in the current prototype implementation of segOP + BUDS, the resulting classification is still:

- buds_tier = "T1_METADATA"
- buds_type = "TEXT_NOTE"
- arbda_tier = "T1"

So this vector documents that, as of this prototype, the L2 anchor intent is still treated as Tier 1 metadata text.

## segOP payload (current behaviour)

According to decodesegop, the segOP payload hex is:

- f00110f1010101114c3220616e63686f722074657374203031

and the TLV sequence is:

- buds_tier TLV (type 0xf0, length 1, value_hex "10") marking Tier 1 metadata.
- buds_type TLV (type 0xf1, length 1, value_hex "01") marking TEXT_NOTE.
- text TLV (type 0x01, length 17) whose value decodes to "L2 anchor test 01".

## Expected decode (current prototype)

Key fields from the current decodesegop output are:

- has_segop = true
- version = 1
- buds_tier_code = "0x10"
- buds_tier = "T1_METADATA"
- buds_type_code = "0x01"
- buds_type = "TEXT_NOTE"
- arbda_tier = "T1"

This confirms that, in the current prototype, this "L2 anchor" payload is still treated as a Tier 1 metadata text note.

## Spec intent (future behaviour)

Spec-wise, this test vector is reserved for a future behaviour where L2 anchor payloads are classified as:

- buds_tier = "T2_L2_ANCHOR" (or equivalent Tier 2 L2 label)
- buds_type = "L2_ANCHOR"
- arbda_tier = "T2"

When the implementation is updated to support explicit Tier 2 L2 anchor classification from the CLI, this test can be regenerated and the JSON fixture updated to match the new classification.

## CLI recipe (current call)

1. Generate a fresh destination address in the lab wallet.
2. Call segopsend with:
   - encoding = "text"
   - text = "L2 anchor test 01"
   - buds_tier = "T2_L2_ANCHOR"
   - buds_type = "L2_ANCHOR"
   - p2sop = true
3. Retrieve the raw transaction with getrawtransaction and decode the segOP lane with decodesegop.

## Fixture files

- Hex fixture: segop/lab/tests/tx_valid/06_buds_t2_l2_anchor.hex
- JSON fixture: segop/lab/tests/tx_valid/06_buds_t2_l2_anchor.json

These fixtures are derived from transaction:

- txid = ba528b39ccbea27a6414a8494dfbd7389f5ea3439de3b5a7e99938046292e062
