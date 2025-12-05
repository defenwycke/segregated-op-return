# 03_block_multiple_segop_varying_tiers

## Summary

Block containing several segOP transactions with **different BUDS/ARBDA tiers**.

Used to exercise per-tx classification and ensure that multiple segOP payloads in the same block are handled correctly.

## Structure (conceptual)

Includes at least:

- One unlabelled segOP tx (ARBDA T3), e.g. from:
  - `01_basic_text_unlabelled`
- One BUDS T1 metadata tx, e.g.:
  - `10_buds_t1_textnote`
- One BUDS T2 operational / L2 anchor tx, e.g.:
  - `11_buds_t2_l2_anchor`

All transactions:

- Have valid segOP sections and P2SOP commitments.
- Are otherwise standard Bitcoin transactions.

## Expected Behaviour

- Block MUST be accepted.
- For each segOP tx, RPC / index should show:
  - Correct BUDS tier/type.
  - Correct ARBDA tier.
- Overall block-level segOP stats (if any) should reflect:
  - Counts per tier
  - Total segOP bytes, etc.

## Hex Fixture

- `03_block_multiple_segop_varying_tiers.hex` — **TODO: to be generated**.
