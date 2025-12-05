# 04_blob_unlabelled

## Summary

segOP payload with a BLOB TLV containing bytes `deadbeef00ff`.

## segOP Payload (conceptual)

- TLV type: `0x03` (blob)
- Raw bytes: `de ad be ef 00 ff`
- No BUDS tier/type TLVs

## Expected Classification

- `kind = "blob"`
- `buds_tier = UNSPECIFIED`
- `buds_type = UNSPECIFIED`
- `arbda_tier = T3`

## Expected Behaviour

- Transaction MUST be accepted.
- RPC should expose the blob bytes exactly.

## Hex Fixture

- `04_blob_unlabelled.hex` — **TODO: to be generated**.
