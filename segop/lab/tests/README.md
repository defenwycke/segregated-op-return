# segOP Lab — Test Matrix

This document defines the layout and scope of test vectors under `segop/lab/tests`.

Each test case is usually represented by:

- `NN_description.hex` — raw transaction or block hex
- `NN_description.md` — short explanation + expected behaviour

---

## 1. Directory Layout

```
segop/lab/
  README.md                  # This file (overview + matrix)
  tests/
    tx_valid/                # Individually valid segOP transactions
    tx_invalid/              # Transactions that MUST fail
    block_valid/             # Blocks that MUST be accepted
    block_invalid/           # Blocks that MUST be rejected
  examples/
    text/                    # TLV payload examples (TEXT)
    json/                    # TLV payload examples (JSON)
    blob/                    # TLV payload examples (BLOB)
  scripts/
    gen_tlv.py               # TLV helper
    build_tx.sh              # (future) Build tx from example TLVs
    build_block.sh           # (future) Build blocks from tx sets
```

### 1.1 File Naming Convention

- Prefix: `NN_` is a two-digit sequence number grouping related tests.
- Suffix: short snake_case description.
- Extension:
  - `.hex` — raw serialized tx/block (no whitespace).
  - `.md` — human-readable explanation (inputs, decode, expected result).

Example:

- `segop/lab/tests/tx_valid/01_basic_text_unlabelled.hex`
- `segop/lab/tests/tx_valid/01_basic_text_unlabelled.md`

---

## 2. `tx_valid/` — Valid segOP Transactions

**Directory:** `segop/lab/tests/tx_valid/` 
"Golden path" transactions that MUST be accepted under segOP rules.

### 2.1 Basic segOP TLVs

| ID | Files (prefix)                     | Category          | Description                                                                                         | Expected Behaviour |
|----|-----------------------------------|-------------------|-----------------------------------------------------------------------------------------------------|--------------------|
| 01 | 01_basic_text_unlabelled         | TLV: TEXT         | Single TEXT TLV `"Hello BUDS"`. No BUDS tier/type markers.                                         | `buds_tier = UNSPECIFIED`, `buds_type = UNSPECIFIED`, `arbda_tier = T3`. |
| 02 | 02_text_multi_unlabelled         | TLV: TEXT_MULTI   | `encoding = "text_multi"` → two TEXT TLVs (`"first"`, `"second"`). No BUDS markers.                | TLV array length 2, both `kind = "text"`, `arbda_tier = T3`. |
| 03 | 03_json_unlabelled               | TLV: JSON         | JSON TLV with object `{"foo":"bar","n":42}`.                                                       | TLV type `0x02` (`kind = "json"`), RPC decode shows parsed object, `arbda_tier = T3`. |
| 04 | 04_blob_unlabelled               | TLV: BLOB         | Binary blob TLV with `deadbeef00ff`                                                                | TLV type `0x03` (`kind = "blob"`), `arbda_tier = T3`. |

### 2.2 BUDS Tier / Type + ARBDA Mapping

| ID | Files (prefix)                | Category        | Description                                                                                                              | Expected Behaviour |
|----|------------------------------|-----------------|--------------------------------------------------------------------------------------------------------------------------|--------------------|
| 10 | 10_buds_t1_textnote          | BUDS T1/TEXT    | TLV sequence: Tier TLV `0xF0 = 0x10` → `T1_METADATA`; Type TLV `0xF1 = 0x01` → `TEXT_NOTE`; then TEXT body.             | `buds_tier_code = 0x10` → `T1_METADATA`; `buds_type_code = 0x01` → `TEXT_NOTE`; `arbda_tier = T1`; TLV kinds: tier / type / text. |
| 11 | 11_buds_t2_l2_anchor         | BUDS T2/L2      | Tier TLV `0xF0 = 0x20` → `T2_OPERATIONAL`; Type TLV `0xF1 = <L2_STATE_ANCHOR>`; TEXT/JSON body describing an L2 anchor. | `buds_tier = T2_OPERATIONAL`; `buds_type = L2_STATE_ANCHOR`; `arbda_tier = T2`. |
| 12 | 12_buds_mixed_t1_t2_no_t3    | BUDS mixed      | Multiple tier markers: at least one `T1`, at least one `T2`, no `T3`.                                                   | `presence.has_t1 = true`, `presence.has_t2 = true`, `ambiguous = true`, `tier = AMBIGUOUS`, `arbda_tier = T2`. |
| 13 | 13_buds_unlabelled_t3        | Unlabelled T3   | segOP payload with no Tier/Type TLVs (like 01–04) but documented as “unlabelled BUDS = ARBDA T3”.                       | `has_tier = false`, `presence.has_t3 = true` (by rule “segOP exists but no tier markers”), `arbda_tier = T3`. |
| 14 | 14_buds_explicit_t3_marker   | Explicit T3     | Tier TLV `0xF0 = 0x30` → `T3_ARBITRARY` plus arbitrary text/blob body.                                                  | `buds_tier = T3_ARBITRARY`, `arbda_tier = T3`. |

### 2.3 P2SOP / Structural Invariants

| ID | Files (prefix)                | Category           | Description                                                                                             | Expected Behaviour |
|----|------------------------------|--------------------|---------------------------------------------------------------------------------------------------------|--------------------|
| 20 | 20_segop_with_single_p2sop   | Canonical segOP    | Typical `segopsend` tx: segOP flag set, **exactly one** P2SOP `OP_RETURN`, correct commitment.         | Fully valid, used as reference “canonical segOP tx”. |
| 21 | 21_segop_no_witness          | Legacy + segOP     | Non-SegWit tx using segOP lane (`flag & 0x02 != 0`, `witness` flag clear).                             | Valid under segOP rules (segOP bit only). |
| 22 | 22_segop_with_witness        | SegWit + segOP     | Combined SegWit + segOP (`flag = 0x03`): standard txid/wtxid plus extra segOP section.                 | Valid; txid/wtxid unchanged, segOP parsed as extra lane. |

---

## 3. `tx_invalid/` — Invalid segOP Transactions

**Directory:** `segop/lab/tests/tx_invalid/`
Transactions that MUST be rejected (consensus or segOP policy).

### 3.1 P2SOP / segOP Mismatches

| ID | Files (prefix)                 | Category            | Description                                                                                                  | Expected Behaviour |
|----|-------------------------------|---------------------|--------------------------------------------------------------------------------------------------------------|--------------------|
| 01 | 01_segop_flag_no_section      | Flag w/o section    | `flag & 0x02 != 0` but no segOP marker/section present in serialization.                                    | Invalid (segOP bit set but no segOP section). |
| 02 | 02_segop_section_no_flag      | Section w/o flag    | segOP marker+payload present but segOP flag bit `0x02` is clear.                                            | Invalid. |
| 03 | 03_p2sop_without_segop        | P2SOP w/o segOP     | No segOP flag, no segOP section, but a P2SOP `OP_RETURN` output exists.                                     | Invalid (non-segOP tx MUST NOT contain P2SOP). |
| 04 | 04_multiple_p2sop_outputs     | Multi P2SOP         | segOP flag set, single segOP payload section, **two** or more P2SOP outputs.                                | Invalid (must be exactly one P2SOP). |
| 05 | 05_multiple_segop_sections    | Multi segOP section | Two segOP sections in one transaction (e.g. duplicated marker/version chunks).                              | Invalid. |
| 06 | 06_commitment_mismatch        | Bad commitment      | segOP payload does not hash/commit correctly to the P2SOP commitment value.                                 | Invalid (commitment mismatch). |

### 3.2 TLV / Framing Errors

| ID | Files (prefix)                 | Category        | Description                                                                                                 | Expected Behaviour |
|----|-------------------------------|-----------------|-------------------------------------------------------------------------------------------------------------|--------------------|
| 10 | 10_tlv_truncated_value        | Truncated TLV   | TLV length field N but fewer than N bytes remain.                                                           | Invalid (TLV parse failure). |
| 11 | 11_tlv_overrun                | TLV overrun     | Sum of TLV lengths exceeds `segop_len` boundary.                                                            | Invalid. |
| 12 | 12_noncanonical_compactsize   | Non-canonical   | CompactSize uses wider encoding than necessary (e.g. `0xfd fc 00` for 252).                                 | Invalid under `SegopReadCompactSize` (non-canonical). |
| 13 | 13_segop_len_too_large        | segop_len bound | `segop_len > MAX_SEGOP_TX_BYTES`.                                                                           | Invalid. |
| 14 | 14_segop_marker_wrong         | Wrong marker    | `segop_marker != 0x53` (e.g. flipped bit or arbitrary other byte).                                          | Invalid. |
| 15 | 15_segop_version_unknown      | Unknown version | `segop_version != 0x01` while deployment only treats v1 as valid.                                           | Invalid in v1 deployment. |

### 3.3 BUDS / ARBDA Logic Edge Cases

> Note: depending on how strictly ARBDA is enforced at consensus level, some of these may be **behavioural** rather than strictly invalid. They are listed here for clarity; we can move them to `tx_valid/` under a “weird but accepted” section if the implementation never rejects them.

| ID | Files (prefix)                 | Category         | Description                                                                                             | Expected Behaviour (current design intent) |
|----|-------------------------------|------------------|---------------------------------------------------------------------------------------------------------|-------------------------------------------|
| 20 | 20_buds_conflicting_tiers     | Conflicting tier | Two Tier TLVs: one expresses `T1`, one expresses `T3`.                                                  | `ambiguous = true`, `tier = AMBIGUOUS`, `arbda_tier = T3` due to `presence.has_t3 = true`. Possibly still consensus-valid. |
| 21 | 21_buds_tier_but_impossible_type | Tier/type clash | Tier says `T1`, Type uses a code reserved for a different tier.                                        | `type = UNKNOWN/UNSPECIFIED` but ARBDA tier derived from tier presence alone. Classification test rather than hard invalid. |

---

## 4. `block_valid/` — Valid Blocks

**Directory:** `segop/lab/tests/block_valid/`
Blocks that MUST be accepted by a segOP-aware node.

| ID | Files (prefix)                   | Category            | Description                                                                                                      | Expected Behaviour |
|----|----------------------------------|---------------------|------------------------------------------------------------------------------------------------------------------|--------------------|
| 01 | 01_block_mixed_no_segop          | Control (no segOP)  | Block containing only non-segOP transactions.                                                                    | Accepted; baseline compatibility check. |
| 02 | 02_block_single_segop            | Single segOP        | Block with one canonical segOP tx (e.g. from `20_segop_with_single_p2sop`) plus a few normal txs.               | Accepted; segOP tx validated and committed. |
| 03 | 03_block_multiple_segop_varying_tiers | Mixed tiers    | Block with several segOP txs: unlabelled (ARBDA T3), BUDS T1, BUDS T2, etc.                                     | Accepted; ARBDA classification reflects mixed tiers. |
| 04 | 04_block_near_retention_boundary | Retention boundary  | Block height near pruning/retention boundary for segOP data (documentation fixture for node behaviour over time). | Accepted; used mainly for doc + end-to-end pruning tests. |

---

## 5. `block_invalid/` — Invalid Blocks

**Directory:** `segop/lab/tests/block_invalid/` 
Blocks that MUST be rejected due to segOP-related violations in included transactions.

| ID | Files (prefix)                        | Category            | Description                                                                                                          | Expected Behaviour |
|----|--------------------------------------|---------------------|----------------------------------------------------------------------------------------------------------------------|--------------------|
| 01 | 01_block_with_bad_commitment         | Bad commitment      | Block containing tx that looks structurally fine but has P2SOP commitment mismatch (e.g. based on `06_commitment_mismatch`). | Block rejected. |
| 02 | 02_block_with_bad_tlv                | Malformed TLV       | Block containing tx with malformed TLV (e.g. truncated value from `10_tlv_truncated_value`).                         | Block rejected. |
| 03 | 03_block_with_segop_flag_missing_p2sop | Flag/P2SOP mismatch | Block containing tx where segOP flag is set but 1:1 mapping with P2SOP is violated (missing or extra).             | Block rejected. |

---

## 6. `examples/` — Human-Readable Payloads

**Directory:** `segop/lab/examples/`
Smaller TLV payloads (no full tx/blocks) to demonstrate encoding and BUDS/ARBDA usage.

### 6.1 `examples/text/`

**Directory:** `segop/lab/examples/text/`

| File                          | Description                                      |
|-------------------------------|--------------------------------------------------|
| buds_t1_textnote.tlv         | TEXT TLV annotated as BUDS T1 / `TEXT_NOTE`.     |
| plain_hello_world.tlv        | Simple unlabelled TEXT TLV `"Hello world"`.      |

### 6.2 `examples/json/`

**Directory:** `segop/lab/examples/json/`

| File                          | Description                                                    |
|-------------------------------|----------------------------------------------------------------|
| simple_object.tlv            | JSON TLV with `{"foo":"bar","n":42}`.                         |
| rollup_header_example.tlv    | T2 L2 state anchor example (e.g. rollup header / batch root). |

### 6.3 `examples/blob/`

**Directory:** `segop/lab/examples/blob/`

| File                          | Description                                    |
|-------------------------------|-----------------------------------------------|
| small_blob_deadbeef.tlv      | Small binary blob (`deadbeef00ff`).           |
| proof_ref_example.tlv        | Example TLV for a generic proof/reference ID. |

### 6.4 Using Examples with Scripts

Once `build_tx.sh` exists, example usage will look like:

```
./segop/lab/scripts/build_tx.sh examples/text/buds_t1_textnote.tlv > tests/tx_valid/10_buds_t1_textnote.hex
```

The accompanying `.md` file should then:

- Show a decoded view (TLV breakdown).
- State BUDS tier/type and ARBDA classification.
- State whether the resulting tx should be valid or invalid.
