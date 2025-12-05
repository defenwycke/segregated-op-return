# buds_t1_textnote.tlv

## Summary

Example segOP TLV payload representing a **BUDS T1 metadata text note**.

This file is intended as a **small, human-auditable TLV** that can be:

- embedded into a segOP transaction, or
- used in unit tests / tooling demos.

## Intended Structure (conceptual)

TLV sequence:

1. Tier TLV
   - Type: `0xF0` (BUDS tier)
   - Value: `0x10` → `T1_METADATA`

2. Type TLV
   - Type: `0xF1` (BUDS type)
   - Value: `0x01` → `TEXT_NOTE`

3. Text TLV
   - Type: TEXT
   - Value: `"BUDS structured test"`

## Expected Classification (BUDS / ARBDA)

- `buds_tier = T1_METADATA`
- `buds_type = TEXT_NOTE`
- `arbda_tier = T1`

## Notes

- `buds_t1_textnote.tlv` is currently an **empty placeholder**; real binary TLV bytes should be generated using `gen_tlv.py` or similar tooling.
