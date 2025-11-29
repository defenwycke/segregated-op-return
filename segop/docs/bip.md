###########################
DRAFT NOT READY!!!!!!!!!!!!
###########################

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

== Abstract ==

This BIP proposes ''segOP'' (Segregated OP_RETURN), a consensus change that introduces a dedicated, post-witness data section in Bitcoin transactions and a corresponding commitment output (P2SOP – Pay-to-SegOP). The segOP section:

* Is placed after SegWit witness data and before nLockTime.
* Carries arbitrary or structured data in a mandatory TLV (Type–Length–Value) format.
* Pays full block weight (4 WU/byte), with no SegWit discount.
* Is cryptographically bound to the transaction via a single OP_RETURN commitment output.
* Is prunable after a mandatory retention window, without weakening consensus.

Legacy nodes remain unaware of segOP and continue to compute txid and wtxid exactly as today. segOP-aware nodes validate the payload and its commitment and may then choose their own storage policy for segOP bytes.

== Motivation ==

Bitcoin already carries arbitrary data in several places:

* OP_RETURN
* scriptSig pushes
* SegWit witness (discounted)
* Taproot annex
* Tapscript pushes
* Multi-output fragmentation and multi-input witness stuffing

This has led to several long-standing problems:

* No required structure: each protocol invents its own framing, making parsing and indexing brittle and ad-hoc.
* No consistent pricing: witness discount allows arbitrary data to be stored at a lower marginal fee than typical financial transactions.
* No clear commitment model: data is not bound to a simple, explicit commitment that permits safe, consensus-preserving pruning.
* No retention model: nodes do not have a clear rule for how long data must be kept, nor a safe point after which it may be removed.
* No place to redirect data: Core cannot safely tighten policy rules around OP_RETURN or witness without breaking legitimate protocols, because there is no dedicated data lane.

At the same time, Bitcoin ''requires'' arbitrary data to function as robust, censorship-resistant money:

* Self-custody and vaults: multisig, vaults, timelocks, inheritance schemes, and hardware-wallet workflows need small metadata commitments.
* Multi-party ownership: Lightning channels, DLCs, factories, escrow, and federated custody rely on state markers, tags, and coordination data.
* Layer-two protocols: payment channels, rollups, sidechains, and bridges all depend on on-chain state commitments, proofs, and anchors.
* Censorship resistance and dispute resolution: commit/reveal schemes and anti-censorship proofs must be publishable at L1.
* Auditability and transparency: proof-of-liabilities, custody proofs, routing policies, and vault policies require structured metadata.
* Cryptographic transitions: hybrid signature schemes, quantum-migration paths, and key-rotation strategies depend on small arbitrary data fields.

The question is not whether Bitcoin should support arbitrary data, but how to support it fairly and safely.

Recent "spam wars" and inscription activity have highlighted that the current situation — cheap witness space, unstructured data, no pruning model — is economically unstable and operationally fragile. This proposal addresses that by introducing a dedicated, fully charged, structured, and prunable data lane.

== Specification ==

=== Overview ===

segOP extends BIP141’s “marker and flag” transaction format by introducing a post-witness data lane:

  core transaction → optional SegWit witness → optional segOP section → nLockTime

Key properties:

* Placement: segOP section is after witness and before nLockTime.
* Weight: segOP bytes are part of stripped size and pay 4 WU/byte (no discount).
* Commitment: exactly one OP_RETURN output (P2SOP) commits to the segOP payload via a tagged hash.
* Structure: segOP payload is a concatenation of TLV records, enforced by consensus.
* Prunability: nodes must validate segOP payloads, retain them for a mandatory window W, and may prune payload bytes after that window.
* Backward compatibility: txid and wtxid are unchanged; legacy nodes accept segOP transactions as they do today.

=== Transaction Format ===

segOP reuses BIP141's marker/flag scheme. There are two encodings:

Non-extended (legacy) transaction:

<pre>
nVersion
vin_count (≠ 0x00)
vin[0..]
vout[0..]
nLockTime
</pre>

Extended (SegWit, segOP, or both):

<pre>
nVersion
marker = 0x00
flag   ≠ 0x00
vin[0..]
vout[0..]
[witnesses...]       (if flag & 0x01)
[segOP section...]   (if flag & 0x02)
nLockTime
</pre>

==== Marker and Flag ====

The two bytes following nVersion are:

* marker: always 0x00 (in place of a normal vin_count).
* flag: a 1-byte bitfield indicating presence of extensions.

In segOP v1:

* bit 0 (0x01): SegWit present.
* bit 1 (0x02): segOP present.
* bits 2–7 (0x04–0x80): reserved for future extensions and MUST be zero.

If any reserved bits are set under segOP v1 rules, the transaction MUST be invalid under segOP consensus.

For example:

* SegWit only: marker=0x00, flag=0x01
* segOP only: marker=0x00, flag=0x02
* SegWit + segOP: marker=0x00, flag=0x03

==== segOP Lane Placement ====

When (flag & 0x02) != 0, the segOP lane is appended after inputs/outputs and after any SegWit witness:

<pre>
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
</pre>

* segop_marker is a fixed byte 0x53. Any other value MUST be rejected.
* segop_version is a version byte. For segOP v1 it MUST be 0x01.

There MUST be exactly one segOP section in a segOP transaction.

=== segOP Section ===

A segOP section is the contiguous sequence:

<pre>
segop_marker || segop_version || segop_len || segop_payload
</pre>

Consensus rules for segOP v1:

* segop_marker MUST be 0x53.
* segop_version MUST be 0x01.
* segop_len MUST NOT exceed MAX_SEGOP_TX_BYTES (see Appendix A).
* segop_payload MUST be exactly segop_len bytes.
* Exactly one segOP section per segOP transaction.
* segOP MUST appear after any SegWit witness data and before nLockTime.
* Transactions with the segOP bit set in flag MUST contain exactly one segOP section; transactions with the segOP bit clear MUST contain none.

=== TLV Payload (Consensus) ===

segop_payload is a concatenation of one or more TLV records:

<pre>
[type (1 byte)] [len (varint)] [value (len bytes)]
</pre>

Consensus rules:

* type is a single byte in [0, 255].
* len is a CompactSize varint.
* value MUST be exactly len bytes.
* TLV records MUST appear back-to-back; no padding.
* The sum of all TLV encodings MUST equal segop_len.
* Malformed TLV (e.g., truncated value) MUST make the transaction invalid.
* Unknown type values MUST be skipped (forward compatibility).

Applications may use:

* A single large TLV (e.g., a 64 KB blob).
* Multiple TLVs (e.g., metadata + body, or multi-component L2 state).

=== Weight and Fees ===

For weight:

* segOP bytes are counted in stripped_size (base transaction size).
* segOP bytes are not counted as witness and do not receive any discount.

Implementations MUST compute:

<pre>
stripped_size = size of the transaction when serialized without witness data,
                but including segop_marker, segop_version, segop_len, segop_payload (if present)

witness_size  = size of SegWit witness data (if any)

weight = stripped_size * 4 + witness_size
</pre>

A separate shorthand for segOP bytes:

<pre>
segop_weight = 4 * segop_bytes
</pre>

Recommended limits (see Appendix A):

* MAX_SEGOP_TX_BYTES = 64,000 (consensus).
* MAX_SEGOP_BLOCK_BYTES = 400,000 (policy guidance, not consensus).

=== Identifiers (txid, wtxid, fullxid) ===

==== txid (unchanged) ====

txid is computed exactly as before SegWit/segOP:

* Serialize the transaction without:
** marker and flag.
** witness data.
** segOP section.

* Compute SHA256d over that serialization.

segOP fields MUST NOT influence txid.

==== wtxid (unchanged) ====

wtxid is unchanged from BIP141. It is computed over the witness serialization and does not include segOP bytes. The presence of segOP does not change wtxid.

==== fullxid (optional, non-consensus) ====

Implementations MAY compute an optional identifier fullxid that commits to the entire extended transaction, including segOP bytes.

Let extended_serialization be:

<pre>
nVersion ||
marker || flag ||
vin (all inputs, extended format) ||
vout (all outputs) ||
[witness data, if present] ||
[segOP section, if present] ||
nLockTime
</pre>

Use the tagged-hash convention (see below):

<pre>
TAG   = SHA256("segop:fullxid")
fullxid = SHA256(TAG || TAG || extended_serialization)
</pre>

Properties:

* fullxid commits to segOP payload bytes and their framing.
* fullxid is not a consensus identifier; it is not required for validation or relay.
* Nodes MAY need to refetch segOP payload to reconstruct fullxid on pruned history.

=== Tagged-hash Convention ===

segOP uses the same tagged-hash pattern as BIP340. For an ASCII tag string and message msg:

<pre>
TAG = SHA256(tag)
TAGGED_HASH(tag, msg) = SHA256(TAG || TAG || msg)
</pre>

This construction is used for:

* P2SOP commitments (tag "segop:commitment").
* fullxid (tag "segop:fullxid").

=== P2SOP – Pay-to-SegOP Commitment Output ===

Each segOP payload is committed to by a single P2SOP output, an OP_RETURN script carrying a tagged hash of segop_payload.

The canonical scriptPubKey encoding is:

<pre>
27 6a 25 5032534f50 &lt;32-byte segop_commitment&gt;
</pre>

Decoded:

* 0x27: scriptPubKey length = 39 bytes.
* 0x6a: OP_RETURN.
* 0x25: PUSHDATA(37).
* 0x50 0x32 0x53 0x4f 0x50: ASCII "P2SOP".
* &lt;32-byte segop_commitment&gt;: tagged hash of segop_payload.

Commitment definition:

<pre>
TAG = SHA256("segop:commitment")
segop_commitment = SHA256(TAG || TAG || segop_payload)
</pre>

==== 1:1 Mapping Rules (Consensus) ====

For segOP v1:

* If (flag & 0x02) == 0 (no segOP):
** The transaction MUST NOT contain any P2SOP outputs.

* If (flag & 0x02) != 0 (segOP present):
** The transaction MUST contain exactly one segOP section.
** The transaction MUST contain exactly one P2SOP output.

Any violation MUST make the transaction invalid under segOP consensus.

=== Node Validation Rules (Consensus) ===

For each segOP transaction in a block:

* Verify that there is exactly one P2SOP output and one segOP section.
* Verify segop_marker == 0x53 and segop_version == 0x01.
* Verify segop_len <= MAX_SEGOP_TX_BYTES.
* Verify segop_payload length matches segop_len.
* Parse segop_payload as TLVs; reject malformed streams.
* Recompute segop_commitment from segop_payload using the tagged-hash rule.
* Extract the 32-byte commitment from the P2SOP script.
* If expected_commitment != script_commitment, the block is invalid.

Non-segOP transactions MUST NOT contain P2SOP outputs.

A segOP-aware fully validating node MUST apply these validation rules to every segOP-bearing transaction in every block it accepts to its active chain, regardless of any subsequent pruning of segOP payload bytes.

=== Retention and Pruning Model ===

segOP follows a “validate everything, optionally prune later” model, with explicit retention windows.

Retention policy does not weaken consensus: even Validation Window nodes (E = W) MUST fully validate segOP payloads and P2SOP commitments for all new blocks they accept, and any assumevalid-style shortcuts during IBD are purely local policy. Archive nodes that retain full segOP history are beneficial for the ecosystem (IBD, L2s, explorers, audits), but they are not mandatory for consensus; the protocol remains secure even if most nodes operate with only the minimum Validation Window.

==== Mandatory Validation Window (W) ====

segOP-aware nodes MUST retain segOP payload bytes for at least the last W blocks:

<pre>
W = 24
</pre>

Within this Validation Window:

* segOP payload bytes MUST be available locally for:
** block validation,
** reorg handling,
** reliable block relay.

Nodes MUST NOT prune segOP payloads that fall within the last W blocks.

==== Operator Window (R) ====

Nodes MAY extend retention with a policy parameter:

<pre>
-sopwindow=R   (R ≥ 0 blocks)
</pre>

Examples:

* R = 0: only the mandatory 24-block Validation Window is kept.
* R = 144: roughly one day of payload history at 10-minute blocks.
* R = 288: roughly two days.

This is policy, not consensus.

==== Effective Retention Window (E) ====

Define:

<pre>
E = max(W, R)
</pre>

For blocks with height h in the active chain and tip height H:

* If h ≥ H − E + 1, segOP payload MUST be retained.
* If h &lt; H − E + 1, segOP payload MAY be pruned.

Pruning MUST NOT remove:

* The transaction itself.
* The P2SOP output’s script.
* Any data needed to compute txid, wtxid, or the block’s Merkle root and header.

Only the raw segOP payload bytes are prunable under this model.

==== Node Profiles (Informative) ====

* Validation Window node:
** E = W = 24.
** Keeps segOP payload for exactly the most recent 24 blocks.
* Operator Window node:
** E > W.
** Keeps deeper history according to local policy.
* Archive node:
** Keeps all segOP payloads for the entire chain.
** May advertise itself as an archive provider (see P2P section).

=== P2P Behaviour and Payload Relay ===

This section defines how segOP payloads are advertised and fetched at the P2P layer. These details are not consensus, but they are part of the recommended network behaviour.

==== Service Bits ====

Two service flags are introduced to the node’s services bitfield (e.g., in the version message):

* NODE_SOP_RECENT:
** Set only if the node can serve segOP payload for at least the last W blocks.
** Formally, if min_retained_height ≤ tip_height − W + 1.

* NODE_SOP_ARCHIVE:
** Set only if the node retains segOP payloads for all blocks on its active chain (full history).
** MUST be cleared if the node prunes any segOP payload from its active chain.

These bits describe what a node ''can serve'', not what a transaction contains.

==== Inventory Types ====

New inventory types are defined (values TBD):

* MSG_TX_SOP – inventory for segOP-bearing transactions.
* MSG_SOPDATA – inventory for segOP payload objects.

Nodes MUST NOT advertise payloads they do not hold.

==== segOP Payload Messages ====

===== getsegopdata =====

Request segOP payloads by txid:

<pre>
getsegopdata {
    txids: [32-byte txid, ...]
}
</pre>

Rules (policy):

* Non-empty txid list.
* At most 64 txids per message.
* Only send to peers that advertise NODE_SOP_RECENT or NODE_SOP_ARCHIVE.

===== segopdata =====

Response containing payloads:

<pre>
segopdata [
  {
    txid:       32 bytes
    sopver:     1 byte  (equals segop_version)
    soplen:     CompactSize (equals segop_len)
    soppayload: soplen bytes (equals segop_payload)
  },
  ...
]
</pre>

Rules:

* Nodes MUST return exactly soplen bytes per entry.
* If the requested payload is pruned or unavailable, respond with notfound.

Segmented responses (optional) may be defined for large payloads, with chunk offsets and is_last_chunk markers. Receivers MUST reassemble before commitment validation.

==== Block Relay Semantics ====

Full block relay (block message):

* Full blocks MUST include full segOP sections (segop_marker, segop_version, segop_len, segop_payload).
* Receiving nodes can validate segOP fully from the block alone.

Compact block / fast relay:

* Compact formats MUST NOT include segOP payload bytes.
* They MUST include enough information to:
** reconstruct transactions or txids;
** identify P2SOP outputs and their commitments.

Receiving nodes:

* Reconstruct the tx list from the compact block.
* Identify segOP-bearing transactions.
* Request missing segOP payloads via getsegopdata.
* Validate TLV structure and commitments.
* Only then accept and relay the block.

Nodes MUST NOT forward segOP-bearing blocks until segOP payloads have been obtained (if missing) and fully validated.

=== DoS and Bandwidth Mitigations (Policy) ===

Implementations SHOULD enforce:

* Per-message limits for getsegopdata and segopdata (e.g., max txids, max bytes).
* Per-peer rate limits for segOP payload requests (e.g., N requests per minute).
* Global outbound and inbound bandwidth caps for segOP payloads.
* Protection against amplification (e.g., outbound/inbound ratio ≤ 4:1).
* Limits on concurrent chunk reassemblies and buffer sizes.

Misbehaviour (e.g., malformed segopdata, repeated invalid payloads, excessive requests) SHOULD be integrated into existing peer-scoring and banning systems.

== Rationale ==

=== Why a Post-Witness Data Lane? ===

Placing segOP after witness and before nLockTime:

* Minimizes changes to the transaction structure.
* Reuses the BIP141 marker/flag mechanism.
* Keeps txid and wtxid definitions unchanged.
* Separates script evaluation (inputs, outputs, witness) from payload data (segOP) and from global fields (nVersion, nLockTime).

This clean separation simplifies parsing, pruning, and tooling.

=== Why Full Fees (4 WU/byte)? ===

The witness discount introduced by SegWit allowed arbitrary data to be stored at a lower marginal fee than "normal" transaction bytes. This has been exploited for data-heavy inscriptions and similar protocols.

By charging 4 WU/byte for segOP payloads:

* Data-heavy protocols internalize their full on-chain footprint.
* Pure financial transactions are not crowded out by discounted data.
* Fee markets become more predictable and less distorted by discounted lanes.

=== Why a Single P2SOP and 1:1 Mapping? ===

Requiring exactly one segOP section and exactly one P2SOP per segOP transaction establishes a simple invariant:

* 1 transaction → 1 P2SOP → 1 segOP payload.

This makes validation, indexing, and reasoning straightforward, without foreclosing future extensions. More complex binding schemes (e.g., multiple independent payloads) may be proposed in later versions if needed.

=== Why Mandatory TLV Structure? ===

Mandatory TLV provides:

* Deterministic parsing for all payloads.
* A clean way to separate metadata from bodies.
* Forward compatibility by skipping unknown types.
* The ability to host multiple logical components (e.g., rollup headers, state roots, metadata) in a single payload.

Making TLV structure consensus-required prevents "opaque blob only" encodings that are impossible to parse incrementally and hard to reason about.

=== Why Explicit Retention Windows? ===

Bitcoin’s long-standing pattern is:

> validate everything, optionally prune old data.

segOP makes this explicit for arbitrary data:

* Validation Window W: fully validating nodes MUST retain segOP payload bytes for the last W blocks.
* Operator Window R: nodes MAY keep more history for their own purposes.
* Archive nodes: voluntary nodes can keep everything and serve long-range protocols and audits.

This allows:

* All nodes to fully validate new blocks.
* Most nodes to limit storage.
* Some nodes to specialize in historical data serving.

=== Why Separate P2P Messages? ===

segOP payloads can be large and are not needed in all relay paths. Dedicated getsegopdata/segopdata messages:

* Allow selective fetching of only the needed payloads.
* Enable precise bandwidth accounting and rate limiting.
* Maintain a separation between “skeleton” block relay (headers, txids) and heavy payload transfer.

This mirrors the approach taken with compact blocks and separately fetched witness data, while keeping the segOP-specific bandwidth overhead under explicit control.

=== Why Keep txid and wtxid Unchanged? ===

Stability of transaction identifiers is critical:

* Wallets, explorers, and indexing systems rely on txid and wtxid semantics.
* Changing txid or wtxid would create significant ecosystem disruption.

segOP therefore:

* Preserves txid exactly as pre-SegWit non-witness serialization.
* Preserves wtxid exactly as BIP141.
* Introduces fullxid only as an optional, non-consensus identifier for those who need an ID that commits to segOP bytes.

== Backwards Compatibility ==

Legacy nodes:

* See segOP-bearing transactions as valid extended-format transactions.
* Ignore segOP bytes entirely.
* Compute txid and wtxid exactly as today.
* Validate blocks as a superset of segOP-aware nodes (segOP rules make the set of valid blocks smaller).

segOP is therefore a soft fork: all segOP-valid blocks are also valid under the legacy consensus, but not vice-versa.

== Reference Implementation ==

A reference implementation is intended for Bitcoin Core and includes:

* Extended transaction parsing and serialization (CTransaction/CMutableTransaction).
* segOP payload storage in mempool and on disk.
* segOP validation integrated into block/tx validation code paths.
* P2SOP recognition and commitment verification.
* Retention window and pruning logic.
* P2P message handlers for getsegopdata/segopdata, including DoS mitigations.

(Reference code TBD.)

== Test Vectors ==

Test vectors SHOULD include:

* Non-segOP transactions (control cases).
* segOP transactions with:
** Single TLV payload.
** Multiple TLVs (metadata + body).
** Boundaries at MAX_SEGOP_TX_BYTES.
* Blocks with:
** No segOP.
** Mixed segOP and non-segOP transactions.
** segOP-bearing transactions near the retention boundary.

Vectors SHOULD specify:

* Raw hex of transactions and blocks.
* txid, wtxid, and fullxid (where computed).
* segop_commitment values.
* Expected validation outcome.

(TBD; can be derived directly from the worked example in this BIP’s appendices.)

== Reference Deployments ==

Testnet, signet, or custom networks may deploy segOP with relaxed parameters or immediate activation for experimentation.

Mainnet deployment is expected to use a BIP8-style versionbits activation, with:

* Bit: TBD.
* Start time: TBD.
* Timeout: TBD.
* Threshold: e.g., 90% signalling in a 2016-block retarget period.

(Exact parameters are out of scope of this BIP and may be specified in follow-up documents.)

== Acknowledgements ==

The author thanks the Bitcoin development community and reviewers whose feedback on data usage, pruning, and fee fairness informed this design, as well as those who have explored prior proposals surrounding data suppression, pruning, and commitment structures.

== Appendices (Informative) ==

=== Appendix A – Constants (segOP v1) ===

Consensus:

* MAX_SEGOP_TX_BYTES = 64,000

Policy (recommended):

* MAX_SEGOP_BLOCK_BYTES = 400,000

Other:

* SEGOP_MARKER = 0x53 (ASCII 'S').
* SEGOP_VERSION = 0x01.
* TAG_SEGOP_COMMIT = "segop:commitment".
* TAG_FULLXID = "segop:fullxid".

=== Appendix B – Worked Example (SegWit + segOP) ===

(Adapt the detailed example from the standalone spec: full transaction hex, segOP payload, segop_commitment, txid, wtxid, fullxid, and step-by-step validation.)

=== Appendix C – segOP Transaction Lifecycle ===

Informative lifecycle:

<pre>
Construct → Mempool → Mining → Block Relay → Full Validation → Retention/Pruning → Optional Historical Retrieval
</pre>

Key points:

* segOP is fully validated before blocks are accepted or relayed.
* Payload is retained for at least W=24 blocks.
* Payload beyond E=max(W, R) MAY be pruned.
* Commitments in P2SOP outputs remain forever.

=== Appendix D – Glossary ===

* segOP – Segregated OP_RETURN post-witness data lane.
* P2SOP – Pay-to-SegOP, OP_RETURN commitment output.
* Validation Window (W) – Mandatory retention window (24 blocks).
* Operator Window (R) – Optional extended retention window set by the operator.
* Effective Retention Window (E) – max(W, R).
* Archive node – Node retaining all segOP payloads for full history.
* fullxid – Optional identifier committing to entire extended transaction including segOP.
* TLV – Type–Length–Value encoding for segOP payloads.
