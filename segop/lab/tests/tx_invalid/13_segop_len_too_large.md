# 13_segop_len_too_large

## Summary

The segOP length field exceeds the configured maximum per-transaction segOP size.

## segOP Payload (conceptual)

- `segop_len > MAX_SEGOP_TX_BYTES`
- Even if TLVs are well-formed, the size should break policy/consensus limits for segOP.

## Expected Behaviour

- Transaction MUST be rejected.
- Reason: segOP payload too large.

## Hex Fixture

- `13_segop_len_too_large.hex` — **TODO: to be generated**.
