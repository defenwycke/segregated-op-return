# 06_commitment_mismatch

## Summary

Transaction has a segOP payload and a P2SOP output, but the P2SOP commitment does not match the segOP payload.

## Structure (conceptual)

- segOP flag set
- segOP section:
  - Marker, version, `segop_len`, TLV payload
- P2SOP output:
  - Commitment value that SHOULD commit to the payload, but is incorrect

## Expected Behaviour

- Transaction MUST be rejected.
- Reason: P2SOP commitment MUST match the segOP payload according to the commitment scheme.

## Hex Fixture

- `06_commitment_mismatch.hex` — **TODO: to be generated**.
