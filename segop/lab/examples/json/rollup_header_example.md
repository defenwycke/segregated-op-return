# rollup_header_example.tlv

## Summary

JSON TLV representing a T2 L2 state anchor (e.g. rollup batch header).

## Intended Structure (conceptual)

TLV sequence:

1. Tier TLV
   - 0xF0 = 0x20  (T2_OPERATIONAL)

2. Type TLV
   - 0xF1 = <L2_STATE_ANCHOR>

3. JSON TLV
   - Type: 0x02 (JSON)
   - Value: object such as:
     {
       "l2_chain": "example-rollup",
       "batch_height": 123,
       "batch_root": "abcdef...1234"
     }

## Expected Classification

- buds_tier = T2_OPERATIONAL
- buds_type = L2_STATE_ANCHOR
- arbda_tier = T2

## Notes

- rollup_header_example.tlv is an empty placeholder.
