# 11_buds_t2_l2_anchor

## Summary

BUDS T2 operational record for an L2 state anchor.

## segOP Payload (conceptual)

1. Tier TLV:  
   `0xF0 = 0x20` → `T2_OPERATIONAL`

2. Type TLV:  
   `0xF1 = (L2_STATE_ANCHOR CODE)`

3. JSON or TEXT TLV describing:
   - Rollup batch hash
   - L2 height
   - etc.

## Expected Classification

- `buds_tier = T2_OPERATIONAL`
- `buds_type = L2_STATE_ANCHOR`
- `arbda_tier = T2`

## Expected Behaviour

- MUST be accepted.

## Hex Fixture

- `11_buds_t2_l2_anchor.hex` — **TODO: to be generated**.
