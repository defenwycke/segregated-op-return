# 14_segop_marker_wrong

## Summary

segOP section is present but the marker byte is not the expected value.

## segOP Payload (conceptual)

- "marker" byte != `0x53`
- Remaining fields may look valid (version, length, TLVs), but marker is wrong.

## Expected Behaviour

- Transaction MUST be rejected.
- Reason: invalid segOP marker (unrecognized section).

## Hex Fixture

- `14_segop_marker_wrong.hex` — **TODO: to be generated**.
