# 02_block_with_bad_tlv

## Summary

Block containing a segOP transaction whose TLV payload is malformed (e.g. truncated TLV).

Essentially the block-level counterpart to `10_tlv_truncated_value`.

## Structure (conceptual)

- Coinbase: standard.
- One segOP tx:
  - segOP flag set.
  - segOP section with TLV truncation / parse failure.
- Other txs may be valid.

## Expected Behaviour

- Block MUST be rejected.
- Reason: one of its transactions fails segOP TLV validation.

## Hex Fixture

- `02_block_with_bad_tlv.hex` — **TODO: to be generated**.
