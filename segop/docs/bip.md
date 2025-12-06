BIP: TBD  
Title: Segregated OP_RETURN (segOP)  
Author: Defenwycke <defenwycke@icloud.com>  
Comments-URI: TBD  
Status: Draft  
Type: Standards Track  
Layer: Consensus (soft fork)  
Created: 2025-11-15  
License: BSD-3-Clause  
Requires: 141, 144  

---

# Abstract

This BIP proposes **segOP** (Segregated OP_RETURN), a soft-fork consensus change
that introduces:

- a dedicated, post-witness **data section** in Bitcoin transactions  
- mandatory **TLV encoding** of that data  
- a single **OP_RETURN commitment** binding the payload  
- backward-compatible txid and wtxid semantics  
- a **prunable** payload model after a safe validation horizon  

The segOP lane sits after the witness section and before `nLockTime`, pays full
block weight, and allows structured, authenticated data without interfering with
script execution or existing transaction fields.

Legacy nodes remain unaware of segOP and continue to operate normally.

---

# Motivation

## Summary

Bitcoin currently carries arbitrary or semi-structured data in multiple locations:
scriptSig, witness, OP_RETURN, annex, tapscript pushes, and fragmented multi-output
layouts. This creates inconsistent pricing, unpredictable mempool behaviour,
unstructured use, and no commitment semantics.

The goal of segOP is to provide:

- a **fully-priced, non-discounted data lane**  
- **deterministic TLV structure**  
- a **1:1 commitment** between data and an OP_RETURN output  
- a **bounded validation horizon** supporting safe pruning  
- a fully backward-compatible extension to BIP141  

This allows small, authenticated metadata (vault proofs, state commitments,
signalling, L2 anchors, etc.) to exist without relying on witness discount or
unstructured embedding.

---

# Specification

## 1. Extended Transaction Format

segOP extends the BIP141 marker/flag transaction format by introducing a new
flag bit indicating the presence of a segOP section.

### Legacy (non-extended) format

```
nVersion
vin_count (≠ 0x00)
vin[]
vout[]
nLockTime
```

### Extended format (SegWit, segOP, or both)

```
nVersion
marker = 0x00
flag ≠ 0x00
vin[]
vout[]
[witnesses...]      (if flag bit 0 set)
[segOP section...]  (if flag bit 1 set)
nLockTime
```

### Marker and Flag

- marker = `0x00`  
- flag is a bitfield:

| Bit | Meaning          |
|-----|------------------|
| 0   | SegWit present   |
| 1   | segOP present    |
| 2–7 | MUST be zero     |

Transactions with reserved bits set MUST be invalid under segOP rules.

Examples:

- SegWit only: `flag = 0x01`  
- segOP only: `flag = 0x02`  
- SegWit + segOP: `flag = 0x03`

---

## 2. segOP Lane Encoding

If `flag & 0x02` is non-zero, the transaction MUST contain exactly one segOP section
directly after the witness section (if any):

```
segop_marker   = 0x53 ('S')
segop_version  = 0x01
segop_len      = CompactSize
segop_payload  = segop_len bytes (TLV stream)
```

Consensus rules:

- `segop_marker` MUST be `0x53`  
- `segop_version` MUST be `0x01`  
- `segop_payload` length MUST equal `segop_len`  
- There MUST be exactly one segOP section when the segOP flag bit is set  
- If the segOP flag bit is clear, a segOP section MUST NOT appear  

Implementations MUST enforce canonical CompactSize encoding.

---

## 3. TLV Payload (Consensus)

The segOP payload consists of concatenated TLVs:

```
type: 1 byte
len:  CompactSize
value: len bytes
```

Rules:

- TLVs MUST be contiguous (no padding).  
- The sum of TLV encodings MUST equal `segop_len`.  
- Mis-encoded TLVs (overrun, non-canonical length) MUST invalidate the transaction.  
- Unknown TLV types MUST be skipped (forward-compatible).  

No restrictions are placed on individual TLV types or their semantics at the
consensus level.

---

## 4. Commitment Output (P2SOP)

Each segOP payload MUST be committed to by exactly one OP_RETURN output in the same
transaction.

ScriptPubKey form:

```
OP_RETURN <"P2SOP" (5 bytes)> <32-byte commitment>
```

Canonical hex:

```
6a25 5032534f50 <32 bytes>
```

Where:

```
TAG = SHA256("segop:commitment")
segop_commitment = SHA256(TAG || TAG || segop_payload)
```

Consensus rules:

- A transaction with segOP flag bit set MUST contain exactly one P2SOP output.  
- A transaction with the segOP flag bit clear MUST NOT contain any P2SOP output.  
- The commitment MUST match the payload exactly.

---

## 5. Identifiers

### txid (unchanged)

txid remains the pre-witness serialization **excluding**:

- marker/flag  
- witness data  
- segOP section  

### wtxid (unchanged)

wtxid remains defined exactly as in BIP141 and does **not** commit to segOP.

### fullxid (optional)

Implementations MAY compute an additional identifier committing to the entire
extended transaction:

```
TAG = SHA256("segop:fullxid")
fullxid = SHA256(TAG || TAG || extended_serialization)
```

This is non-consensus.

---

## 6. Weight and Fees

segOP bytes are counted in stripped size and receive **no witness discount**.

```
weight = 4 * stripped_size + witness_size
```

For consensus, segOP payloads MUST NOT exceed MAX_SEGOP_TX_BYTES = 64,000 bytes.
Implementations MUST reject any transaction whose segOP_len exceeds this value.

Beyond this consensus bound, no additional block-wide segOP limits are defined
in this BIP; block-level constraints are left to local policy.

---

# Validation Rules (Consensus)

For each segOP transaction, validators MUST:

1. Parse segOP marker and version.
2. Verify `segop_len` and match `segop_payload` size.
3. Validate TLV framing.
4. Locate exactly one P2SOP output.
5. Recompute the commitment and compare.

Blocks containing invalid segOP transactions MUST be rejected.

---

# Retention and Pruning (Implementation Guidance)

segOP is designed for safe, bounded validation.  
Consensus does **not** require nodes to retain segOP payloads indefinitely.

Implementations SHOULD retain segOP payloads for at least the expected maximum
reorg depth (e.g. 24 blocks) to ensure:

- reorg safety  
- block validation  
- reliable relay  

Beyond this horizon, nodes MAY prune segOP payload bytes.  
Pruning MUST NOT remove:

- the transaction itself  
- txid/wtxid-relevant fields  
- the P2SOP output  
- any Merkle-related data  

Only segOP payload bytes are prunable.

---

# Backwards Compatibility

Legacy nodes:

- parse extended-format transactions as usual  
- ignore segOP bytes entirely  
- compute txid and wtxid exactly as today  
- accept segOP transactions as valid  

segOP is a soft fork: all segOP-valid blocks are valid to legacy nodes.

---

# Test Vector (Minimal)

The following illustrates a small segOP payload containing one TLV:

```
TLV:
type = 0x01
len  = 0x03
value = "abc"

segop_payload hex:
01 03 61 62 63
```

Commitment:

```
TAG = SHA256("segop:commitment")
segop_commitment = SHA256(TAG||TAG||0103616263)
```

A compliant transaction must contain exactly one OP_RETURN output carrying
`"P2SOP" || segop_commitment`.

(This vector is illustrative; full vectors are provided in the reference repository.)

---

# Rationale

### Why a post-witness lane?

- Minimal disruption to existing parsing  
- Reuse of BIP141 marker/flag structure  
- No change to txid or wtxid  
- Clear separation between script evaluation and metadata  

### Why no witness discount?

Witness discount unintentionally incentivised arbitrary data placement.  
segOP restores fee fairness by charging full weight.

### Why TLV?

TLV ensures:

- deterministic parsing  
- forward compatibility  
- multiple logical components in a single payload  

### Why a single commitment?

One payload ↔ one commitment reduces ambiguity and strengthens validation.

### Interaction with BUDS (informational)

BUDS, defined in a separate informational BIP, is an optional descriptive standard
for classifying transaction data. segOP is independent of BUDS, but compatible:
applications may choose to encode BUDS markers within TLVs without affecting
consensus.

---

# Deployment

Activation parameters (versionbits, signaling thresholds, timeouts) are left for
future discussion and are out of scope for this document.

Testnet/signet deployments MAY use relaxed parameters.

---

# Appendix A — Implementer Notes (Informative)

- segOP sections must be fully parsed before validation of the P2SOP commitment.  
- Efficient storage may treat segOP payloads as “extended attributes” not required
  for long-term chain state.  
- Mempool implementations may optionally evict older segOP payloads first during
  memory pressure.

---

# Appendix B — P2P Extensions (Informative)

Future implementations MAY introduce:

- service bits advertising recent or archival segOP support  
- `getsegopdata` / `segopdata` messages for compact block relay contexts  

These are NOT part of consensus and are optional for nodes.

---

# Appendix C — Optional Fee-Multiplier Model (Informative)

This appendix describes an **optional**, **non-consensus** fee model that node
operators and miners MAY choose to adopt locally. It is included only to
illustrate how segOP and descriptive metadata (such as BUDS tiers, defined in a
separate informational BIP) can support more predictable fee markets without
affecting transaction validity.

Nothing in this section is consensus-critical, and implementations MUST NOT
reject transactions based on these rules.

## Local Tier-Based Multipliers (Optional)

Operators MAY apply fee multipliers based on the highest-tier data detected in a
transaction’s segOP TLV payload. One example model is:

| Tier | Meaning                       | Multiplier |
|------|-------------------------------|------------|
| T0   | Consensus / payment data      | ×1         |
| T1   | Light metadata                | ×2         |
| T2   | Structured operational data   | ×3         |
| T3   | Unlabelled / opaque data      | ×4         |

Under this model:

- Pure payments and clearly structured, low-impact metadata remain inexpensive.  
- Applications embedding increasingly heavy or opaque data pay proportionally
  higher fees.  
- Unlabelled or ambiguous payloads default to the highest tier (T3), assigning a
  higher cost to opaque usage without forbidding it.

## Rationale (Informative)

Such local fee policies enable node operators and miners to:

- reflect data transparency in pricing  
- discourage high-impact or obfuscated usage  
- retain flexibility across different economic or cultural environments  

Because this model is purely local and optional, it does not require any network-
level coordination, avoids consensus risk, and preserves Bitcoin’s permissionless
transaction model.

Consensus behaviour, txid, wtxid, validation rules, and block construction remain
entirely unchanged.

---

# Reference Specification (Informative)

A complete technical specification for segOP — including extended transaction
serialization, TLV parsing, P2SOP commitment computation, state-machine details,
and reference pseudocode — is maintained in the project repository:

```
segop/docs/spec.md
```

This specification is **informative** and provides implementers with precise,
line-by-line detail. In case of ambiguity, **this BIP is normative** for all
consensus rules.

---

# Acknowledgements

Thanks to reviewers and prior work in data-commitment structures, pruning models,
and transaction extension mechanisms, which informed this proposal.

