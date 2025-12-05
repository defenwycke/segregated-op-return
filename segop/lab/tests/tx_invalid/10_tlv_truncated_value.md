# 10_tlv_truncated_value

## Summary

segOP section contains a TLV where the length field N is larger than the number of remaining bytes.

## segOP Payload (conceptual)

- segOP_len is consistent with overall payload size
- Inside TLV area:
  - A TLV advertises length = N
  - Fewer than N bytes follow before the end of segOP payload

## Expected Behaviour

- Transaction MUST be rejected.
- Reason: TLV parse failure (truncated value).

## Hex Fixture

- `10_tlv_truncated_value.hex` — **TODO: to be generated**.
