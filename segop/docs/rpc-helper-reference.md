# SegOP RPC Helper Reference
**Hyper Hash / segOP Bitcoin Core Fork – Developer RPC Guide**  
**Last updated:** 18-Nov-2025

This guide documents the custom RPC methods introduced by the segOP-enabled Bitcoin Core fork.

---

## Overview

SegOP adds a small set of RPCs that extend node functionality **without modifying any existing Bitcoin Core RPC**.

Goals:

- Clean TLV decoding  
- Wallet-friendly segOP transaction construction  
- P2SOP debugging tools  
- Full compatibility with Bitcoin Core  

Current RPC set:

- `decodesegop`
- `segopsend`
- `getsegopdata`
- (internal helpers used indirectly)

---

# 1. Inspection RPCs

## `decodesegop "rawtxhex"`

Decode segOP payloads and TLV sequences from any raw transaction.

### Usage

```
btccli decodesegop "$RAW_TX"
```

### Example Output

```
{
  "has_segop": true,
  "version": 1,
  "size": 34,
  "hex": "0109666972737420544c56010a7365636f6e6420544c56...",
  "tlv": [
    {
      "type": "0x01",
      "length": 9,
      "value_hex": "666972737420544c56",
      "text": "first TLV",
      "kind": "text"
    }
  ]
}
```

### Decoder Behaviour

- Handles malformed segOP payloads safely  
- Returns `"has_segop": false` for non-segOP transactions  
- Supports:
  - TEXT TLVs (0x01)  
  - JSON TLVs (0x02)  
  - BLOB TLVs (0x03)  
  - Unknown TLVs (kind = "unknown")  

---

# 2. Wallet Construction RPCs

## `segopsend "address" amount "payload" options`

Creates and funds a segOP-enabled transaction, optionally with a P2SOP commitment.

### Required Arguments

| Arg | Type | Description |
|------|-------|-------------|
| address | string | Destination Bitcoin address |
| amount | number | Amount in BTC |
| payload | string | Depends on encoding mode |
| options | object | JSON object defining segOP behavior |

### Options Supported

| Field | Type | Description |
|-------|-------------|----------------|
| version | number | segOP version (default 1) |
| encoding | string | `"text"`, `"text_multi"`, `"json"`, `"blob"`, `"hex"` |
| p2sop | bool | Include P2SOP output |
| texts | array<string> | Required for `"text_multi"` |
| data | any | Input for JSON TLV |
| data_hex | string | Input for blob TLV |
| subtract_fee_from_output | bool | Optional |

---

## Encoding Modes

### 2.1 `text` (single TLV)

```
btccli segopsend "$ADDR" 0.001 "hello world" \
'{"encoding":"text","version":1,"p2sop":true}'
```

---

### 2.2 `text_multi` (multiple TLVs)

```
btccli segopsend "$ADDR" 0.001 "ignored" \
'{
  "encoding":"text_multi",
  "version":1,
  "p2sop":true,
  "texts": ["first TLV", "second TLV", "third TLV"]
}'
```

Produces TLVs:

```
01 09 <first bytes>
01 0A <second bytes>
01 09 <third bytes>
```

---

### 2.3 `json` (JSON TLV)

```
btccli segopsend "$ADDR" 0.001 "" \
'{"encoding":"json","version":1,"p2sop":true,"data":{"foo":"bar","n":42}}'
```

Decoded:

```
{
  "type": "0x02",
  "length": 20,
  "text": "{\"foo\":\"bar\",\"n\":42}",
  "parsed": { "foo": "bar", "n": 42 },
  "kind": "json"
}
```

---

### 2.4 `blob` (raw bytes)

```
btccli segopsend "$ADDR" 0.001 "" \
'{"encoding":"blob","version":1,"p2sop":true,"data_hex":"deadbeef"}'
```

Decoded:

```
{
  "type": "0x03",
  "length": 4,
  "value_hex": "deadbeef",
  "kind": "blob"
}
```

---

### 2.5 `hex` (legacy mode → also blob)

```
btccli segopsend "$ADDR" 0.001 "deadbeef" \
'{"encoding":"hex","version":1,"p2sop":true}'
```

---

# 3. Utility RPCs

## `getsegopdata "txid"`

Returns only the segOP payload, without other tx fields.

### Example

```
btccli getsegopdata "$TXID"
```

Output:

```
{
  "hex": "0109666972737420...",
  "text": "first TLV"
}
```

---

# 4. Developer Validation RPCs

## `segopvalidate "rawtxhex"`
*(Developer builds only)*

Checks:

- segOP version  
- TLV validity  
- P2SOP commitment integrity  
- Payload length rules  

Usage:

```
btccli segopvalidate "$RAW_TX"
```

---

# 5. P2SOP Helpers

## `getp2sop "rawtxhex"`

Returns:

- Commitment hash  
- P2SOP scriptPubKey  
- Output index  
- Raw bytes  

---

# End of Document
