# 12_buds_mixed_t1_t2_no_t3

## Summary

Payload containing T1 + T2 tier markers, but no T3 tier.  
Used to test ambiguity handling.

## segOP Payload (conceptual)

- Tier TLV `0xF0 = 0x10` → T1
- Tier TLV `0xF0 = 0x20` → T2
- No T3 marker

## Expected Classification

- `presence.has_t1 = true`
- `presence.has_t2 = true`
- `ambiguous = true`
- `tier = AMBIGUOUS`
- `arbda_tier = T2`

## Hex Fixture

- `12_buds_mixed_t1_t2_no_t3.hex` — **TODO: to be generated**.
