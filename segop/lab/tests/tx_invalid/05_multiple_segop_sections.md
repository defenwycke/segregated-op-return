# 05_multiple_segop_sections

## Summary

Transaction contains more than one segOP section in the serialization.

## Structure (conceptual)

- Flags:
  - segOP bit set
- Serialization:
  - segOP marker/version/length/TLV sequence appears twice (or more)

## Expected Behaviour

- Transaction MUST be rejected.
- Reason: there must be exactly one segOP section per segOP transaction.

## Hex Fixture

- `05_multiple_segop_sections.hex` — **TODO: to be generated**.
