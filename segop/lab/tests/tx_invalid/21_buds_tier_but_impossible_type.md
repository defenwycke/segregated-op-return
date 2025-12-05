# 21_buds_tier_but_impossible_type

## Summary

Tier TLV declares one tier, but the type code used is reserved for a different tier (or undefined).

## segOP Payload (conceptual)

- Tier TLV: e.g. `0xF0 = 0x10` → T1
- Type TLV: `0xF1 = <code that is invalid for T1>`  
  (e.g. code reserved for a T2-only type or unknown)

## Expected Classification

- `buds_tier` derived from tier TLV (e.g. T1_METADATA)
- `buds_type` resolved to `UNKNOWN` / `UNSPECIFIED`
- ARBDA tier derived solely from tier presence (e.g. T1)

## Expected Behaviour

- Typically still accepted at consensus level.
- Used as a behavioural test to confirm:
  - How unknown / mismatched type codes are surfaced.
  - That ARBDA tiering does not break.

## Hex Fixture

- `21_buds_tier_but_impossible_type.hex` — **TODO: to be generated**.
