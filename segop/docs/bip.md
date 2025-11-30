BIP: TBD  
Title: Segregated OP_RETURN (segOP)  
Author: Defenwycke <defenwycke@icloud.com>  
Comments-URI: TBD  
Status: Draft  
Type: Standards Track  
Layer: Consensus (soft fork)  
Created: 15-11-2025  
License: BSD-3-Clause  
Requires: 141, 144  
Replaces: None  
Superseded-By: None  

# Abstract

This BIP proposes “segOP” (Segregated OP_RETURN), a consensus change introducing a dedicated, post-witness data section in Bitcoin transactions and a corresponding commitment output (P2SOP – Pay-to-SegOP). The segOP section:

* Is placed after SegWit witness data and before nLockTime.  
* Carries arbitrary or structured data in a mandatory TLV (Type–Length–Value) format.  
* Pays full block weight (4 WU/byte), with no SegWit discount.  
* Is cryptographically bound to the transaction via a single OP_RETURN commitment output.  
* Is prunable after a mandatory retention window, without weakening consensus.

Legacy nodes remain unaware of segOP and compute txid and wtxid exactly as today. segOP-aware nodes validate the payload and its commitment, and may adopt local retention or pruning policies.

# Motivation

Bitcoin already carries arbitrary or semi-structured data across multiple locations:

* OP_RETURN  
* scriptSig pushes  
* SegWit witness  
* Taproot annex and Tapscript pushes  
* Multi-input witness stuffing and multi-output fragmentation  

This has produced long-standing problems:

* No required structure.  
* No consistent pricing.  
* No explicit commitment model.  
* No retention model.  
* No dedicated data lane.  

Meanwhile, critical applications depend on small, authenticated metadata: vaults, custody proofs, L2 anchors, DLCs, state commitments, signalling, etc.

The question is not whether Bitcoin should support arbitrary data, but how to do so safely and predictably.

segOP introduces:

* A fully-priced data lane.  
* TLV structure required by consensus.  
* A one-to-one binding between payload and commitment.  
* A retention window for safe pruning.  
* Backward compatibility.  

Together with BUDS tiering (non-consensus metadata), segOP also gives Core and the wider ecosystem a clear “data taxonomy” to aim at in the future: if protocols label their data correctly, nodes and miners can progressively tighten policy around unlabelled or opaque data without breaking transparent, well-structured usage.

# Specification

## Overview

segOP extends BIP141’s marker/flag extended transaction encoding by introducing an optional post-witness data lane:

    `core transaction → optional SegWit witness → optional segOP section → nLockTime`

Key properties:

* Placement after witness, before nLockTime.  
* Fully priced at 4 WU/byte.  
* TLV-encoded by consensus.  
* Exactly one P2SOP commitment per segOP transaction.  
* Exactly one segOP section.  
* Prunable beyond the retention window W.  
* txid and wtxid remain unchanged.  

## Transaction Format

segOP reuses the BIP141 extended format.

### Non-extended transaction (legacy)

```
nVersion
vin_count (≠ 0x00)
vin[0..]
vout[0..]
nLockTime
```

### Extended format (SegWit, segOP, or both)

```
nVersion
marker = 0x00
flag   ≠ 0x00
vin[0..]
vout[0..]
[witnesses...]     (if flag & 0x01)
[segOP section...] (if flag & 0x02)
nLockTime
```

### Marker and Flag

* marker = 0x00  
* flag = bitfield  

For segOP v1:

* bit 0 → SegWit present  
* bit 1 → segOP present  
* bits 2–7 → MUST be zero  

If any reserved bits are set, the transaction MUST be invalid under segOP rules.

Examples:

* SegWit only: marker=0x00, flag=0x01  
* segOP only: marker=0x00, flag=0x02  
* SegWit + segOP: marker=0x00, flag=0x03  

### segOP Lane Placement

If (flag & 0x02) != 0, the segOP lane is appended after inputs/outputs and any witness:

```
nVersion
marker = 0x00
flag
vin[0..]
vout[0..]
[witnesses...]       (if flag & 0x01)
segop_marker   = 0x53 ('S')
segop_version  = 0x01
segop_len      = CompactSize
segop_payload  = segop_len bytes (TLV stream)
nLockTime
```

* segop_marker MUST be 0x53.  
* segop_version MUST be 0x01.  

There MUST be exactly one segOP section if the segOP bit is set.

## segOP Section

A segOP section is:

```
segop_marker || segop_version || segop_len || segop_payload
```

Consensus rules:

* segop_marker MUST be 0x53.  
* segop_version MUST be 0x01.  
* segop_len MUST NOT exceed MAX_SEGOP_TX_BYTES.  
* segop_payload length MUST equal segop_len.  
* Exactly one segOP section per segOP transaction.  
* If segOP flag bit is set → segOP section MUST exist.  
* If segOP flag bit is clear → segOP section MUST NOT exist.  

## TLV Payload (Consensus)

segop_payload consists of concatenated TLVs:

```
[type (1 byte)] [len (CompactSize)] [value (len bytes)]
```

Consensus rules:

* type is a single byte [0..255].  
* len is a CompactSize varint (canonical).  
* value MUST be exactly len bytes.  
* TLVs MUST be back-to-back with no padding.  
* The sum of all TLV encodings MUST equal segop_len.  
* Malformed TLVs (e.g. overrun, non-canonical len) MUST invalidate the transaction.  
* Unknown type values MUST be skipped (forward-compatible).  

Recognised non-consensus types in v1:

* 0x01 = TEXT_UTF8  
* 0x02 = JSON_UTF8  
* 0x03 = BINARY_BLOB  

Applications may use one or many TLVs in a single segOP payload.

---

## BUDS Tiering & ARBDA (Non-Consensus Metadata)

This section defines optional, **non-consensus** semantics for interpreting segOP TLVs according to the BUDS (Bitcoin Unified Data Standard) tiering model and ARBDA (Arbitrary Data Dominance Assessment) scoring.

These rules:

* DO NOT affect consensus.  
* DO NOT affect txid or wtxid.  
* MUST NOT be used to reject transactions at consensus level.  

They exist to give wallets, explorers, policy engines, and miners a common language for classifying data types and data risk.

### BUDS Tier Marker (0xF0)

TLV type `0xF0` is reserved as a **BUDS Tier marker**:

```
type = 0xF0
len  = 1
value[0] = tier_code
```

Example tier codes:

* 0x00 → T0_CONSENSUS (pure consensus / payment data; normally no segOP needed)  
* 0x10 → T1_METADATA   (light metadata, labels, simple tags)  
* 0x20 → T2_OPERATIONAL (L2 anchors, rollup headers, routing hints, structured operational data)  
* 0x30 → T3_ARBITRARY (unstructured / opaque data, “blobs”)  
* 0xFF → UNSPECIFIED  

Nodes MAY map `tier_code` into an internal enum, but MUST NOT reject based on its value.

### BUDS Data-Type Marker (0xF1)

TLV type `0xF1` is reserved as a **BUDS Data-Type marker**:

```
type = 0xF1
len  = 1
value[0] = type_code
```

Example type codes (informative):

* 0x01 → TEXT_NOTE  
* 0x02 → JSON_DOC  
* 0x03 → BLOB_GENERIC  
* 0x04 → L2_STATE_ANCHOR  
* 0x05 → ROLLUP_BATCH_REF  
* 0x06 → PROOF_REF  
* 0x07 → VAULT_METADATA  
* 0xFF → UNSPECIFIED  

Again, nodes MUST NOT reject transactions based on these codes.

### ARBDA: Arbitrary Data Dominance Assessment

ARBDA provides an optional, transaction-level “risk tier” based on the presence of BUDS tiers.

Inputs:

* Presence flags: has_T0, has_T1, has_T2, has_T3  
* A per-payload summary of which tier markers were seen  

ARBDA is computed conservatively:

```
if has_T3:      arbda_tx_tier = T3
else if has_T2: arbda_tx_tier = T2
else if has_T1: arbda_tx_tier = T1
else:           arbda_tx_tier = T0
```

Additionally:

* If a segOP payload exists but **no tier markers** are present, implementations SHOULD treat it as “unlabelled arbitrary data” and set `has_T3 = true` before computing ARBDA.  
* If multiple conflicting tier markers appear, implementations MAY treat the result as AMBIGUOUS and default ARBDA to T3.

This captures the intended “guilty until proven innocent” posture: if a transaction mixes transparent, structured data with opaque blobs, the opaque data dominates the ARBDA score.

### Policy Use (Non-Consensus)

Node operators, miners, and policy engines MAY use ARBDA and BUDS metadata to:

* Require higher feerates for ARBDA-T3 payloads.  
* Cap the fraction of block weight dedicated to ARBDA-T3.  
* Preferentially evict ARBDA-T3 during mempool pressure.  
* Provide clear UX: “this transaction carries unlabelled arbitrary data (T3)”.  

However:

* BUDS and ARBDA MUST NOT change consensus semantics.  
* Different implementations MAY ignore them entirely.  

---

# Weight and Fees

For fee and weight accounting:

* segOP bytes are counted in stripped_size.  
* segOP bytes do not receive any SegWit discount.  

```
weight = 4 * stripped_size + witness_size
```

Recommended limits:

* MAX_SEGOP_TX_BYTES = 64,000 (consensus)  
* MAX_SEGOP_BLOCK_BYTES = 400,000 (policy guidance, not consensus)  

Nodes and miners MAY adopt stricter policy if desired.

---

# Identifiers (txid, wtxid, fullxid)

## txid (unchanged)

txid is computed exactly as before SegWit/segOP:

* Serialize the transaction without:  
  * marker and flag,  
  * witness data,  
  * segOP section.  
* Compute SHA256d over that serialization.

segOP fields MUST NOT affect txid.

## wtxid (unchanged)

wtxid is unchanged from BIP141.  
It commits to witness data, not segOP.

## fullxid (optional, non-consensus)

Implementations MAY compute a “fullxid” committing to the entire extended transaction including segOP:

```
TAG = SHA256("segop:fullxid")
fullxid = SHA256(TAG || TAG || extended_serialization)
```

where extended_serialization includes marker, flag, witness, and segOP.

fullxid is not a consensus identifier.

---

# Tagged-Hash Convention

segOP uses the same tagged-hash pattern as BIP340:

```
TAG = SHA256(tag)
TAGGED_HASH(tag, msg) = SHA256(TAG || TAG || msg)
```

Used for:

* segOP commitments (“segop:commitment”).  
* Optional fullxid (“segop:fullxid”).  

---

# P2SOP – Pay-to-SegOP Commitment

Each segOP payload is committed to by a single P2SOP OP_RETURN output.

Canonical scriptPubKey:

```
27 6a 25 5032534f50 <32-byte segop_commitment>
```

Decoded:

* 0x27: scriptPubKey length = 39 bytes.  
* 0x6a: OP_RETURN.  
* 0x25: push 37 bytes.  
* 0x50 0x32 0x53 0x4f 0x50: ASCII "P2SOP".  
* 32-byte segop_commitment.  

Commitment definition:

```
TAG = SHA256("segop:commitment")
segop_commitment = SHA256(TAG || TAG || segop_payload)
```

## 1:1 Mapping (Consensus)

For segOP v1:

* If segOP flag bit is 0 → MUST have zero P2SOP outputs.  
* If segOP flag bit is 1 → MUST have exactly one segOP section and exactly one P2SOP output.  

Violation invalidates the transaction.

---

# Node Validation Rules (Consensus)

For each segOP transaction:

* Verify segop_marker == 0x53, segop_version == 0x01.  
* Verify segop_len ≤ MAX_SEGOP_TX_BYTES.  
* Verify segop_payload length matches segop_len.  
* Validate TLV encoding.  
* Extract the 32-byte commitment from the P2SOP output.  
* Recompute segop_commitment from segop_payload and compare.  

Non-segOP transactions MUST NOT contain P2SOP outputs.

segOP-aware fully validating nodes MUST apply these checks for every segOP transaction in every accepted block.

---

# Retention and Pruning Model

segOP follows a “validate everything, optionally prune later” model with explicit retention windows.

## Validation Window W (Consensus)

Nodes MUST retain segOP payload bytes for at least a validation window:

```
W = 24 blocks
```

Within the last W blocks:

* Payload MUST be locally available for:  
  * block validation,  
  * reorg handling,  
  * reliable relay.  

Nodes MUST NOT prune segOP payloads newer than W blocks.

## Operator Window R (Policy)

Nodes MAY extend retention with a policy parameter:

```
-sopwindow=R
```

Effective retention:

```
E = max(W, R)
```

Blocks with height h and tip H:

* If h ≥ H − E + 1 → payload MUST be retained.  
* If h < H − E + 1 → payload MAY be pruned.  

Pruning MUST NOT remove:

* The transaction itself.  
* The P2SOP script.  
* Any data needed for txid/wtxid or Merkle roots.  

Only segOP payload bytes are prunable.

---

# P2P Behaviour (Informative)

New service bits:

* NODE_SOP_RECENT  
* NODE_SOP_ARCHIVE  

New inventory types (values TBD):

* MSG_TX_SOP  
* MSG_SOPDATA  

New messages:

* getsegopdata { txids[] }  
* segopdata [ { txid, sopver, soplen, soppayload } ]  

Full-block relay MUST include segOP sections.  
Compact relay SHOULD omit segOP payloads; receivers fetch them via getsegopdata and validate before accepting the block.

---

# DoS and Bandwidth Policy (Informative)

Implementations SHOULD:

* Limit the number of txids per getsegopdata.  
* Rate-limit segOP payload requests per peer.  
* Bound total segOP bandwidth.  
* Penalise malformed segopdata or repeated invalid payloads.  

These are policy recommendations, not consensus rules.

---

# Rationale

## Why a Post-Witness Lane?

Placing segOP after witness and before nLockTime:

* Minimises changes to existing parsing logic.  
* Reuses BIP141 marker/flag.  
* Keeps txid/wtxid definitions stable.  
* Separates script evaluation (inputs, outputs, witness) from payload data (segOP) and global fields (nVersion, nLockTime).  

## Why Full Fees (4 WU/byte)?

The witness discount allowed arbitrary data to be stored cheaper than normal bytes. segOP reverses this for its lane:

* Data-heavy protocols internalise their footprint.  
* Payment traffic is not crowded by discounted blobs.  
* Fee markets become more predictable.  

## Why TLV and BUDS?

Mandatory TLV gives a stable framing layer:

* Deterministic parsing.  
* Multiple logical components per payload.  
* Forward compatibility via unknown-type skipping.  

BUDS tiering and ARBDA, layered on top as non-consensus metadata, give:

* A vocabulary for classifying data (T0–T3).  
* A simple way to treat unlabelled/opaque data as riskier (ARBDA=T3).  
* A path for future tightening:

> As more protocols register clear structures and tiers, node implementations can raise policy pressure on unlabeled T3 data (higher feerates, lower priority) without punishing honest, well-labelled usage.

In other words, segOP + BUDS provide the structure needed for any future “data diet” to be precise instead of blunt.

## Why Keep txid and wtxid Unchanged?

Changing these would be highly disruptive. segOP:

* Preserves txid as pre-SegWit non-witness serialization.  
* Preserves wtxid as BIP141.  
* Introduces fullxid only as an optional extension for parties who need an ID that commits to segOP bytes.

## Why Explicit Retention Windows?

Bitcoin’s general pattern is “validate everything, prune if you choose”. segOP makes this explicit for arbitrary data:

* W: a small, mandatory validation window all nodes can handle.  
* R: an operator-configurable extension window.  
* Archive nodes: optional, but beneficial to the ecosystem.  

---

# Backwards Compatibility

Legacy nodes:

* Accept segOP-bearing transactions as valid extended-format transactions.  
* Ignore segOP bytes entirely.  
* Compute txid and wtxid exactly as today.  

segOP is a soft fork: all segOP-valid blocks are also valid under legacy consensus, but not the other way around.

---

# Reference Implementation

A reference implementation for Bitcoin Core includes:

* Extended transaction parsing/serialization.  
* segOP payload storage in mempool and on disk.  
* segOP validation in tx/block validation paths.  
* P2SOP recognition and commitment verification.  
* Retention/pruning logic for segOP payloads.  
* P2P support for getsegopdata/segopdata with DoS mitigations.  
* Optional BUDS/ARBDA decoding and RPC surface (non-consensus).  

(Reference code is provided separately in the implementation repository.)

---

# Test Vectors

Test vectors SHOULD include:

* Non-segOP transactions.  
* segOP transactions with:  
  * Single TLV payload.  
  * Multiple TLVs.  
  * BUDS tier/type markers present and absent.  
  * Boundaries at MAX_SEGOP_TX_BYTES.  
* Blocks with:  
  * No segOP.  
  * Mixed segOP/non-segOP.  
  * segOP transactions near the retention boundary.  

Vectors SHOULD specify:

* Raw tx / block hex.  
* txid, wtxid, fullxid (if used).  
* segop_commitment.  
* Expected validation outcome.  

(Concrete vectors are maintained alongside the reference implementation.)

---

# Reference Deployments

Testnet/signet deployments MAY use relaxed parameters or immediate activation.

Mainnet activation is expected to use BIP8-style versionbits; exact parameters are out of scope for this BIP.

---

# Acknowledgements

The author thanks the Bitcoin development community and reviewers whose feedback on data usage, pruning, and fee fairness informed this design, and prior work on pruning and commitment structures.

---

# Appendix A – segOP v1 Technical Specification

This BIP is accompanied by a full technical specification for segOP v1, including detailed wire formats, state machines, and reference pseudocode.

That document is normative for implementers and is maintained in the reference repository, for example:

```
segop/docs/spec.md
```

The specification covers:

* Extended transaction format and serialization.  
* segOP TLV helpers and validation.  
* P2SOP encoding details.  
* BUDS integration and ARBDA computation (non-consensus).  
* Pruning, retention, and P2P message semantics.  

The BIP provides the high-level protocol definition; the accompanying spec provides complete, line-by-line technical detail.
