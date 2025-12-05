# 03_block_with_segop_flag_but_missing_p2sop

## Summary

Block containing at least one transaction where segOP is enabled but the required P2SOP output is missing or misconfigured.

This is the block-level version of the 1:1 mapping violations.

## Structure (conceptual)

- Coinbase: standard.
- At least one segOP tx where:
  - segOP flag bit is set.
  - segOP section present.
  - **No P2SOP output** or more than one P2SOP in a way that breaks the rules.
- Other txs may be valid.

## Expected Behaviour

- Block MUST be rejected.
- Reason: includes a segOP transaction that breaks the 1:1 mapping between segOP payload and P2SOP commitment.

## Hex Fixture

- `03_block_with_segop_flag_but_missing_p2sop.hex` — **TODO: to be generated**.
