# segOP Lab Scripts

This directory contains helper scripts for the segOP lab test suite.

------------------------------------------------------------
gen_tlv.py
------------------------------------------------------------

gen_tlv.py generates TLV payloads (binary) for use in examples and tests.

Supported TLV types:
  - TEXT
  - JSON
  - BLOB
Optional:
  - BUDS tier TLV (T1_METADATA, T2_OPERATIONAL, T3_ARBITRARY)
  - BUDS type TLV (TEXT_NOTE, L2_STATE_ANCHOR, PROOF_REF)

Usage:

  ./scripts/gen_tlv.py --out OUTPUT.tlv [--buds-tier TIER] [--buds-type TYPE] (--text STR | --json JSON | --blob-hex HEX)

Where:
  --out       Path to write the TLV binary payload
  --text      Create a TEXT TLV
  --json      Create a JSON TLV
  --blob-hex  Create a BLOB TLV from hex bytes
  --buds-tier Optional BUDS tier marker
  --buds-type Optional BUDS type marker

Examples used in this lab:

  ./scripts/gen_tlv.py --out examples/text/plain_hello_world.tlv --text "Hello world"

  ./scripts/gen_tlv.py \
    --out examples/text/buds_t1_textnote.tlv \
    --buds-tier T1_METADATA \
    --buds-type TEXT_NOTE \
    --text "BUDS structured test"

  ./scripts/gen_tlv.py --out examples/json/simple_object.tlv --json '{"foo":"bar","n":42}'

  ./scripts/gen_tlv.py --out examples/blob/small_blob_deadbeef.tlv --blob-hex deadbeef00ff

This file documents only the basics. For TLV bytes, see:
  segop/lab/examples/*
