# 03_json_unlabelled

## Summary

segOP payload with a JSON TLV: `{"foo":"bar","n":42}`.  
No BUDS tier or type markers.

## segOP Payload (conceptual)

- TLV type = `0x02` (JSON)
- JSON UTF-8 body: `{"foo":"bar","n":42}`
- No BUDS tier/type TLVs

## Expected Classification

- TLV `kind = "json"`
- `buds_tier = UNSPECIFIED`
- `buds_type = UNSPECIFIED`
- `arbda_tier = T3`

## Expected Behaviour

- Transaction MUST be accepted.
- RPC should parse JSON into:
  - `foo = "bar"`
  - `n = 42`

## Hex Fixture

- `03_json_unlabelled.hex` — **TODO: to be generated**.
