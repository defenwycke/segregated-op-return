# 04_block_near_retention_boundary

## Summary

Block located near the **segOP retention / pruning boundary** in height.

This fixture is primarily used for higher-level tests of node behaviour over time (e.g. in regtest chains), rather than for pure consensus.

## Structure (conceptual)

- One or more segOP transactions (any valid mix).
- Block height chosen such that:
  - It sits at, or just beyond, a configured retention threshold for segOP payloads.

## Expected Behaviour

- Block MUST be accepted.
- A segOP-aware node may:
  - Eventually prune segOP payloads for older blocks beyond the retention window.
  - Retain summary/commitment metadata as per pruning policy.

## Hex Fixture

- `04_block_near_retention_boundary.hex` — **TODO: to be generated**.
