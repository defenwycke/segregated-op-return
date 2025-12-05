# 12_noncanonical_compactsize

## Summary

A CompactSize integer in the segOP section uses a wider encoding than necessary.

Example: encoding 252 as `0xfd fc 00` instead of the minimal single-byte `0xfc`.

## segOP Payload (conceptual)

- At least one CompactSize value (length, count, etc.) uses a non-minimal encoding.

## Expected Behaviour

- Transaction MUST be rejected under `SegopReadCompactSize` rules.
- Reason: non-canonical CompactSize encodings are invalid in segOP.

## Hex Fixture

- `12_noncanonical_compactsize.hex` — **TODO: to be generated**.
