# 20_buds_conflicting_tiers

## Summary

segOP payload with conflicting BUDS tier markers: one TLV says T1, another says T3.

## segOP Payload (conceptual)

- Tier TLV: `0xF0 = 0x10` → T1
- Tier TLV: `0xF0 = 0x30` → T3
- Data TLVs may follow (text/json/blob)

## Expected Classification

- `presence.has_t1 = true`
- `presence.has_t3 = true`
- `ambiguous = true`
- `tier = AMBIGUOUS`
- `arbda_tier = T3` (because T3 present)

## Expected Behaviour

- Whether this is **consensus-invalid** or just "classified as ambiguous" depends on policy:
  - For now, used as a behavioural test to confirm ARBDA classification and ambiguity flags.

## Hex Fixture

- `20_buds_conflicting_tiers.hex` — **TODO: to be generated**.
