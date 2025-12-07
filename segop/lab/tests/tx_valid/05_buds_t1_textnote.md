# 05_buds_t1_textnote

## Summary

This test demonstrates a segOP payload explicitly classified as a BUDS Tier 1 metadata text note.

The segOP lane contains:

- A text TLV holding a human-readable note: “BUDS T1 text note”.
- BUDS tier and type markers indicating Tier 1 metadata and TEXT_NOTE.

The expected high-level classification is:

- buds_tier = T1_METADATA
- buds_type = TEXT_NOTE
- arbda_tier = T1

## segOP payload expectations

The TLV sequence in the segOP lane, as reported by `decodesegop`, is:

- A BUDS tier TLV (`type = 0xf0`, length 1, value 0x10) marking Tier 1 metadata.
- A BUDS type TLV (`type = 0xf1`, length 1, value 0x01) marking TEXT_NOTE.
- A TEXT TLV (`type = 0x01`, length 17) whose value decodes to the UTF-8 string “BUDS T1 text note”.

The top-level `hex` field for the segOP payload is:

- `f00110f101010111425544532054312074657874206e6f7465`

## Expected decode (decodesegop)

Key fields from the decodesegop JSON:

- has_segop = true
- version = 1
- buds_tier_code = 0x10
- buds_tier = "T1_METADATA"
- buds_type_code = 0x01
- buds_type = "TEXT_NOTE"
- arbda_tier = "T1"

The `tlv` array includes:

- A `buds_tier` TLV with value 0x10.
- A `buds_type` TLV with value 0x01.
- A `text` TLV with the string "BUDS T1 text note".

Together, these confirm that this payload is a Tier 1 metadata text note.

## CLI recipe (brief)

1. Generate a fresh destination address in the `lab` wallet.
2. Call `segopsend` with encoding = "text", passing the note string and specifying:
   - buds_tier = "T1_METADATA"
   - buds_type = "TEXT_NOTE"
   - p2sop = true
3. Retrieve the raw transaction with `getrawtransaction` and decode the segOP lane with `decodesegop` to confirm the expected Tier 1 metadata classification.

## Fixture files

- Hex fixture: `segop/lab/tests/tx_valid/05_buds_t1_textnote.hex`
- JSON fixture: `segop/lab/tests/tx_valid/05_buds_t1_textnote.json`

Both fixtures are derived from transaction:

- txid = `cbb358722962d522d0ac4b774b504a43f73e19f3585718a843c21b3660180e73`
