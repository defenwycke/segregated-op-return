# 02_segop_section_no_flag

## Summary

segOP marker + payload is present, but the segOP flag bit is NOT set.

## Structure (conceptual)

- Flags:
  - `flag & 0x02 == 0` (segOP bit clear)
- Serialization:
  - segOP marker (`0x53`), version, `segop_len`, TLV payload present

## Expected Behaviour

- Transaction MUST be rejected.
- Reason: segOP payload in the stream without the segOP feature bit being set.

## Hex Fixture

- `02_segop_section_no_flag.hex` — **TODO: to be generated**.
