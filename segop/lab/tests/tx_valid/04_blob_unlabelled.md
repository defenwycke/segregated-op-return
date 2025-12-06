# 04_blob_unlabelled

## Summary

This test demonstrates a segOP payload containing a single **BLOB TLV** whose value is the raw byte sequence:

`deadbeef00ff`

There are no BUDS Tier or Type markers present, so classification is:

- buds_tier = UNSPECIFIED
- buds_type = UNSPECIFIED
- arbda_tier = T3

This is the canonical example of an unlabelled binary/blob segOP payload.

---

## segOP Payload TLV

Raw TLV payload (hex):

`0306deadbeef00ff`

Breakdown:

- type: `0x03` (blob)
- length: 6 bytes
- value (hex): `deadbeef00ff`

---

## Expected decode (decodesegop)

```
{
"has_segop": true,
"version": 1,
"size": 8,
"hex": "0306deadbeef00ff",
"buds_tier_code": "0xff",
"buds_tier": "UNSPECIFIED",
"buds_type_code": "0xff",
"buds_type": "UNSPECIFIED",
"arbda_tier": "T3",
"tlv": [
{
"type": "0x03",
"length": 6,
"value_hex": "deadbeef00ff",
"kind": "blob"
}
]
}
```

---

## Raw Transaction (fixture)

File: `04_blob_unlabelled.hex`

```
02000000000301b45d243f7beaf1e34bfe3b0754cce0d3900b62b32f39814e544c4f9d4fe8b8db0000000000fdffffff0310270000000000001600147c07bf59b4f8ec2b6bc221da30ed6bd1b34ae3a86ec5052a01000000160014e01ebe10826315f11fe687eadd701f2bb3b70b6d0000000000000000276a255032534f508951127c1de4d38fbbfbf6a8e40b31c8b759019d9d6af1b076a2fed0c15b8b8902473044022030e97924858057a93de59432fa3b26efb0492cf21c43bc5c5cc5809391075d5702204667f8956892443617ceb116a6ecab0aa46d1cb17a238f2b6651c7de10b199550121034fe769c380a4cde346852ca7c2eb2e7d6ba40087835a0a33fa3d38074f28019b5301080306deadbeef00ff00000000
```

---

## Expected JSON Fixture

File: `04_blob_unlabelled.json`

```
{
"has_segop": true,
"version": 1,
"size": 8,
"hex": "0306deadbeef00ff",
"buds_tier_code": "0xff",
"buds_tier": "UNSPECIFIED",
"buds_type_code": "0xff",
"buds_type": "UNSPECIFIED",
"arbda_tier": "T3",
"tlv": [
{
"type": "0x03",
"length": 6,
"value_hex": "deadbeef00ff",
"kind": "blob"
}
]
}
```

---
