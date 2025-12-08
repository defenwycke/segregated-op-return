# 10_segop_with_single_p2sop

## Summary

This test demonstrates a basic segOP transaction with a single P2SOP output.

The segOP payload is a single text string:

- "segOP single P2SOP"

We call segopsend with:

- encoding = "text"
- version = 1
- p2sop = true
- no explicit buds_tier or buds_type fields

In the current implementation of segOP + BUDS, the decoder still classifies this as Tier 1 metadata text:

- buds_tier = "T1_METADATA"
- buds_type = "TEXT_NOTE"
- arbda_tier = "T1"

So this vector is both:

- a structural example of a transaction with exactly one P2SOP output, and
- a behavioural snapshot of how unlabelled text is currently treated by the prototype.

## segOP payload (current behaviour)

According to decodesegop, the segOP payload hex is:

- f00110f1010101127365674f502073696e676c65205032534f50

and the TLV sequence is:

- buds_tier TLV (type 0xf0, length 1, value_hex "10") marking Tier 1 metadata
- buds_type TLV (type 0xf1, length 1, value_hex "01") marking TEXT_NOTE
- text TLV (type 0x01, length 18) whose value decodes to "segOP single P2SOP"

## Expected decode (current prototype)

Key fields from the decodesegop output are:

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
- a text entry with the string "segOP single P2SOP"

## CLI recipe (current call)

1. Generate a fresh destination address in the lab wallet.
2. Call segopsend with:
   - encoding = "text"
   - text = "segOP single P2SOP"
   - version = 1
   - p2sop = true
3. Retrieve the raw transaction with getrawtransaction and decode the segOP lane with decodesegop.

## Fixture files

- Hex fixture: segop/lab/tests/tx_valid/10_segop_with_single_p2sop.hex
- JSON fixture: segop/lab/tests/tx_valid/10_segop_with_single_p2sop.json

These fixtures are derived from transaction:

- txid = a78ee6f8d1abb00c515908205d10e99c2f76a7666610699d3ebc0a3c053d4456
