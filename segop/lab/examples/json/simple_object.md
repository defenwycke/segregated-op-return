# simple_object.tlv

## Summary

JSON TLV containing a small, friendly object:
{"foo": "bar", "n": 42}

## Intended Structure (conceptual)

- TLV type: 0x02 (JSON)
- Value: UTF-8 encoded JSON string:
  {"foo":"bar","n":42}

## Expected Classification

- kind = "json"
- buds_tier = UNSPECIFIED
- buds_type = UNSPECIFIED
- arbda_tier = T3

## Notes

- simple_object.tlv is an empty placeholder.
- Use generator tooling to create canonical JSON TLV bytes.
