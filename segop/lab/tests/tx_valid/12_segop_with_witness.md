# 12_segop_with_witness

## Summary

This test is the canonical “segOP transaction with witness” example.

The segOP payload is a simple text note:

- "segOP with witness"

We created it using the segOP wallet RPC in text mode with:

- encoding = "text"
- version = 1
- p2sop = true
- no explicit buds_tier or buds_type fields

In the current segOP + BUDS prototype, this path automatically assigns:

- buds_tier = "T1_METADATA"
- buds_type = "TEXT_NOTE"
- arbda_tier = "T1"

even though the call itself does not provide BUDS labels. This matches the behaviour
seen in tests 05–11 and reflects the present default labelling for text-based segOP
payloads.

From the transaction-structure perspective, this test shows a normal SegWit-style
transaction (with witness data) carrying a segOP lane.

## segOP payload (current behaviour)

According to decodesegop, the segOP payload has:

- has_segop = true
- version = 1
- buds_tier = "T1_METADATA"
- buds_type = "TEXT_NOTE"
- arbda_tier = "T1"

and includes TLVs for:

- buds_tier (type 0xf0, value_hex "10")
- buds_type (type 0xf1, value_hex "01")
- text (type 0x01) containing the string "segOP with witness"

The full TLV breakdown and payload hex are recorded in
12_segop_with_witness.json.

## Expected decode (actual prototype output)

Key fields from the decoder are:

- has_segop = true
- version = 1
- buds_tier_code = "0x10"
- buds_tier = "T1_METADATA"
- buds_type_code = "0x01"
- buds_type = "TEXT_NOTE"
- arbda_tier = "T1"

with a text TLV whose decoded string is "segOP with witness".

## Spec intent (future behaviour)

Spec-wise, this test is intended to remain the canonical “segOP with witness” example.
The exact BUDS tier and type classifications may change once the implementation is
updated so that unlabelled text defaults to UNSPECIFIED / Tier 3 unless explicit BUDS
labels are provided.

At that point this test can be regenerated so that it still demonstrates:

- a SegWit transaction with witness data
- a segOP payload that decodes correctly

but with semantics aligned to the final BUDS / ARBDA rules.

## CLI recipe (current call)

1. Generate a fresh destination address in the lab wallet using:
   - getnewaddress "tx12-segop-with-witness" bech32

2. Send a segOP text transaction:
   - segopsend "$DEST" 0.0001 "segOP with witness" {"encoding":"text","version":1,"p2sop":true}

3. Retrieve the raw transaction with getrawtransaction.

4. Decode the segOP lane using decodesegop.

## Fixture files

- segop/lab/tests/tx_valid/12_segop_with_witness.hex
- segop/lab/tests/tx_valid/12_segop_with_witness.json
- segop/lab/tests/tx_valid/12_segop_with_witness.md

These fixtures capture the current behaviour of a segOP text transaction with witness
data in the SegWit transaction format.
