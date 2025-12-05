# plain_hello_world.tlv

## Summary

Simplest possible segOP TEXT TLV: `"Hello world"` with **no BUDS tier or type markers**.

## Intended Structure (conceptual)

TLV sequence:

- Single TEXT TLV
  - Type: TEXT
  - Value: `"Hello world"`

## Expected Classification

- `buds_tier = UNSPECIFIED`
- `buds_type = UNSPECIFIED`
- `arbda_tier = T3` (default for unlabelled segOP payloads)

## Notes

- `plain_hello_world.tlv` is currently an **empty placeholder**.
- Intended to be filled with correct TLV bytes by future tooling.
