#!/usr/bin/env python3
"""
gen_tlv.py - simple TLV payload generator for segOP lab.

Generates TLV sequences for:
  - TEXT
  - JSON
  - BLOB (hex)

with optional BUDS tier/type markers prepended.

Examples:

  python gen_tlv.py --out ../examples/text/plain_hello_world.tlv \
      --text "Hello world"

  python gen_tlv.py --out ../examples/text/buds_t1_textnote.tlv \
      --buds-tier T1_METADATA --buds-type TEXT_NOTE \
      --text "BUDS structured test"

  python gen_tlv.py --out ../examples/json/simple_object.tlv \
      --json '{"foo":"bar","n":42}'

  python gen_tlv.py --out ../examples/blob/small_blob_deadbeef.tlv \
      --blob-hex deadbeef00ff
"""

import argparse
from typing import Optional, List

# TLV type codes (1 byte each)
TLV_TYPE_TEXT = 0x01
TLV_TYPE_JSON = 0x02
TLV_TYPE_BLOB = 0x03
TLV_TYPE_BUDS_TIER = 0xF0
TLV_TYPE_BUDS_TYPE = 0xF1

# BUDS tier codes (value bytes for TLV_TYPE_BUDS_TIER)
BUDS_TIER_CODES = {
    "T1_METADATA": 0x10,
    "T2_OPERATIONAL": 0x20,
    "T3_ARBITRARY": 0x30,
}

# BUDS type codes (value bytes for TLV_TYPE_BUDS_TYPE)
# Placeholder values; adjust to match the official registry when final.
BUDS_TYPE_CODES = {
    "TEXT_NOTE": 0x01,
    "L2_STATE_ANCHOR": 0x02,
    "PROOF_REF": 0x03,
}


def encode_compact_size(n: int) -> bytes:
    """Encode integer as Bitcoin CompactSize."""
    if n < 0:
        raise ValueError("CompactSize cannot encode negative values")
    if n < 0xFD:
        return bytes([n])
    if n <= 0xFFFF:
        return b"\xfd" + n.to_bytes(2, "little")
    if n <= 0xFFFFFFFF:
        return b"\xfe" + n.to_bytes(4, "little")
    if n <= 0xFFFFFFFFFFFFFFFF:
        return b"\xff" + n.to_bytes(8, "little")
    raise ValueError("CompactSize value too large")


def make_tlv(type_byte: int, value: bytes) -> bytes:
    """Build a TLV: [type][CompactSize(len)][value]."""
    if not (0 <= type_byte <= 0xFF):
        raise ValueError("type_byte must be 0..255")
    length = encode_compact_size(len(value))
    return bytes([type_byte]) + length + value


def build_buds_tlvs(buds_tier: Optional[str], buds_type: Optional[str]) -> List[bytes]:
    """Optional BUDS tier/type TLVs."""
    chunks: List[bytes] = []

    if buds_tier is not None:
        code = BUDS_TIER_CODES.get(buds_tier)
        if code is None:
            raise SystemExit(f"Unknown BUDS tier: {buds_tier}")
        chunks.append(make_tlv(TLV_TYPE_BUDS_TIER, bytes([code])))

    if buds_type is not None:
        code = BUDS_TYPE_CODES.get(buds_type)
        if code is None:
            raise SystemExit(f"Unknown BUDS type: {buds_type}")
        chunks.append(make_tlv(TLV_TYPE_BUDS_TYPE, bytes([code])))

    return chunks


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate segOP TLV payloads for lab examples/tests."
    )

    parser.add_argument(
        "--out",
        required=True,
        help="Output file path for the TLV payload (binary).",
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--text",
        help="Generate a TEXT TLV with the given UTF-8 string.",
    )
    group.add_argument(
        "--json",
        help="Generate a JSON TLV with the given JSON string.",
    )
    group.add_argument(
        "--blob-hex",
        help="Generate a BLOB TLV from raw hex bytes (e.g. deadbeef00ff).",
    )

    parser.add_argument(
        "--buds-tier",
        choices=sorted(BUDS_TIER_CODES.keys()),
        help="Optional BUDS tier marker to prepend (e.g. T1_METADATA).",
    )
    parser.add_argument(
        "--buds-type",
        choices=sorted(BUDS_TYPE_CODES.keys()),
        help="Optional BUDS type marker to prepend (e.g. TEXT_NOTE).",
    )

    args = parser.parse_args(argv)

    chunks: List[bytes] = []

    # Optional BUDS metadata first
    chunks.extend(build_buds_tlvs(args.buds_tier, args.buds_type))

    # Main TLV
    if args.text is not None:
        value = args.text.encode("utf-8")
        chunks.append(make_tlv(TLV_TYPE_TEXT, value))
    elif args.json is not None:
        value = args.json.encode("utf-8")
        chunks.append(make_tlv(TLV_TYPE_JSON, value))
    elif args.blob_hex is not None:
        try:
            value = bytes.fromhex(args.blob_hex)
        except ValueError:
            raise SystemExit("blob-hex must be valid hex (e.g. deadbeef00ff)")
        chunks.append(make_tlv(TLV_TYPE_BLOB, value))
    else:
        raise SystemExit("No TLV content specified")

    payload = b"".join(chunks)

    # Write to file
    with open(args.out, "wb") as f:
        f.write(payload)

    # Print hex to stdout for convenience
    print(payload.hex())

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
