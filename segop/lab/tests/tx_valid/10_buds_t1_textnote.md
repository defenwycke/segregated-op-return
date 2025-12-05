# 10_buds_t1_textnote

## Summary

BUDS T1_METADATA + TEXT_NOTE type + TEXT body `"BUDS structured test"`.

## segOP Payload (conceptual)

1. Tier TLV:
   - Type: `0xF0`
   - Value: `0x10` → T1_METADATA

2. Type TLV:
   - Type: `0xF1`
   - Value: `0x01` → TEXT_NOTE

3. Text TLV:
   - Type: TEXT
   - Value: `"BUDS structured test"`

## Expected Classification

- `buds_tier = T1_METADATA`
- `buds_type = TEXT_NOTE`
- `arbda_tier = T1`

## Expected Behaviour

- MUST be accepted.
- RPC should expose tier/type & text body.

## Hex Fixture

- `10_buds_t1_textnote.hex` — **TODO: to be generated**.
