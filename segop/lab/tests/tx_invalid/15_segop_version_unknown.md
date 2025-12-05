# 15_segop_version_unknown

## Summary

segOP section uses an unsupported version number.

## segOP Payload (conceptual)

- Marker byte correct (`0x53`)
- Version byte is not `0x01`
- Current deployment only accepts version `0x01`

## Expected Behaviour

- Transaction MUST be rejected in a v1-only deployment.
- Reason: unknown/unsupported segOP version.

## Hex Fixture

- `15_segop_version_unknown.hex` — **TODO: to be generated**.
