# segOP-Extended Transaction Specification

**Name:** segOP (Segregated OP_RETURN)  
**Author:** Defenwycke  
**Version:** draft-1.1  
**Date:** November 2025  
**Status:** Pre-BIP draft (normative spec)  

## 1. Overview

segOP (Segregated OP_RETURN) introduces a dedicated, prunable data section to Bitcoin transactions, positioned **after SegWit witness data** and **before nLockTime**, fully charged at `4 WU / byte`.

The segOP lane:

- Holds arbitrary or structured payloads (e.g. inscriptions, commitments, vault metadata, rollup roots).  
- Is logically separate from both `scriptSig` and witness data.  
- Is cryptographically bound to the transaction via a **P2SOP** (Pay-to-SegOP) commitment output.  
- Enables nodes to **prune payload bytes** after validation and sufficient block depth while preserving consensus validity.  
- Is soft-fork compatible and invisible to legacy nodes.

Legacy nodes compute the same `txid` and consider segOP-bearing transactions valid without parsing segOP. segOP-aware nodes enforce payload rules and may select their own pruning or archival storage policy.

### 1.1 Why segOP — The Complete Rationale

Bitcoin already allows arbitrary data, and in many cases requires it to function as self-custodial, censorship-resistant money. The problem is not the existence of arbitrary data — the problem is that Bitcoin has no dedicated, fairly-priced, structured, or prunable lane for it. segOP introduces exactly that lane, fixing long-standing structural issues without breaking txid/wtxid, scripts, or legacy nodes.

Below is a unified explanation of why Bitcoin needs segOP and why segOP makes Bitcoin stronger.

**Bitcoin Needs Arbitrary Data to Function as Money**

A global, permissionless monetary system must allow structured arbitrary data because:

**Self-custody requires data**

Multisig, vaults, timelocks, inheritance chains, and hardware-wallet workflows all depend on small metadata commitments.

**Multi-party ownership requires data**

LN channels, DLCs, channel factories, escrow flows, and federated custody require adaptor sigs, keys, state markers, and other metadata.

**L2s require data**

Lightning, rollups, fraud/validity proofs, oracle attestations, and sidechain/bridge proofs all require state commitments embedded in L1.

**Censorship resistance requires data**

Anti-censorship proofs, state anchors, and dispute mechanisms depend on on-chain commit/reveal structures.

**Auditability and monetary transparency require data**

Proof-of-liabilities, custody proofs, routing policies, vault policies, and contract identifiers all need structured auxiliary data.

**Crypto transitions require data**

Hybrid signatures, quantum migration paths, and key-rotation metadata depend on small arbitrary data fields.

**Conclusion:**

Bitcoin cannot operate as secure, global, self-custodial money without the ability to commit structured data.

The question is not whether Bitcoin should support data — it’s how.

### 1.2 Bitcoin’s Current Data Story Is Broken

Bitcoin permits arbitrary data in:

- OP_RETURN
- scriptSig
- SegWit witness (with a discount)
- Taproot annex
- Tapscript pushes
- multi-output fragmentation schemes
- hacks involving multi-input witness stuffing

But:

**No structure**

No mandatory framing → explorers, wallets, L2s all reinvent incompatible encoding.

**No consistent pricing**

Witness discount massively subsidises arbitrary data, enabling inscriptions to outcompete financial transactions.

**No commitment model**

Data is not tightly bound to a provable commitment that allows safe pruning.

**No retention model**

Nodes do not know what to keep, what they may prune, or for how long.

**No place to redirect data**

Because no legitimate data lane exists, Core cannot tighten rules on witness or OP_RETURN without breaking existing protocols.

This is why Bitcoin has witnessed two years of:

- fee turbulence,
- spam cycles,
- witness abuse,
- block weight spikes,
- and indexing chaos.

### 1.3 segOP Fixes All of These Problems in the Minimal Way

**A dedicated post-witness data lane**

Placed after witness and before nLockTime using the existing marker/flag mechanism. No new IDs required, txid/wtxid preserved.

**Full fee fairness**

Every segOP byte costs 4 WU/byte
    - No more witness discount abuse
    - Data pays its full footprint
    - Financial transactions regain priority

**Mandatory TLV structure**

Every payload becomes:

```
[type][len][value]
```

This gives:

- deterministic parsing
- forwards/backwards compatibility
- structured metadata
- clean indexing and tooling
- safe skipping of unknown types

**Commitment binding via P2SOP**

A single OP_RETURN output commits to the entire segOP payload using a tagged hash. This gives strong guarantees for:

- L2 state roots
- vault metadata
- proofs
- robust anti-censorship anchoring
- reorg resilience

**Prunability — the first safe data-pruning model in Bitcoin’s history**

Nodes:

- Validate segOP payload (mandatory)
- Verify commitment
- Retain for 24 blocks (mandatory window)
- MAY prune afterwards without weakening consensus
- This makes long-term node storage predictable and lightweight.

**Clear retention windows**

- Validation Window (24 blocks)
- Operator Window (optional R)
- Archive Window (full retention)

No ambiguity. No accidental consensus forks.

**P2P integration with strict DoS protections**

- Dedicated getsegopdata / segopdata messages ensure:
- minimal bandwidth
- bounded per-peer usage
- controlled data fetching
- consistent compact-block behaviour

### 1.4 segOP Strengthens Bitcoin’s Anti-Spam / Anti-Abuse Defences

Once segOP provides a dedicated lane for full-fee, structured data, Core can safely:

**Tighten witness rules (policy)**

Reduce witness discount misuse without breaking LN or multisig.

**Tighten OP_RETURN (policy)**

Lower limits or restrict multi-push inscription hacks.

**Tighten scriptSig pushes (policy)**

Move all non-script-related data out of scripts entirely.

**Enforce saner relay rules**

Since sanity checks and TLV rules exist, malformed or abusive payloads are rejected early.

**Enforce predictable block weight economics**

Data-heavy protocols must pay full cost, preventing subsidised congestion cycles.

segOP is the foundation that lets Core defuse the current data/spam war safely and cleanly.

### 1.5 segOP Improves Bitcoin as Money

By enabling small amounts of structured, prunable, fully-priced arbitrary data, Bitcoin gains:

**Stronger self-custody**

(vaults, inheritance logic, secure multi-key systems)

**Stronger multi-party money**

(LN, DLCs, escrow, factories, cross-chain coordination)

**Stronger scalability**

(rollups, proofs, compact L2 state transitions)

**Stronger censorship resistance**

(commit/reveal schemes, proof-of-publication)

**Stronger auditability**

(feedback loops between custodians, users, and the chain)

**Stronger long-term security**

(quantum-safe migration metadata, hybrid signature paths)

Bitcoin becomes more trust-minimised, more decentralised, and more secure, not less.

**Summary**

segOP gives Bitcoin the dedicated, structured, full-fee, prunable data lane it has always needed — enabling self-custody, L2 scalability, censorship-resistance and future script evolution — while finally giving Core the tools to contain and price arbitrary data fairly and end the witness-abuse spam cycle.

## 2. Key Properties

**Post-witness data lane:**

`core tx → witness? → segOP? → nLockTime`

**Full-fee accounting:**  

Every segOP byte is charged at **4 weight units / byte** (no SegWit discount).

**Commitment binding via P2SOP:**  

A dedicated OP_RETURN output commits to a tagged SHA256 of the segOP payload using the tagged-hash convention defined in §7.1:

```
segop_commitment = TAGGED_HASH("segop:commitment", segop_payload)
```

where TAGGED_HASH(tag, msg) is defined in §7.1 as:

```
TAG = SHA256(tag)
TAGGED_HASH(tag, msg) = SHA256(TAG || TAG || msg)
```

Unified marker + flag signaling:

```
marker = 0x00
```

flag bitfield:

`0x01` = SegWit present

`0x02` = segOP present

`0x04` and above = reserved

Prunable payloads:

Nodes must fully validate segOP payload bytes on block acceptance.

After validation and after the payload falls outside their retention window, nodes MAY prune only the segOP payload bytes, while retaining all consensus-critical block, tx, script, and commitment data.

Soft-fork compatible:

- `txid` and `wtxid` are unchanged; legacy nodes accept `segOP` transactions.

## 3. Transaction Wire Layout

Extended transactions appear on the wire as follows:

```
    [ nVersion (4 bytes, LE) ]

    [ marker (1) = 0x00 ]
    [ flag   (1) = bitfield {SegWit = 0x01, segOP = 0x02} ]

    [ vin_count (varint) ]
      repeat vin_count times:
        [ prevout_hash  (32, LE) ]
        [ prevout_index (4, LE) ]
        [ scriptSig_len (varint) ]
        [ scriptSig     (bytes) ]
        [ nSequence     (4, LE) ]

    [ vout_count (varint) ]
      repeat vout_count times:
        [ value             (8, LE) ]
        [ scriptPubKey_len  (varint) ]
        [ scriptPubKey      (bytes) ]

    if (flag & 0x01) // SegWit
      [ witness for each input ]

    if (flag & 0x02) // segOP
      [ segop_marker  = 0x53 ('S') ]
      [ segop_version    = 0x01 ]        # segOP v1
      [ segop_len     (varint) ]
      [ segop_payload (segop_len bytes) ]

    [ nLockTime (4, LE) ]
```

SegWit and segOP can appear independently or together.

### 3.1 Extended Transaction Serialization

segOP reuses the SegWit “marker + flag” mechanism defined in BIP144. No new top-level fields are introduced; instead, the vin count of 0x00 followed by a non-zero flag byte signals the presence of optional extensions.

There are therefore two encodings:

Legacy / non-extended:

```
nVersion
vin_count (≠ 0x00)
vin[0..]
vout[0..]
nLockTime
```

Extended (SegWit, segOP, or both):

```
nVersion
marker = 0x00        ; encoded as vin_count = 0x00
flag   ≠ 0x00        ; bitfield, see below
vin[0..]
vout[0..]
[witnesses...]       ; present if (flag & 0x01) != 0
[segOP lane...]      ; present if (flag & 0x02) != 0
nLockTime
```

### 3.2 Marker and Flag

The extended transaction format reuses the SegWit marker/flag mechanism:

- `marker` is always the single byte `0x00`, in the position where a legacy `vin_count` would appear.
- `flag` is the following 1-byte **global extension bitfield**.

In segOP v1 the global `flag` byte uses:

- bit 0 (`0x01`): SegWit present  
- bit 1 (`0x02`): segOP present  
- bits 2–7 (`0x04`–`0x80`): reserved for future extensions

In segOP v1, bits 2–7 of the global flag byte MUST be zero. Transactions with any of these bits set MUST be rejected under segOP consensus rules.

The full normative definition and examples for `marker` and `flag` are given in §4.

### 3.3 segOP lane placement

When the **segOP bit in the global flag** is set (`flag & 0x02 != 0`), the segOP lane is encoded after all inputs and outputs, and after any SegWit witness data:

```
nVersion
marker = 0x00
flag
vin[0..]
vout[0..]
[witnesses...] ; if (flag & 0x01) != 0
segop_marker = 0x53 ; ASCII 'S'
segop_version = 0x01 ; segOP v1
segop_len (CompactSize) ; total payload bytes
segop_payload [0..len-1] ; TLV-encoded payload
nLockTime
```

Any value of `segop_marker` other than `0x53` MUST be rejected as invalid.

`segop_version` is a **version byte**, not a bitfield. For segOP v1 it MUST be `0x01`. Future versions MAY use different values, but all segOP sections MUST still follow this placement: after any SegWit witness data and before `nLockTime`.



### 3.4 segOP and Transaction Weight

For the purposes of transaction weight, segOP behaves like non-witness data:

- segOP bytes are counted in the stripped size of the transaction.
- segOP bytes are not counted as witness and receive no discount.
- segOP does not change how txid or wtxid are defined:
    - txid is computed over the legacy non-witness serialization that excludes marker, flag, witness, and segOP (see §7.2.1).
    - wtxid is computed as in BIP141 and also ignores segOP bytes (see §7.2.2).

For weight, implementations MUST:

```
stripped_size = size of the transaction when encoded without any witness data, but including segOP marker/version/length/payload if present.

witness_size  = size of all SegWit witness data (if any)

weight = (stripped_size * 4) + witness_size
```

Put simply:

- segOP bytes are part of the stripped/base transaction for weight.
- segOP bytes are charged at the full 4 WU / byte rate.
- segOP bytes do not appear in the txid or wtxid serializations.

## 4. Marker and Flag Definition

### 4.1 Marker and Flag

| Field  | Size | Value | Purpose |
|--------|------|--------|----------|
| marker | 1    | 0x00   | Signals extended transaction format |
| flag   | 1    | bitfield | Indicates presence of SegWit and/or segOP |

### 4.2 Flag Bits

| Bit | Hex  | Meaning |
|-----|------|----------|
| 0   | 0x01 | SegWit present |
| 1   | 0x02 | segOP present |
| 2   | 0x04 | Reserved |

### 4.3 Examples

| Flag | Binary     | Meaning           |
|------|------------|-------------------|
| 0x01 | 00000001   | SegWit only       |
| 0x02 | 00000010   | segOP only        |
| 0x03 | 00000011   | SegWit + segOP    |

For SegWit + segOP, bytes after `nVersion` are: `00 03`.

### 4.4 Parsing Rules

**Legacy Compatibility**  

Legacy nodes misinterpret `marker=0x00`, so upgraded nodes detect the marker–flag pair before normal parsing.

**Extended Detection**  

- If `flag & 0x01`, SegWit follows `vout`.
- If `flag & 0x02`, segOP follows SegWit (or directly after vout).

**Pruning Behaviour**  

After a block has been fully validated (including segOP payload and P2SOP commitment) and its segOP payload has been pruned, nodes MAY omit re-reading or re-validating the pruned segOP bytes during later history checks (for example, re-verifying old blocks), because any modification to the segOP payload would change the P2SOP commitment, Merkle root, and block hash.

## 5. segOP Section

### 5.1 segOP Section Definition

A segOP section is appended:

```
[ segop_marker = 0x53 ]
[ segop_version   = 0x01 ]
[ segop_len    <varint> ]
[ segop_payload ]
```

A segOP section is defined as the contiguous sequence:

```
[ segop_marker ][ segop_version ][ segop_len ][ segop_payload ]
```

A transaction with segOP present MUST contain exactly one such segOP section.

Consensus:

- `segop_version` MUST be `0x01` for v1.
- `segop_len` MUST NOT exceed `MAX_SEGOP_TX_BYTES`.
- Payload length MUST match encoding exactly.
- The transaction MUST contain exactly one `P2SOP output`.
- The transaction MUST contain exactly one `segOP` section.
- `P2SOP` MUST NOT appear in non-segOP transactions.
- `segOP` MUST appear only after `SegWit` (if present) and before `nLockTime`.

### 5.2 TLV Type Registry (v1)

segOP payloads are encoded as a sequence of TLV records:

- `type` – 1 byte
- `length` – CompactSize (Bitcoin varint)
- `value` – `length` bytes

Consensus validation (`SegopIsValidTLV`) is **type-agnostic** and only enforces:

- well-formed CompactSize length
- no overrun
- exact end of buffer (no slack)
- global payload size ≤ `MAX_SEGOP_PAYLOAD_SIZE`

This section defines a **non-exhaustive registry** of recommended TLV types for segOP v1.  
Nodes and applications MUST treat unknown `type` values as opaque binary bytes.

#### 5.2.1 Core v1 types

| Type  | Name        | Encoding            | Intended use                                                                 |
|-------|-------------|---------------------|------------------------------------------------------------------------------|
| 0x01  | TEXT_UTF8   | UTF-8 text          | Human-readable labels, comments, app identifiers, small metadata strings.    |
| 0x02  | JSON_UTF8   | UTF-8 JSON          | Structured metadata as JSON objects/arrays (small configs, headers, etc.).   |
| 0x03  | BINARY_BLOB | Opaque byte string  | Hashes, Merkle roots, proofs, app-specific binary / CBOR / protobuf, etc.    |

- **Type 0x01 (TEXT_UTF8)**  
  - `value` MUST be valid UTF-8.  
  - Wallets and RPCs SHOULD render this as a plain text string.

- **Type 0x02 (JSON_UTF8)**  
  - `value` SHOULD be UTF-8 JSON (object/array).  
  - Wallets and RPCs SHOULD attempt to parse it as JSON and may fall back to raw text or hex on parse failure.

- **Type 0x03 (BINARY_BLOB)**  
  - `value` is an opaque byte string with no imposed structure.  
  - Higher-layer protocols (rollups, vaults, qsig, etc.) MAY standardise their own conventions for 0x03 values.

#### 5.2.2 Unknown types

- Future BIPs or L2 protocols MAY define additional `type` values.  
- segOP consensus rules remain **agnostic** to the registry; unknown `type`s are accepted as long as TLV structure and global size are valid.  
- Wallets and RPCs SHOULD at minimum expose:
  - `type` as a hex byte (e.g. `"0x7f"`)
  - `length` as an integer
  - `value_hex` as hex for the raw bytes.

### 5.3 Examples 
#### 5.3.1 Worked Example (SegWit + segOP, flag = 0x03)

The following is an illustrative (non-signed) transaction showing SegWit and
segOP together. Hex values are examples only.

```
(tx start)

  01000000                                # nVersion = 1

  00 03                                   # marker=0x00, flag=0x03 (SegWit + segOP)

  01                                      # vin_count = 1

    <32 bytes>                            # prevout_hash
    00000000                              # prevout_index
    00                                    # scriptSig length
    ffffffff                              # nSequence

  02                                      # vout_count = 2

    # vout0 — P2SOP commitment
    0000000000000000
    27
      6a                                  # OP_RETURN
      25                                  # PUSHDATA(37)
      50 32 53 4f 50                      # ASCII "P2SOP"
      <32-byte segop_commitment>

    # vout1 — P2WPKH
    a086010000000000
    16
      00
      14
      <20-byte pubkey hash>

  # SegWit witness
  02
    47 <signature>
    21 <pubkey>

  # segOP section
  53                                      # segop_marker 'S'
  01                                      # segop_version v1
  
  18                                      # segop_len = 24 bytes (varint 0x18)

    # TLV #1
    01                                    # type = 1
    10                                    # len  = 16 (varint 0x10)
      73 65 67 4f 50 20 54 4c 56 20 74 65 73 74 21 21
      # "segOP TLV test!!"

    # TLV #2
    02                                    # type = 2
    04                                    # len  = 4 (varint 0x04)
      00 00 00 01

  00000000                                # nLockTime

(tx end)
```

TLV size breakdown:

```
TLV1: 1(type) + 1(len varint) + 16(value) = 18 bytes
TLV2: 1(type) + 1(len varint) + 4(value)  = 6 bytes

Total = 24 bytes = segop_len
```

#### 5.3.2 Example TLV Structures (Informative)

Below are example TLV layouts illustrating real-world uses.

#### 5.3.3 Example A — One Large TLV (simple apps)

A simple inscription, file, or large proof:

```
[type=0x10][len=varint(64000)][value...64,000-byte blob...]
```

Structure:

```
+--------+--------------------+--------------------+
| 0x10   | varint(64,000)     | 64,000 bytes data  |
+--------+--------------------+--------------------+
```

Use cases:

- Inscriptions
- Large proofs
- Merkleized application blobs
- ZK-STARK traces

#### 5.3.4 Example B — Metadata + Body

Payload includes metadata TLV + big content TLV:

```
01 0A                <10-byte metadata>
10 <varint(64000)>   <64,000-byte raw data>
```

Meaning:

```
TLV 0x01 → “metadata” (10 bytes)
TLV 0x10 → “main blob” (64 KB)
```

This allows light-weight parsers to read type 0x01 (metadata) and skip over the large 0x10 blob without parsing it.

#### 5.3.5 Example C — Multi-component L2 rollup

```
01 05                <“L2v1”>
10 20                <32-byte batch commitment>
11 20                <32-byte fraud-proof root>
12 A0                <160-byte validator set snapshot>
20 <varint(64000)>   <large state delta>
```

This provides a structured rollup batch:

```
Type  Meaning
0x01  Protocol version (“L2v1”)
0x10  Batch commitment root
0x11  Fraud/submission root
0x12  Validator set metadata
0x20  Actual state delta
```

#### 5.3.6 Example D — Vault metadata + auxiliary data

```
01 20   <vault policy blob>
02 04   <relative locktime>
03 01   <flags>
10 20   <backup key commitment>
```

This shows structured, multi-field metadata inside one segOP payload, where each TLV is small but semantically distinct.

#### 5.3.7 Example E — “Envelope + Body” pattern

A TLV envelope describing the content, then a raw TLV containing it:

```
01 0F   <“mime:application/json”>
02 50   <80-byte JSON>
```

Here:

- `0x01` declares the media type.
- `0x02` carries the actual JSON body.

#### 5.3.8 Example F — Multiple optional extensions

```
01 01                <version byte>
02 20                <public tag / ID>
03 20                <signature commitment>
10 <varint(60000)>   <~60 KB main blob>
11 20                <optional auxiliary root>
```

This illustrates:

- A small fixed “header” region (version / IDs / commitments).
- A large main blob (0x10).
- An optional extension TLV (0x11) that higher-layer protocols may or may not understand.

## 6. BUDS Structured Tiering & ARBDA Scoring (Draft-1 Extension)

This section updates the segOP draft-1 specification to include support for:

- **BUDS Tier Markers (T0–T3)**
- **BUDS Data-Type Markers**
- **Per-payload ARBDA scoring**

These rules are **non-consensus** and apply only to:
- segOP-aware nodes  
- wallet RPC helpers  
- block template policy  
- pruning & operator heuristics  

Consensus remains unchanged:  
**segOP payloads are always arbitrary bytes and remain fully valid on non-segOP nodes.**

---

### 6.1 BUDS Marker TLVs

segOP v1 introduces two optional TLV markers used to classify payload content according to the BUDS registry:

| Marker | Meaning | Value | Length |
|--------|---------|--------|---------|
| **0xF0** | BUDS Tier Marker | Tier code (0x00–0x03) or 0x10/0x20 structured classes | 1 byte |
| **0xF1** | BUDS Data-Type Marker | Type code (text, JSON, L2 anchor, receipt, etc.) | 1 byte |

#### 6.1.1 Tier Codes (0xF0)

```
0x00  T0_CONSENSUS
0x10  T1_METADATA
0x20  T2_OPERATIONAL
0x30  T3_ARBITRARY
0xFF  UNSPECIFIED (default when no tier TLV exists)
```

#### 6.1.2 Data-Type Codes (0xF1)
Examples (non-exhaustive):

```
0x01  TEXT_NOTE
0x02  JSON_METADATA
0x03  BINARY_BLOB
0x20  L2_STATE_ANCHOR
0x21  ROLLUP_BATCH_REF
0x22  PROOF_REF
0x23  VAULT_METADATA
0xFF  UNSPECIFIED
```

Nodes MUST tolerate unknown or future codes.

---

### 6.2 Placement & Ordering Rules

BUDS markers follow standard segOP TLV structure.  
They may appear anywhere in the payload, with the following recommendations:

- **Recommended order:**  
  `0xF0 tier → 0xF1 type → content TLVs`

- **Multiple tier markers:**  
  Allowed, but marked as **AMBIGUOUS**.

- **Multiple type markers:**  
  Only the first is authoritative; others ignored.

- **No BUDS markers:**  
  Payload defaults to:  
  - Tier = **UNSPECIFIED**  
  - Type = **UNSPECIFIED**  
  - ARBDA = **T3**

---

### 6.3 BUDS Extraction Algorithm (Informative)

Nodes implementing BUDS support MUST:

1. Scan segOP payload sequentially.
2. Track:
   - First tier marker (if any)
   - First type marker (if any)
   - Additional tier markers → set `ambiguous = true`
3. Build a tier presence bitmap:
   ```
   has_t0, has_t1, has_t2, has_t3
   ```
4. If **no tier markers** exist but payload is non-empty → `has_t3 = true`.

This extraction is **policy-only** and does not affect consensus.

---

### 6.4 ARBDA: Arbitrary Data Dominance Assessment

ARBDA provides a **transaction-level** risk score based on tier presence.

#### 6.4.1 ARBDA Rule

```
if has_T3:   ARBDA = T3
else if has_T2: ARBDA = T2
else if has_T1: ARBDA = T1
else:            ARBDA = T0
```

Interpretation:

- **Any opaque or uncontrolled data dominates the entire payload.**
- Strict incentives for protocols to use structured tiering.
- ARBDA is advisory only; no consensus effects.

---

### 6.5 JSON-RPC Exposure (Normative for segOP nodes)

`decodesegop` MUST return:

```
"buds_tier_code": "0x10",
"buds_tier": "T1_METADATA",
"buds_type_code": "0x01",
"buds_type": "TEXT_NOTE",
"arbda_tier": "T1",
```

Plus warnings:

```
"buds_warning": "Multiple conflicting tier markers (AMBIGUOUS)"
```

TLV records for markers MUST be decoded as:

```
{ "type": "0xf0", "kind": "buds_tier", "value_hex": "10" }
{ "type": "0xf1", "kind": "buds_type", "value_hex": "01" }
```

---

## 6.6 Backwards Compatibility

- Older segOP nodes (no BUDS support) simply ignore markers.
- BUDS-aware nodes maintain full interoperability.
- Payloads containing only TEXT/JSON/BLOB TLVs remain valid.

No behaviour changes occur at consensus level.

---

## 6.7 Rationale

BUDS + ARBDA provide:

- **Predictable structure** for indexing, scanning, pruning, and analysis.
- **Local policy hooks** for mempool and mining.
- **Incentives for transparent protocol design.**
- **Neutral, descriptive classification** that does not block any use case.

segOP remains:
- Optional  
- Non-consensus  
- Backwards-compatible  
- Prunable  

BUDS merely describes the payload, never restricts it.

## 7. IDs and Hashing

### 7.1 Tagged-hash convention

segOP uses a standard tagged-hash construction, consistent with BIP340-style tagging. For any `tag` (ASCII string) and message `msg`:

```
TAG = SHA256(tag)
TAGGED_HASH(tag, msg) = SHA256(TAG || TAG || msg)
```

All tagged hashes in this specification (e.g. P2SOP commitments and fullxid) use this convention.

### 7.2 ID definitions

segOP preserves existing Bitcoin identifiers and introduces an optional extended identifier:

| ID | Includes | Purpose |
|----|----------|---------|
| txid | nVersion + vin + vout + nLockTime | Legacy transaction ID |
| wtxid | BIP141 witness-inclusive serialization | SegWit transaction ID |
| fullxid | Entire extended transaction serialization (see below) | Optional extended ID |

### 7.2.1 txid (unchanged)

`txid` is computed exactly as in pre-segOP Bitcoin:

Serialize the transaction without:

- Marker.
- Flag.
- Any SegWit witness data.
- Any segOP section.

Compute SHA256d (double-SHA256) over that legacy serialization.

segOP and witness fields MUST NOT affect txid.

### 7.2.2 wtxid (unchanged)

`wtxid` is unchanged from BIP141. The serialization used to compute `wtxid` remains exactly the BIP141 witness serialization and does **not** include the segOP section.

segOP extends the wire-format transaction by appending an additional segOP section after witness and before `nLockTime`, but this extended region is not part of the `wtxid` computation. 

`wtxid` remains the SegWit witness-inclusive transaction ID as defined in BIP141.

### 7.2.3 fullxid (segOP extended ID)

Implementations MAY compute an optional extended transaction identifier `fullxid` that commits to the entire segOP-extended serialization, including segOP bytes, using the tagged-hash convention in §7.1.

Let `extended_serialization` be the byte sequence:

```
nVersion ||
marker || flag ||
vin (all inputs, as in extended tx format) ||
vout (all outputs) ||
[witness data, if present] ||
[segOP section, if present] ||
nLockTime
```

Then:

```
fullxid_tag = "segop:fullxid" # ASCII string
fullxid = TAGGED_HASH(fullxid_tag, extended_serialization)
```

#### Properties

- `fullxid` **commits to segOP payload bytes**. Any modification to the payload, its TLV structure, or its declared length changes the `fullxid`, even though the legacy `txid` and `wtxid` remain unchanged.
- `fullxid` is **not a consensus identifier** in segOP v1. It is not used in block validation, script execution, or relay policy.
- `fullxid` is **stable across pruning**: it is defined over the logical extended serialization, regardless of whether a node has pruned segOP bytes for a given block. A pruned node MAY need to refetch segOP payload bytes in order to recompute `fullxid`.
- `fullxid` has no ordering or malleability constraints and MUST NOT influence consensus-critical behaviour.

#### Intended Uses (informative)

`fullxid` is designed for:

- explorers and transaction indexers,
- debugging and implementation tracing,
- higher-layer protocols that wish to reference the full segOP-extended form,
- archival and reconstruction tools (particularly when segOP payloads are pruned but still retrievable from peers).

`fullxid` MUST NOT be required by consensus, and nodes MUST remain valid segOP implementations even if they do not compute or store `fullxid`.

## 8. Weight and Fees

For block weight, segop_weight is added to the existing block weight as defined in BIP141; segOP bytes are charged at 4 WU/byte with no discount.

```
segop_weight = 4 * segop_bytes
```

Consensus max per-tx:

```
MAX_SEGOP_TX_BYTES = 64,000
```

Recommended policy per-block:

```
MAX_SEGOP_BLOCK_BYTES = 400,000
```

## 9. P2SOP – Pay-to-SegOP

### 9.1 P2SOP Commitment

Each segOP payload is bound to its transaction by a single P2SOP commitment output, which is an OP_RETURN script carrying a tagged hash of the segOP payload.

The canonical `scriptPubKey` for a P2SOP output in segOP v1 is:

```
27 6a 25 5032534f50 <32-byte segop_commitment>
```

Where:

```
27 — scriptPubKey length in bytes (39 decimal)

6a — OP_RETURN

25 — PUSHDATA(37) — push 37 bytes of data

50 32 53 4f 50 — ASCII "P2SOP" (5 bytes: P 2 S O P)

<32-byte segop_commitment> — 32-byte commitment to the segOP payload

Total pushed data = 5 + 32 = 37 bytes, so the full scriptPubKey length is 0x27 bytes (1 byte OP_RETURN + 1 byte push opcode + 37 bytes data).
```

The commitment segop_commitment is computed using the tagged-hash convention from §7.1:

```
segop_commitment = TAGGED_HASH("segop:commitment", segop_payload)
```

Example:

```
TAG = SHA256("segop:commitment")              # over the ASCII string
segop_commitment = SHA256(TAG || TAG || segop_payload)
```

This segop_commitment is what appears as the <32-byte segop_commitment> in the P2SOP scriptPubKey above.

### 9.2 Relationship and 1:1 Mapping Rules (Consensus)

For segOP v1, the relationship between segOP and P2SOP is strict:

- If `(flag & 0x02) == 0` (no segOP):  
  - The transaction MUST NOT contain any P2SOP outputs.

- If `(flag & 0x02) != 0` (segOP present):  
  - The transaction MUST contain **exactly one** segOP section.  
  - The transaction MUST contain **exactly one** P2SOP output.

Any violation MUST make the transaction invalid under segOP consensus.

### 9.3 Example Pair

P2SOP output script (example, matching §6 and §9.1):

```
6a25 5032534f50 <32-byte commitment>
```

Where:

- `6a` — `OP_RETURN`
- `25` — `PUSHDATA(37)` — push 37 bytes of data
- `50 32 53 4f 50` — ASCII `"P2SOP"` (5 bytes)
- `<32-byte commitment>` — `segop_commitment` (32 bytes)

Total pushed data = `5 + 32 = 37` bytes, and the full `scriptPubKey` length is 39 bytes (`0x27`), (1 byte `OP_RETURN` + 1 byte push opcode + 37 bytes data).

Corresponding segOP section (example):

```
53 # segop_marker = 0x53 ('S')
01 # segop_version = 0x01 (segOP v1)
18 # segop_len = 24 bytes

01 10 # type = 1, len = 16
73 65 67 4f 50 20 54 4c 56 20 74 65 73 74 21 21
# "segOP TLV test!!" (16 bytes)

02 04 # type = 2, len = 4
00 00 00 01 # application-specific value (4 bytes)
```

TLV sizes:

```
TLV1: 1(type) + 1(len varint) + 16(value) = 18 bytes
TLV2: 1(type) + 1(len varint) + 4(value)  = 6 bytes

Total segop_payload = 18 + 6 = 24 bytes = 0x18
```

For this example, the 32-byte `segop_commitment` placed in the P2SOP output is:

```
segop_commitment = TAGGED_HASH("segop:commitment", segop_payload)
```

### 9.4 Node Validation Logic (Pseudo)

```
if (tx.flag & 0x02) {
    auto outs = find_P2SOP_outputs(tx);
    if (outs.size() != 1)
        return error;

    if (!tx.has_segop_section)
        return error;

    if (tx.segop_len > MAX_SEGOP_TX_BYTES)
        return error;

    if (!is_valid_tlv(tx.segop_payload))
        return error;

    uint256 commit = outs[0].commitment;
    uint256 expected = TAGGED_HASH("segop:commitment", tx.segop_payload);

    if (expected != commit)
        return error;
} else {
    if (has_P2SOP_output(tx))
        return error;
}
```

# 10. Node Validation, Retention, and Pruning

segOP follows Bitcoin’s “validate everything, optionally prune old data” model but makes retention windows explicit.

## 10.1 Mandatory Validation at Tip

For every segOP-bearing block, a segOP-aware node MUST:

1. Obtain the **full segOP payload bytes**, either:  
   - from local storage (if within retention window), or  
   - by requesting them via `getsegopdata` (§11.4.1) from peers
     advertising `NODE_SOP_RECENT` or `NODE_SOP_ARCHIVE`.
2. Recompute the segOP commitment.
3. Verify the P2SOP commitment matches.
4. Only then mark the block valid and relay it.

Nodes MUST NOT relay or accept a segOP-bearing block as valid until all segOP payloads are validated.

A segOP-aware fully validating node MUST apply segOP validation rules to every segOP-bearing block it accepts to its active chain, regardless of its later pruning policy.

## 10.2 Validation Window (Mandatory Minimum)

Nodes MUST retain segOP payloads for:

```
W = 24 blocks
```

This **Validation Window**:

- Supports 1–4 block reorgs  
- Supports miner time-rolling  
- Prevents fetch/prune thrashing  
- Ensures reliable block relay

Applies regardless of operator settings.

## 10.3 Operator Window (Optional)

Nodes MAY retain segOP payloads further using:

```
-sopwindow=R     # R ≥ 0 blocks
```

- `R = 0` → only Validation Window  
- `R = 144` → ~1 day  
- `R = 288` → ~2 days  

This does not affect consensus.

## 10.4 Effective Retention Window

The Effective Retention Window `E` is not a separate window; it is simply the result of combining the mandatory Validation Window and the user-configured Operator Window into a single numeric retention horizon.

Effective window:

```
E = max(W, R)
```

Nodes MUST retain segOP payloads for:

```
heights ∈ [ tip - E + 1 … tip ]
```

For blocks:

```
height < tip - E + 1
```

segOP payload MAY be pruned.

Pruning MUST NOT remove:

- tx fields  
- P2SOP outputs  
- commitments  
- essential serialization

## 10.5 Node Profiles (Informative)

Below are the three types of node profiles.

### 10.5.1 Validation Window Node  
- `E = W = 24`
- Retains segOP payloads for exactly the most recent 24 blocks.
- Prunes segOP payloads older than 24 blocks.
- Fully validates new blocks using payloads from window E = 24.

### 10.5.2 Operator Window Node  
- `E > W`  
- Retains deeper history  
- Suitable for routing/services

### 10.5.3 Archive Window Node  
- Retains all segOP payloads for the entire chain history (no segOP pruning).  
- Serves historical segOP payload to other nodes, explorers, and L2 protocols.  
- Voluntary; not consensus-required, but practically useful for full-history IBD and external indexing.

### 10.5.4 Consensus vs Storage (Summary)

- Consensus requires that any segOP-aware fully validating node verify segop_len, TLV well-formedness, and P2SOP commitments for every segOP-bearing block it accepts to its active chain.
- Storage policy is independent: after validation, a node MAY prune segOP payload bytes for blocks older than its effective retention window `E` without affecting consensus.

## 10.6 IBD (Initial Block Download)

During IBD, a segOP-aware fully validating node:

- Downloads blocks from its peers (preferably from Archive Window peers when full history is required).
- For every segOP-bearing block that it **accepts to its active chain**, it MUST:
  - parse the segOP section,
  - verify `segop_len <= MAX_SEGOP_TX_BYTES`,
  - enforce TLV well-formedness (§5.2),
  - recompute and verify the P2SOP commitment (§9.1–9.4).

Implementations MAY apply the same kinds of IBD shortcuts used for script validation today (e.g. assumevalid-style optimisations), but these are considered local policy and are not part of segOP’s consensus rules.

# 11. segOP P2P Behaviour and Payload Relay

## 11.1 Payload

segOP payload bytes:

- Are relayed with mempool transactions  
- Are stored on disk within window `E`  
- Are not included in compact block messages  
- Are fetched via dedicated P2P messages as needed (§11.4)

## 11.2 Service Bits

segOP introduces two new **P2P service flags** that nodes use to advertise their segOP data-serving capabilities. These flags are part of the node’s `services` bitfield (e.g., in the `version` message and address gossip such as `addrv2`). They are **not** part of the transaction or block serialization, nor part of the segOP wire format.

These service bits communicate what a node *can serve*, not what a transaction *contains*.

### 11.2.1 NODE_SOP_RECENT

`NODE_SOP_RECENT` is set **only if** the node can serve segOP payload bytes for at least the most recent **Validation Window**:

```
W = 24 blocks
```

A node sets this bit if and only if:

```
min_retained_height ≤ tip_height − W + 1
```

It is typically true for:

- Validation Window nodes (`E = W = 24`),
- Operator Window nodes (`E > W`),
- Archive Window nodes (Full retention).

Here `min_retained_height` is the lowest block height on the node’s active chain for which the node still retains segOP payload bytes.

### 11.2.2 NODE_SOP_ARCHIVE

`NODE_SOP_ARCHIVE` is set only if the node retains segOP payload bytes for **all blocks from genesis to the current tip** (i.e. it does not prune segOP payload at all).

A node MUST clear this bit automatically if it prunes segOP payload bytes for any block on its active chain (i.e., if it no longer retains full history).

Archive Window nodes are not required by consensus but are practically necessary for:

- full-history segOP IBD,
- L2 protocols anchored into segOP,
- explorers, auditors, and long-range reconstruction tools.

## 11.3 Inventory Types

- `MSG_TX_SOP` — announces a segOP-bearing transaction  
- `MSG_SOPDATA` — identifies a segOP payload object  

Nodes MUST NOT advertise payloads they do not hold.

## 11.4 segOP Payload Messages

### 11.4.1 `getsegopdata`

```
getsegopdata {
    txids: [32-byte txid, ...]
}
```

Rules:

- Non-empty list  
- Max 64 txids  
- Only send to peers advertising `NODE_SOP_RECENT` / `NODE_SOP_ARCHIVE`

### 11.4.2 `segopdata`

```
segopdata [
    {
        txid:       32 bytes
        sopver:     1 byte
        soplen:     varint
        soppayload: soplen bytes
    },
    ...
]
```

Nodes MUST return exactly `soplen` bytes for each entry.

N.B - `sopver` corresponds to `segop_version`, `soplen` to `segop_len`, and `soppayload` to `segop_payload`.

If payload is pruned: respond with `notfound`.

## 11.5 Segmented Responses (Optional)

```
{
    txid: 32 bytes
    sopver: 1
    soplen: varint
    offset: varint
    chunk_data: bytes
    is_last_chunk: bool
}
```

Receivers MUST reassemble before commitment validation.

## 11.6 Block Relay Semantics

segOP follows the same relay model as SegWit: full blocks contain all data, while optimised block transports omit heavy data and require on-demand fetching.

### 11.6.1 Full Block Relay (`block` message)

Full blocks sent over P2P via the `block` message MUST include the full segOP section, including:

- `segop_marker`
- `segop_version`
- `segop_len`
- `segop_payload` (the actual bytes)

A node receiving a full block has all information required to:

- validate TLV structure
- recompute the P2SOP commitment
- validate commitments before accepting the block

Full blocks stored on disk (`blk*.dat`) SHOULD include segOP payload bytes for blocks within the node’s effective retention window `E`. Implementations MUST ensure that segOP payload bytes for heights in `[tip − E + 1 … tip]` are stored durably somewhere (whether inline in `blk*.dat` or in auxiliary files). Older blocks MAY have their segOP payload pruned.

### 11.6.2 Optimised Relay (cmpctblock and similar transports)

Compact blocks and other fast-relay formats (e.g., header-first, FIBRE-like schemes):

MUST NOT include segOP payload bytes.

MUST include:

- block header  
- transaction IDs / short IDs  
- witness flags (if applicable)  
- enough information to identify P2SOP outputs and their 32-byte commitments (for example, by including full scripts for segOP-bearing transactions or by encoding the commitments separately)

Nodes receiving an optimised block must:

- validate header + transaction skeleton,
- fetch missing witness data (if SegWit applies),
- fetch missing segOP payload bytes via `getsegopdata`,
- validate P2SOP commitments,

and only then accept and relay the block.

### 11.6.3 Relay Requirement

Nodes MUST NOT forward segOP-bearing blocks until the segOP payload has been:

- acquired (if missing), and
- validated against the P2SOP output.

Nodes MUST NOT relay partially validated blocks.

## 11.7 Compact Blocks

Compact blocks SHOULD include a segOP bitmap or equivalent metadata whenever segOP-bearing transactions are present, but segOP payload bytes MUST NOT appear inside compact block messages. This specification does not fix a specific compact block encoding.

## 11.8 IBD and Historical Reconstruction

During IBD:

- Prefer `NODE_SOP_ARCHIVE` peers for full history  
- Validate segOP for new blocks  
- Validation Window nodes do not need full-history re-fetch of pruned segOP payloads.

Archive nodes support:

- L2 rollups  
- Explorers/indexers  
- Forensic/audit reconstruction

segOP cleanly distinguishes **Validation Window**, **Operator Window**, and **Archive Window** modes.

## 11.9 DoS Mitigations, Rate Limits, and Policy Constraints

Implementations MUST enforce bandwidth, CPU, and message-frequency limits to prevent denial-of-service attacks relating to segOP payload requests.
All requirements in this section apply to the `getsegopdata` and `segopdata` messages defined in §11.4.

### 11.9.1 Per-Message Limits

Each `getsegopdata` message:

- MUST contain **at most 64 txids**.  
- MUST NOT exceed **4 KB** serialized.  
- MUST NOT contain duplicate txids.  
- SHOULD be ignored or penalized if malformed.

Each `segopdata` message:

- MUST contain at most **16 payload entries**.  
- MUST NOT exceed the policy-defined outbound limit (default **128 KB**, hard cap **256 KB**).  
- MUST NOT exceed **4×** the size of its corresponding inbound request.

Violations MUST result in the message being discarded and MAY contribute to misbehavior scoring.

### 11.9.2 Per-Peer Rate Limits

Nodes MUST enforce:

```
max_getsegopdata_per_minute = 64
```

Excessive requesting MUST cause the node to stop serving the peer and MAY count toward a ban score.

Peers requesting >256 KB/minute (policy) MAY be deprioritized or disconnected.

### 11.9.3 Global Backpressure and Bandwidth Caps

Nodes MUST enforce global bandwidth limits:

```
max_outbound_segop_bandwidth = 1 MB / 10 sec
max_inbound_segop_bandwidth  = 1 MB / 10 sec
```

Nodes MAY delay or queue responses under congestion.

### 11.9.4 Segmented Transfer Limits

For segmented transfer (§11.4):

- Abort if chunk timeout > **20 seconds**.  
- Abort if cumulative chunk size > declared `soplen`.  
- Penalize peers sending duplicate or inconsistent chunk offsets.  
- Discard partial buffers after reassembly or cancellation.

### 11.9.5 Invalid or Malicious Requests

Nodes MUST treat the following as misbehavior conditions and SHOULD feed them into their existing peer scoring / banning framework (e.g. `Misbehaving()` and `ban_threshold` in Bitcoin Core):

- Invalid `sopver`, incorrect `soplen`, or malformed TLV.
- Requests for txids a peer did not announce.
- Repeated requests for known-pruned payloads.
- Providing payload bytes that fail P2SOP commitment validation.

This specification does not define new scoring algorithms or ban thresholds; it only enumerates additional conditions that implementations SHOULD treat as misbehavior using their existing mechanisms.

### 11.9.6 Amplification Protection

To prevent response amplification:

- The outbound/inbound ratio MUST NOT exceed **4:1**.  
- Nodes MUST NOT serve segmented responses to peers exceeding bandwidth caps.  
- Nodes MUST NOT serve payloads outside their retention window unless they advertise `NODE_SOP_ARCHIVE`.

### 11.9.7 CPU and Memory Protections

Nodes MUST:

- Verify `soplen` before reading data.  
- Reject requests causing repeated TLV scans.  
- Limit concurrent chunk reassemblies (default policy: **8**).  
- Discard chunk buffers immediately after processing.

### 11.9.8 Interaction with Retention Windows

After initial IBD and validation, nodes SHOULD NOT fetch segOP payload deeper than their effective window `E` (§10.4) — that is, for blocks with:

```
height < tip_height − E + 1
```

— unless they are explicitly configured as Archive Window nodes and peers advertise `NODE_SOP_ARCHIVE`.

Requests for segOP payload outside a node’s retention horizon SHOULD be answered with `notfound`, unless the operator has explicitly opted into Archive behaviour.

### 11.9.9 Summary

Nodes MUST enforce:

- Per-message limits  
- Per-peer rate limits  
- Global bandwidth caps  
- Chunk-transfer protections  
- Misbehavior penalties  
- Amplification constraints  
- Memory/CPU protections

These mitigations ensure segOP cannot be used for bandwidth, CPU, or memory exhaustion attacks and remains consistent with Bitcoin's P2P security model.

# 12. Compatibility Summary

- `txid` is unchanged.  
- `wtxid` (BIP141) is unchanged.  
- SegWit semantics and script evaluation are unchanged.  
- segOP introduces:
  - a new post-witness data section,  
  - full-fee weight accounting for payload bytes,  
  - a P2SOP commitment output,  
  - mandatory TLV structure,  
  - prunable payloads with clearly defined retention windows.

Blocks valid under segOP rules form a **subset** of blocks valid under legacy rules. segOP is a **soft fork** extension.

# 13. Summary

- segOP introduces a post-witness, TLV-structured, fully fee-paying, prunable data lane.  
- Payload bytes are bound to the transaction via a P2SOP tagged-hash commitment.  
- Each segOP transaction contains exactly **one** P2SOP and **one** segOP section.  
- segOP defines explicit retention windows:
  - **Validation Window** (mandatory 24 blocks).  
  - **Operator Window** (user-configurable extension).  
  - **Archive Window** (retain all segOP payloads for the entire chain history, no pruning).  
- Payload relay uses dedicated P2P messages with strict DoS controls.  
- segOP preserves backward compatibility with legacy nodes and existing transaction IDs.  
- Provides a structured, future-proof foundation for data-bearing use cases including proofs, commitments, metadata, vault logic, and L2 anchoring.

Because every segOP payload is deterministically committed via a single P2SOP output, and that output is included in the transaction Merkle root and block hash, segOP-aware nodes can safely prune raw payload bytes once they fall outside their effective retention window `E` without weakening consensus. Any attempt to alter pruned segOP data would change the P2SOP commitment and therefore the block hash, which both legacy and segOP-aware nodes would reject. When deeper inspection or reconstruction is needed, nodes can request historical segOP payloads from peers advertising `NODE_SOP_ARCHIVE` using `getsegopdata` / `segopdata`, without changing consensus rules or requiring all nodes to store full-history payloads.

---

# Appendix A — Constants (segOP v1)

| Constant                  | Value       | Type       | Description |
|---------------------------|-------------|------------|-------------|
| MAX_SEGOP_TX_BYTES        | 64,000      | Consensus  | Maximum segOP payload per transaction. Enforced during mempool acceptance and block validation. |
| MAX_SEGOP_BLOCK_BYTES     | 400,000     | Policy     | Recommended per-block total segOP payload. Not consensus; guides mining and relay policy. |
| SEGOP_MARKER              | 0x53        | Constant   | ASCII `'S'`. Required byte indicating start of segOP section. |
| SEGOP_VERSION             | 1           | Integer    | Version byte for segOP v1 payloads (`segop_version`). |
| TAG_SEGOP_COMMIT          | "segop:commitment" | String | Tagged-hash domain for computing the P2SOP commitment. |
| TAG_FULLXID               | "segop:fullxid"     | String | Tagged-hash domain for computing the optional `fullxid`. |

## Notes

- **Consensus constants** must be enforced during transaction validation and block acceptance.
- **Policy constants** influence node behaviour but do not affect consensus.
- **Tagged-hash domains** (TAG_SEGOP_COMMIT, TAG_FULLXID) MUST be treated as exact ASCII strings.

---

# Appendix B — Future Extensions (Reserved Flags)

The global transaction `flag` byte (see §3.2 and §4) reserves several bits for future soft-fork upgrades that may extend the segOP or SegWit data model.

These reserved bits MUST be set to zero in segOP v1 and MUST cause transaction rejection if non-zero, unless a future consensus change explicitly defines their meaning.

| Bit | Hex   | Name                     | Description |
|-----|--------|---------------------------|-------------|
| 2   | 0x04  | segOP-Wit / Qsig (reserved) | Placeholder for potential future segregated sub-lanes, such as: <br>• a prunable witness-like lane (“segOP-Wit”), <br>• Qsig quantum signatures, <br>• versioned auxiliary lanes. |
| 3–7 | 0x08–0x80 | Reserved                | Reserved for future extensions to the extended-transaction format. MUST be zero in segOP v1. |

## Notes

- These bits allow forward extensibility without expanding the transaction wire format.
- Future proposals MAY define semantics for these bits via additional soft-fork specifications.
- Nodes implementing segOP v1 MUST reject any transaction where reserved bits are set.


---

# Appendix C — Deployment (Suggested)

This appendix outlines a recommended deployment mechanism for segOP v1.  

These parameters are **not consensus requirements** but suggested values for a versionbits-based activation.

| Parameter            | Description |
|----------------------|-------------|
| Deployment mechanism | **BIP8 (versionbits)** — Miner signalling with optional mandatory activation. |
| Bit                  | **TBD** — Versionbits bit position to be assigned. |
| Start time           | **TBD** — Median-time-past (MTP) timestamp at which signalling begins. |
| Timeout              | **TBD** — MTP timestamp at which signalling ends. |
| Threshold            | Example: **90% miner signalling** within a 2016-block retarget period. |

## Recommended Activation Flow (Informative)

1. **Define versionbits parameters**  
   Assign a versionbits bit (`bit = TBD`) and choose deployment start/timeout.

2. **Signalling period begins**  
   Miners start including the signalling bit in block headers to indicate readiness.

3. **Lock-in**  
   If signalling reaches the defined threshold (e.g. 90% within 2016 blocks), the deployment locks in.

4. **Activation**  
   After one additional difficulty period, segOP validation rules become active.

5. **Mandatory activation (optional)**  
   If the timeout is reached without achieving the threshold, implementations MAY choose a BIP8 mandatory activation mode. This is implementation policy and not consensus-mandated by this specification.

## Notes

- Versionbits allows safe, opt-in miner activation and mirrors prior soft-forks (e.g., BIP141 SegWit).  
- Test networks, signet deployments, or research networks MAY use alternative parameters or immediate activation.  
- This specification does **not** mandate a specific activation path for mainnet; it only outlines a recommended approach.

---

# Appendix D — Diagrams (Informative)

This appendix provides non-normative diagrams illustrating the structure and data flow of segOP v1. These diagrams are intended to help reviewers and implementers understand the placement, lifecycle, and validation of segOP data.

## D.1 Extended Transaction Layout

The segOP lane extends the BIP141 wire format by adding a post-witness section.

```
+---------------------------------------------------------------+
| nVersion (4) |
+---------------------------------------------------------------+
| marker (0x00) | flag (bitfield) |
+---------------------------------------------------------------+
| vin_count (varint) |
| + repeated inputs |
+---------------------------------------------------------------+
| vout_count (varint) |
| + repeated outputs (incl. P2SOP) |
+---------------------------------------------------------------+
| Witness data (if flag bit 0 == 1) |
+---------------------------------------------------------------+
| segOP section (if flag bit 1 == 1) |
| + segop_marker (0x53) |
| + segop_version (0x01) |
| + segop_len (varint) |
| + segop_payload (TLV-encoded) |
+---------------------------------------------------------------+
| nLockTime (4) |
+---------------------------------------------------------------+
```

## D.2 segOP Section Internals

segOP section:

```
+-----------------------+
| segop_marker = 0x53 |
+-----------------------+
| segop_version = 0x01 |
+-----------------------+
| segop_len (varint) |
+-----------------------+
| segop_payload bytes |
| + TLV #1 |
| + TLV #2 |
| + ... |
+-----------------------+
```

Example TLV stream (visual):

segop_payload:

```
+------+------+-----------------------+
|type| len | value... |
+------+------+-----------------------+
| 01 | 10 | 16 bytes |
+------+------+-----------------------+
| 02 | 04 | 4 bytes |
+------+------+-----------------------+
```

## D.3 P2SOP Commitment Flow

This diagram shows how the segOP payload is bound into the block header.

```
                 segOP payload
                       |
                       v
 +-------------------------------------------+
 | segop_commitment =                        |
 |   TAGGED_HASH("segop:commitment", payload)|
 +-------------------------------------------+
                       |
                       v
    +-----------------------------------+
    |  P2SOP output (OP_RETURN script)  |
    |  OP_RETURN | "P2SOP" | commitment |
    +-----------------------------------+
                       |
                       v
                  Transaction
                       |
                       v
              Merkle root (tx hashes)
                       |
                       v
                  Block header
```

**Key point:**  
Any alteration to the segOP payload changes the commitment → tx hash → Merkle root → block hash.

## D.4 Retention Windows (Validation, Operator, Archive)

```
[tip]-------------------------------------------------------------------[end]                                                                      
v                                                                         v

+----------------------+----------------------+-----------------------------+
|  Validation Window   |   Operator Window    |       Archive Window        |
|     mandatory W=24   | optional R≥0 blocks  |   full history (optional)   |
+----------------------+----------------------+-----------------------------+
|  MUST keep payload   |    MAY keep payload  |   MAY prune nothing         |
|  (no pruning allowed)|   (node policy only) |   (serve historical data)   |
+----------------------+----------------------+-----------------------------+

Legend:
- **Validation Window (W = 24 blocks)**  
  segOP payload *must* be stored. No pruning allowed.

- **Operator Window (R blocks, optional)**  
  Payload *may* be retained longer according to `-sopwindow=R`.

- **Archive Window (infinite, optional)**  
  Node keeps *all* segOP payload forever and advertises `NODE_SOP_ARCHIVE`.

- **Prunable Zone (above the table)**  
  Any block older than `tip − E` where `E = max(W, R)`  
  → segOP payload **MAY** be removed, but P2SOP commitments remain forever.
```

## D.5 P2P segOP Payload Retrieval Flow

```
        Node A (pruned)                     Node B (archive)
        ----------------                     -----------------
                 |                                     |
Needs segOP data |                                     |
  for tx = X     |                                     |
                 |---- getsegopdata(txid=X) ---------> |
                 |                                     |
                 | <--- segopdata{payload,...} --------|
                 |                                     |
                 | validate TLV + commitment           |
                 v                                     |
          segOP payload reconstructed                  |
```

This flow occurs during:
- IBD (when requesting older pruned segOP payloads)
- block relay (if cmpctblock omitted segOP data)
- fullxid computation on pruned nodes
- explorer / audit reconstruction

## D.6 Compact Block (cmpctblock) Omission Diagram

```
Full block:
[header]
[transactions including full segOP data]

Compact block:
[header]
[short txids]
(NO segOP payload)

+-- Node must request missing segOP payload via getsegopdata
```

## D.7 Summary Diagram — segOP in the Transaction Pipeline

```
Tx Construction   →   Mempool   →   Mining   →   Block Propagation   →   Validation   →   Retention/Pruning
      |                  |               |                |                  |                    |
      v                  v               v                v                  v                    v

 Build TLV         Validate TLV     Add segOP +      cmpctblock omits    Validate segOP      Keep last 24 blocks
 payload           + policy rules   P2SOP commit     segOP payload       TLVs + commitment   (mandatory window)
                                                                         before relay
                                                                          
                     ─────────────── Data Flow Summary ───────────────

 Full blocks include full segOP payload
 Compact blocks omit it (must fetch via getsegopdata)
 Blocks older than retention window prune segOP payload
 P2SOP commitment remains forever (consensus-critical)
```
---

# Appendix E — segOP Transaction Lifecycle (Informative)

This appendix provides an end-to-end, non-normative walkthrough of a segOP-bearing transaction. It is intended to assist implementers and reviewers in understanding how segOP behaves across creation, relay, validation, and pruning, and how it integrates with the P2P network.

## E.1 Creation

1. **Application prepares payload**

    - Wallet or application constructs a TLV-structured `segop_payload`.
    - TLV records MUST be well-formed: `[type][len][value]` concatenated.

2. **Compute segOP commitment**

    ```
    segop_commitment = TAGGED_HASH("segop:commitment", segop_payload)
    ```

3. **Insert P2SOP output**

    - A single OP_RETURN output is added containing `"P2SOP"` and the  32-byte `segop_commitment`.

4. **Insert segOP section**

    ```
    segop_marker = 0x53
    segop_version = 0x01
    segop_len = varint(len(payload))
    segop_payload = TLV stream
    ```

5. **Set global flag bits**

    - SegWit? set bit 0
    - segOP? set bit 1

6. **Compute txid and wtxid**

    - `txid` excludes segOP and witness data.
    - `wtxid` excludes segOP but includes witness.

7. **Compute fullxid (optional)**

    ```
    fullxid = TAGGED_HASH("segop:fullxid", extended_serialization)
    ```

8. Transaction is now ready for mempool acceptance.

---

## E.2 Mempool Acceptance at a Validating Node

When a node receives the transaction:

1. **Detect extended format**

    - `marker == 0x00`, `flag != 0x00`.

2. **Check structural correctness**

    - Exactly one segOP section.
    - Exactly one P2SOP output.
    - `segop_len ≤ MAX_SEGOP_TX_BYTES`.

3. **Validate TLV stream**

    - Lengths match.
    - No malformed TLVs.
    - Stream size exactly equals `segop_len`.

4. **Recompute segop_commitment**

    - Check that commitment equals the 32-byte value in the P2SOP output.

5. **Apply standard mempool policy**

    - Weight, minfeerate, RBF, script validity (independent of segOP).

6. **Store full segOP payload in mempool**

    - Mempools do not prune.

Transaction is now relayed using `inv(MSG_TX_SOP)` announcements.

---

## E.3 Block Template Construction (Miner Side)

Miners:

1. Select transactions by feerate and policy.
2. Include **both**:
    - the P2SOP output,
    - the full segOP section.
3. Compute:
    - txid  
    - hashMerkleRoot  
    - block header  
4. Mine normally.

No special mining logic is required beyond full segOP inclusion.

---

## E.4 Block Relay (Full Blocks)

A block announced via `block`:

    - **MUST include full segOP payload bytes.**
    - Nodes receiving the block have everything required to validate segOP locally.

Workflow on reception:

1. Receive block message  
2. Validate header + PoW  
3. Parse transactions  
4. For each segOP tx:  
    - Check segop_version  
    - Check segop_len  
    - Validate TLV  
    - Recompute `segop_commitment`  
    - Verify P2SOP commitment  

If all checks succeed, the block is provisionally valid and eligible for relay.

---

## E.5 Block Relay (Compact Blocks)

Compact block relay mechanisms (e.g. `cmpctblock`):

- **Omit segOP payload bytes**  
- Include enough metadata (scriptPubKey for P2SOP or short ID reconstruction) for receiver to identify which transactions contain segOP.

Receiver workflow:

```
cmpctblock received
|
v
Reconstruct transactions (txids/shortids)
|
v
Identify segOP-bearing txs
|
v
Send getsegopdata for missing payloads
|
v
Receive segopdata (payload bytes)
|
v
Validate TLV + P2SOP commitment
|
v
Accept block; relay
```

---

## E.6 Validation and Activation

A node MUST:

1. Validate all segOP payloads in full.
2. Validate P2SOP commitments.
3. Mark block as valid only after segOP validation completes.
4. Relay block to peers once fully validated.

Nodes MUST NOT relay segOP-bearing blocks before completing segOP validation.

---

## E.7 Retention Window

After a block is accepted:

1. segOP payloads MUST be stored for at least the **Validation Window**:

    ```
    W = 24 blocks
    ```

2. Node operators MAY extend storage using:

    ```
    -sopwindow=R
    ```

3. Effective Window:

    ```
    E = max(W, R)
    ```

    Blocks older than `tip - E` MAY have their segOP payload pruned.

    Pruning removes:

    - `segop_payload` bytes

    Pruning retains:

    - transaction header
    - segOP marker/version/len (if stored inline)
    - P2SOP output
    - Merkle root
    - block hash  
    - all consensus-critical data

---

## E.8 Pruned State

If a node has pruned segOP payload for a historical block:

- The segOP section is replaced by a placeholder or omitted from storage.
- The P2SOP output still commits to the correct hashed payload.
- Block hashes, Merkle roots, and chain consensus remain intact.

Pruned nodes CANNOT recompute `fullxid` without refetching payload bytes.

---

## E.9 Historical Retrieval (Archive Interaction)

When a pruned node needs segOP payload for a pruned block:

1. Identify missed payloads for txids

2. Find peers advertising:

    - `NODE_SOP_RECENT` (recent blocks)
    - `NODE_SOP_ARCHIVE` (full history)
3. Send:

    `getsegopdata { txids: [...] }`

5. Receive:

    `segopdata { txid, sopver, soplen, soppayload }`

7. Recompute:

   `expected_commitment = TAGGED_HASH("segop:commitment", soppayload)`

6. Validate against embedded P2SOP commitment  

7. Use payload as needed (explorer, L2, fullxid)

---

## E.10 Interaction with Higher Layers (Optional)

Higher-layer protocols may:

- embed commitments or metadata in TLVs  
- use segOP as a “data anchoring lane”  
- derive protocol-level IDs from `fullxid`  
- rely on archive nodes for historical payloads  

Such protocols MUST NOT alter Bitcoin consensus rules.

---

## E.11 Summary

The segOP lifecycle is:

```
Construct → Mempool → Mining → Relay → Full Validation → Retention (W/R/E) → Pruning → Historical Retrieval (optional)
```

At each step, segOP maintains:

- Full fee fairness  
- Strong commitment binding  
- Optional prunability  
- Optional extended identifiers  
- Clean separation between consensus and policy  

---

# Appendix F — Glossary (Informative)

This glossary defines key terms used throughout the segOP specification. It is non-normative and provided for clarity.

---

## Active Chain

The best valid chain recognized by the node. All segOP validation, pruning decisions, and retention windows apply only to blocks on the active chain.

---

## Archive Window Node

A node that stores **all** segOP payload bytes for the entire chain history. Such nodes advertise `NODE_SOP_ARCHIVE` and serve historical segOP data to peers.

---

## Commitment (P2SOP Commitment)

A 32-byte tagged hash embedded in a P2SOP output:

```
segop_commitment = TAGGED_HASH("segop:commitment", segop_payload)
```

This binds the segOP payload to the transaction for consensus.

---

## Effective Retention Window (E)

The number of blocks for which a node **retains segOP payload bytes**.

Defined as:

```
E = max(W, R)
```

where `W` is the mandatory Validation Window and `R` is the optional
Operator Window.

---

## Extended Transaction

A transaction using the SegWit-style marker and flag (`00 <flag>`) format. Extended transactions include SegWit, segOP, or both.

---

## Extended Serialization

The full wire-format transaction including:

- nVersion  
- marker, flag  
- vin  
- vout  
- witness (if any)  
- segOP section (if any)  
- nLockTime  

Used for `fullxid`.

---

## fullxid

An **optional** extended identifier that commits to the entire segOP-extended transaction. Computed as:

```
fullxid = TAGGED_HASH("segop:fullxid", extended_serialization)
```

Not required for consensus. Useful for indexing, tooling, or L2 anchoring.

---

## Legacy Node

A node unaware of segOP. It:

- ignores segOP bytes  
- computes `txid` and `wtxid` exactly as before  
- sees segOP-bearing transactions as valid

Legacy nodes remain fully compatible with segOP.

---

## node retention horizon

The earliest block height for which a node retains segOP payload bytes.

All heights `< horizon` may have pruned payloads.

---

## Operator Window (R)

Optional user-configurable retention period:

```
-sopwindow=R # R ≥ 0 blocks
```

Extends storage beyond the mandatory Validation Window.

---

## P2SOP (Pay-to-SegOP)

A special OP_RETURN script that commits to a segOP payload:

```
6a25 5032534f50 <32-byte-commitment>
```

Every segOP transaction MUST contain exactly one P2SOP output.

---

## segOP (Segregated OP_RETURN)

A post-witness data section containing:

- `segop_marker   = 0x53`
- `segop_version  = 0x01`
- `segop_len      = varint`
- `segop_payload` = TLV-encoded data

---

## segOP-aware Node

A node implementing this specification. It:

- validates segOP payloads,
- enforces P2SOP commitment rules,
- advertises segOP data serving capabilities via P2P service flags,
- MAY prune payload bytes after the retention window.

---

## segOP Marker (`segop_marker`)

A 1-byte marker:

```
0x53 ('S')
```

Identifies the presence of a segOP section. Any other value MUST be rejected.

---

## segOP Payload (`segop_payload`)

The byte sequence committed by the P2SOP output. Defined as a series of TLV records. Payloads are prunable outside the retention window.

---

## segOP Section

The encoded sequence:

```
segop_marker || segop_version || segop_len || segop_payload
```

Appears after witness data and before `nLockTime`.

Exactly one segment is allowed per segOP transaction.

---

## segOP Version (`segop_version`)

The protocol version of the segOP section. For v1:

```
segop_version = 0x01
```

Future versions may extend this field.

---

## TLV (Type–Length–Value)

The encoding format of segOP payloads:

```
[type][len][value]
```

Enforced by consensus. All TLVs MUST be well-formed.

---

## Validation Window (W)

Mandatory minimum number of blocks for which segOP payload bytes MUST be retained:

```
W = 24 blocks
```

Allows reorg safety, reliable relay, and validation.

---

## Validation Window Node

A node retaining segOP payload bytes only for the mandatory 24-block Validation Window.

---

## Witness (SegWit)

SegWit data remains unchanged by segOP. Witness bytes:

- are discounted in weight,
- are part of the wtxid,
- appear before segOP.

segOP does not modify SegWit consensus.

---

## wtxid

The SegWit witness-inclusive transaction ID, unchanged from BIP141.

Does **not** commit to segOP bytes.

---

## txid

The legacy transaction ID. Computed without:

- marker, flag
- witness data
- segOP section

Unchanged by segOP.

---

# Appendix G — Worked Validation Example

This appendix walks through validation of a concrete segOP-bearing transaction. All hex values are illustrative but internally consistent.

---

## G.1 Example Transaction Overview

The example transaction:

```
- Version: 1
- Inputs: 1 SegWit input (P2WPKH), empty scriptSig
- Outputs:
  - vout0: P2SOP commitment (OP_RETURN)
  - vout1: P2WPKH payment output
- SegWit: present (`flag` bit 0 = 1)
- segOP: present (`flag` bit 1 = 1)
- segOP payload:
  - TLV #1: metadata text `"segOP TLV test!!"`
  - TLV #2: 4-byte integer
```

---

## G.2 Raw segOP Payload

The segOP TLV stream is:

```
- TLV #1  
  - `type = 0x01`  
  - `len  = 0x10` (16)  
  - `value = "segOP TLV test!!"` (ASCII)

- TLV #2  
  - `type = 0x02`  
  - `len  = 0x04` (4)  
  - `value = 0x00000001`
```

Concatenated payload (`segop_payload`):

```
01 10 73 65 67 4f 50 20 54 4c 56 20 74 65 73 74 21 21 02 04 00 00 00 01
```

Hex (no spaces):

```
01107365674f5020544c5620746573742121020400000001
```

Payload length:

- 24 bytes → `segop_len = 0x18`.

---

## G.3 P2SOP Commitment

Using the tagged-hash convention (§7.1):

```
TAG = SHA256("segop:commitment")
segop_commitment = SHA256(TAG || TAG || segop_payload)
```

For the payload above, this yields:

```
segop_commitment =
61 7e 2b 1a 86 0b 79 e7 38 d8 95 26 70 1e 03 d1
56 1a b2 a3 fd d8 d5 8b f2 ef 03 9f 5d 9f 59 72
```

Hex:

```
617e2b1a860b79e738d89526701e03d1561ab2a3fdd8d58bf2ef039f5d9f5972
```

This value appears in the P2SOP output script.

---

## G.4 Full Transaction Hex (Extended Serialization)

The full extended transaction (including SegWit and segOP) is:

```
01000000 # nVersion = 1

0003 # marker=0x00, flag=0x03 (SegWit + segOP)

01 # vin_count = 1
0000000000000000000000000000000000000000000000000000000000000001 # prevout_hash
00000000 # prevout_index
00 # scriptSig length
ffffffff # nSequence

02 # vout_count = 2

vout0 — P2SOP commitment (value = 0)
0000000000000000 # value (0)
27 # scriptPubKey length = 39
6a # OP_RETURN
25 # PUSHDATA(37)
50 32 53 4f 50 # "P2SOP"
617e2b1a860b79e738d89526701e03d1561ab2a3fdd8d58bf2ef039f5d9f5972 # segop_commitment

vout1 — P2WPKH (1,000,000 sats)
40420f0000000000 # value = 1,000,000
16 # scriptPubKey length = 22
00 # OP_0
14 # PUSH(20)
11 11 11 11 11 11 11 11 11 11
11 11 11 11 11 11 11 11 11 11 # 20-byte keyhash (dummy)

SegWit witness for the single input
02 # number of stack items
47 # push 71-byte signature
01 01 01 01 01 01 01 01 01 01
01 01 01 01 01 01 01 01 01 01
01 01 01 01 01 01 01 01 01 01
01 01 01 01 01 01 01 01 01 01
01 01 01 01 01 01 01 01 01 01
01 01 01 01 01 01 01 01 01 01
01 # (dummy bytes)
21 # push 33-byte pubkey
02 02 02 02 02 02 02 02 02 02
02 02 02 02 02 02 02 02 02 02
02 02 02 02 02 02 02 02 02 02
02 02 02 # (dummy bytes)

segOP section
53 # segop_marker = 'S'
01 # segop_version = 0x01
18 # segop_len = 24
01 10 73 65 67 4f 50 20 54 4c 56 20 74 65 73 74 21 21
02 04 00 00 00 01 # segop_payload

00000000 # nLockTime
```

Concatenated (no comments, no spaces), this is a 266-byte transaction.

---

## G.5 Computing txid, wtxid, and fullxid

### G.5.1 txid (legacy ID)

For `txid`, we serialize the transaction **without**:

- marker/flag
- witness data
- segOP section

Serialization for `txid`:

```
nVersion ||
vin_count || vin ||
vout_count || vout0 || vout1 ||
nLockTime
```

Double-SHA256, displayed in big-endian:

```
txid = 15aa692629eb04c97e55c313c569cfaac1e09c9ffaa8359f3ffc251c43458d89
```

segOP and SegWit do not change `txid`.

---

### G.5.2 wtxid (SegWit ID)

For `wtxid`, we follow BIP141:

- include marker/flag
- include witness data
- **exclude** segOP section

Serialization for `wtxid`:

```
nVersion ||
marker || flag ||
vin_count || vin ||
vout_count || vout0 || vout1 ||
witness ||
nLockTime
```

Double-SHA256, big-endian:

```
wtxid = 44f812cd07af6fc4d6dfd6dc4b0596fda6c927f24df3212ae63c6680714c822f
```

segOP does not affect the `wtxid`.

---

### G.5.3 fullxid (optional segOP extended ID)

For `fullxid`, we commit to the **entire extended transaction**, including segOP:

```
extended_serialization =
nVersion ||
marker || flag ||
vin_count || vin ||
vout_count || vout0 || vout1 ||
witness ||
segOP section ||
nLockTime
```

Using the tagged-hash convention with tag `"segop:fullxid"`:

```
fullxid = TAGGED_HASH("segop:fullxid", extended_serialization)
```

For this example:

```
fullxid = 02c79f8156074514a9154b40400a9359e513fc8b6649342ef88612391d718f69
```

`fullxid` is optional and non-consensus; it is shown here for completeness.

---

## G.6 segOP Validation Checklist for the Example

A segOP-aware node validating this transaction in a block performs:

1. Parse extended format (`marker=0x00`, `flag=0x03`).
2. Confirm segOP present (`flag & 0x02 != 0`).
3. Confirm exactly one segOP section and one P2SOP output.
4. Read `segop_marker = 0x53`, reject if not.
5. Check `segop_version = 0x01`.
6. Read `segop_len = 0x18` (24), ensure payload size is exactly 24 bytes.
7. Parse TLV stream:
   - TLV #1: type=0x01, len=0x10, 16 bytes present.
   - TLV #2: type=0x02, len=0x04, 4 bytes present.
   - No trailing bytes; stream length = 24.
8. Recompute `segop_commitment` from `segop_payload` using TAGGED_HASH.
9. Extract the 32-byte value from the P2SOP script.
10. Compare: if `expected_commitment != script_commitment`, reject.
11. If all checks pass, segOP validation succeeds; the transaction can be included
    in a block and relayed under segOP rules.

---

# Appendix H — Rationale / Design Motivations (Informative)

This appendix explains the main design choices behind segOP and why the
specification is structured as it is. It is informative and not consensus.

---

## H.1 Goals

segOP is designed to:

1. Provide a **dedicated lane** for structured, fee-paying arbitrary data.
2. Restore **fee fairness** by charging `4 WU / byte` for data payloads.
3. Enable **safe pruning** of data bytes while preserving consensus validity.
4. Preserve full **backward compatibility** with legacy nodes and tooling.
5. Offer a **clean extension point** for higher-layer protocols (vaults, L2s, rollups, quantum-signature lanes, etc.) without forcing them into Script.

---

## H.2 Why a Post-Witness Data Lane?

Placing segOP **after witness data and before nLockTime**:

- Minimizes changes to the existing transaction structure.
- Reuses the SegWit marker/flag mechanism instead of inventing another.
- Keeps `txid` and `wtxid` identical to pre-segOP Bitcoin.
- Avoids retrofitting or overloading scriptPubKey semantics.

A “post-witness lane” also cleanly separates:

- Script evaluation (inputs/outputs, witness).
- Payload data (segOP).
- Global transaction fields (`nVersion`, `nLockTime`).

This separation makes pruning and tooling much simpler.

---

## H.3 Why Full Fees (4 WU / byte)?

segOP charges **full block weight** for every payload byte:

- No discount analogous to SegWit’s witness discount.
- Prevents a repeat of the “witness as cheap data” problem.
- Makes data-heavy protocols internalize their full on-chain footprint.

The economic intent is:

- Pure financial transactions should not be displaced by discounted arbitrary data.
- Data-heavy applications can *still* use Bitcoin, but must pay full price.

---

## H.4 Why P2SOP + 1:1 Mapping?

Each segOP payload is bound to exactly one P2SOP output, and each segOP-bearing transaction has exactly one segOP section.

Reasons:

- Simple invariant: **1 transaction → 1 P2SOP → 1 segOP payload**.
- Easy to reason about for validators, auditors, and tools.
- Avoids complex multi-payload binding schemes in v1.
- Ensures the payload commitment is clearly visible in the UTXO set.

This design makes it obvious, even to legacy tools, that:

- The transaction has an OP_RETURN output with a structured prefix (`"P2SOP"`).
- That output is where segOP payload data is logically anchored.

---

## H.5 Why Mandatory TLV Structure?

The segOP payload is required to be a concatenation of well-formed TLVs:

- Prevents “raw blob only” encodings that are impossible to parse incrementally.
- Encourages structured protocols with clear metadata vs body separation.
- Enables light-weight parsers to skim metadata TLVs and skip large blobs.
- Allows multiple logical components (e.g., rollup headers, state roots,
  metadata, vault policies) in a single payload.
- Enables forward compatibility: unknown `type` values can be skipped safely.

By making TLV **consensus-mandatory**, segOP ensures that:

- Garbage or malformed payloads are rejected at validation time, not left to off-chain interpretation.
- Indexers and higher-layer protocols have a stable framing to build upon.

---

## H.6 Why Pruning and Retention Windows?

Bitcoin’s philosophy is:

> validate everything, **optionally** prune old data.

segOP makes that model explicit for arbitrary data:

- **Validation Window (W = 24)**

  All segOP-aware nodes must retain payloads for at least the last 24 blocks to:
  
  - handle small reorgs,
  - avoid fetch/prune thrashing,
  - guarantee robust relay behaviour.

- **Operator Window (R)**  
  Node operators can extend retention to days, weeks, or more for their own use.

- **Archive Window**  
  A subset of nodes may choose to keep everything and serve as historical providers (`NODE_SOP_ARCHIVE`).

The aim is to:

- Avoid forcing every node to become a permanent data-archive node.
- Still guarantee that all nodes fully validate segOP data when blocks are new.
- Allow long-range users (L2s, explorers, audits) to obtain data from archive nodes.

---

## H.7 Why Separate P2P Messages (getsegopdata / segopdata)?

segOP payloads can be large and are **not** required in every relay path:

- Full blocks carry segOP payload bytes.  
- Compact blocks omit segOP payload and rely on later fetching when needed.

Dedicated messages (`getsegopdata`, `segopdata`) allow:

- Targeted fetching of only the payloads that are missing.
- Precise bandwidth accounting and DoS protection.
- A clear separation between “header/ID-level” relay and “payload-level” relay.

This mirrors existing Bitcoin design patterns (compact blocks, witness fetching), but keeps segOP’s bandwidth overhead strictly controlled.

---

## H.8 Why Keep txid / wtxid Unchanged?

One of the strongest design constraints was:

- Do **not** break existing transaction identifiers.

segOP keeps:

- `txid` identical to pre-segOP rules (no marker, no witness, no segOP).
- `wtxid` identical to BIP141 (includes witness, not segOP).

This preserves:

- Existing transaction indexing schemes.
- Wallet assumptions about txid/wtxid.
- Compatibility with legacy software and block explorers.

segOP only introduces **optional** `fullxid` for those who want an ID that commits to the entire extended serialization.

---

## H.9 Why fullxid is Optional and Non-Consensus

`fullxid` is deliberately **not** a consensus identifier:

- It is useful for:
  - L2 protocols.
  - explorers / indexers.
  - tooling and debugging.
- It is not required for:
  - block validation,
  - mempool acceptance,
  - P2P relay.

This avoids:

- Introducing yet another ID that nodes *must* track.
- Complicating consensus around transaction identification.

`fullxid` is a convenience for higher layers, not a requirement for Bitcoin’s base consensus.

---

## H.10 Why Use Reserved Flag Bits?

The SegWit marker/flag scheme already provides a compact way to signal extensions. segOP reuses this and reserves future bits for:

- Potential segregated witness-style lanes (`segOP-Wit`).
- Quantum-secure signature sub-lanes (Qsig).
- Other structured data channels.

This decision:

- Avoids consuming new opcodes prematurely.
- Keeps future extension negotiation simple.
- Ensures soft-fork compatibility: reserved bits must be zero until defined.

---

## H.11 Why Not Reuse OP_RETURN Alone?

OP_RETURN already allows embedding arbitrary data, but:

- It is unstructured.
- It is not prunable separately from the rest of the transaction.
- It is entangled with script and policy.
- It has no dedicated retention model.

segOP moves the payload into a **separate lane**:

- OP_RETURN (via P2SOP) carries only the commitment.
- segOP carries the payload, in an explicitly prunable section.
- Nodes can drop payload bytes while retaining commitments and full consensus safety.

This provides a cleaner separation of concerns:

- Script and UTXOs in one place.
- Data payloads in another.
- Clear rules for when and how data may be pruned.

---

## H.12 Summary

segOP’s design is shaped by these principles:

- **Fairness** — data pays full price.  
- **Structure** — TLV framing instead of opaque blobs.  
- **Safety** — payloads fully validated and strongly committed.  
- **Prunability** — nodes choose how much to store beyond a mandatory window.  
- **Compatibility** — no changes to txid/wtxid, minimal changes to wire format.  
- **Extensibility** — reserved flags, tagged hashes, and TLVs make future extensions possible without breaking v1.

This rationale is informative only, but it reflects the intended economic and technical behaviour of segOP in the Bitcoin ecosystem.

---
End of segOP-Extended Transaction Specification
