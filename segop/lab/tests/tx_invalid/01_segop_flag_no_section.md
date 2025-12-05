# 01_segop_flag_no_section

## Summary

segOP bit is set in the transaction flags, but no segOP section appears in the serialization.

## Structure (conceptual)

- Flags:
  - `flag & 0x02 != 0` (segOP bit set)
- Serialization:
  - No segOP marker/version/length section
  - No TLV payload

## Expected Behaviour

- Transaction MUST be rejected.
- Reason: segOP bit set but no segOP payload present.

## Hex Fixture

- `01_segop_flag_no_section.hex` — **TODO: to be generated**.
