# 01_block_with_bad_commitment

## Summary

Block that contains a transaction with a P2SOP commitment that does not match its segOP payload, even though the tx otherwise looks valid.

The tx-level equivalent is `06_commitment_mismatch`, but here we confirm that **including** such a tx in a block causes the block itself to be rejected.

## Structure (conceptual)

- Coinbase: standard.
- One segOP tx:
  - segOP flag set.
  - segOP section present.
  - P2SOP output present.
  - P2SOP commitment intentionally mismatched.
- Additional normal txs (optional).

## Expected Behaviour

- Block MUST be rejected.
- Reason: contains a segOP tx that fails validation due to commitment mismatch.

## Hex Fixture

- `01_block_with_bad_commitment.hex` — **TODO: to be generated**.
