# 11_tlv_overrun

## Summary

Combined TLV lengths exceed the declared segOP payload length (`segop_len`).

## segOP Payload (conceptual)

- segop_len = M
- Sum of all TLV `length` fields + headers > M

## Expected Behaviour

- Transaction MUST be rejected.
- Reason: TLV parsing overruns the segOP payload boundary.

## Hex Fixture

- `11_tlv_overrun.hex` — **TODO: to be generated**.
