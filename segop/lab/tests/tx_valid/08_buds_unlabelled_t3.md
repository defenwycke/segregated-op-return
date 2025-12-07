# 08_buds_unlabelled_t3

## Summary

This test was intended to demonstrate a segOP payload that carries “BUDS-looking” content but has no explicit BUDS tier or type markers, and would therefore fall back to ARBDA Tier 3.

For this prototype, the payload is a single text string:

- "BUDS unlabelled T3"

We call segopsend with:

- encoding = "text"
- version = 1
- p2sop = true
- no buds_tier or buds_type fields

However, in the current implementation of segOP + BUDS, the decoder still classifies this as Tier 1 metadata text:

- buds_tier = "T1_METADATA"
- buds_type = "TEXT_NOTE"
- arbda_tier = "T1"

So this vector documents the current behaviour: even without explicit BUDS labels in the RPC call, the payload is treated as Tier 1 metadata text.

## segOP payload (current behaviour)

According to decodesegop, the segOP payload hex is:

- f00110f1010101124255445320756e6c6162656c6c6564205433

and the TLV sequence is:

- buds_tier TLV (type 0xf0, length 1, value_hex "10") marking Tier 1 metadata.
- buds_type TLV (type 0xf1, length 1, value_hex "01") marking TEXT_NOTE.
- text TLV (type 0x01, length 18) whose value decodes to "BUDS unlabelled T3".

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
- a text entry with the string "BUDS unlabelled T3"

## Spec intent (future behaviour)

Spec-wise, this test vector is reserved for a case where “BUDS-like but unlabelled” content is interpreted as:

- buds_tier = "UNSPECIFIED"
- buds_type = "UNSPECIFIED"
- arbda_tier = "T3"

When the implementation is updated so that explicit BUDS markers are required to obtain Tier 1/T2 classifications, this test can be regenerated to reflect the new T3-fallback behaviour.

## CLI recipe (current call)

1. Generate a fresh destination address in the lab wallet.
2. Call segopsend with:
   - encoding = "text"
   - text = "BUDS unlabelled T3"
   - version = 1
   - p2sop = true
   - no buds_tier or buds_type fields
3. Retrieve the raw transaction with getrawtransaction and decode the segOP lane with decodesegop.

## Fixture files

- Hex fixture: segop/lab/tests/tx_valid/08_buds_unlabelled_t3.hex
- JSON fixture: segop/lab/tests/tx_valid/08_buds_unlabelled_t3.json

These fixtures are derived from transaction:

- txid = 7ab28c93946a373ad8daa778c356be1c8aee2b706f5dc98bec65258aaca4cde3
