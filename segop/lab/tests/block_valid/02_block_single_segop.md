# 02_block_single_segop

## Summary

Block containing exactly one canonical segOP transaction plus a few normal transactions.

This is the simplest “segOP in a real block” example.

## Structure (conceptual)

- Coinbase: standard.
- One segOP tx:
  - Reuses `20_segop_with_single_p2sop` from `tx_valid/`.
- Additional normal txs (no segOP).

## Expected Behaviour

- Block MUST be accepted.
- segOP-aware node should:
  - Parse and index the segOP tx.
  - Classify its BUDS / ARBDA tier according to its payload.
- Legacy node:
  - Sees a normal block (P2SOP looks like an OP_RETURN script).

## Hex Fixture

- `02_block_single_segop.hex` — **TODO: to be generated**.
