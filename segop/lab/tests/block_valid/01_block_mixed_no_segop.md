# 01_block_mixed_no_segop

## Summary

Control block containing **only non-segOP transactions**.

Used as a baseline to show that a segOP-enabled node behaves identically to Bitcoin Core when no segOP features are present.

## Structure (conceptual)

- Coinbase tx: standard, no segOP flag, no P2SOP.
- N normal transactions:
  - No segOP flags.
  - No segOP sections.
  - No P2SOP outputs.

## Expected Behaviour

- Block MUST be accepted by:
  - Legacy nodes (no segOP support).
  - segOP-aware nodes.
- No segOP-related state or statistics should be triggered.

## Hex Fixture

- `01_block_mixed_no_segop.hex` — **TODO: to be generated**.
