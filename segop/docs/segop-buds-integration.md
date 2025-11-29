# segOP × BUDS Integration

## 1. Goal

Define how **BUDS labels** are attached to segOP payloads so that:

- Node operators can apply **policy** based on BUDS tier / label.
- Tools can index / filter segOP data by **type**, not just raw hex.
- Everything stays **consensus-neutral**.

This document assumes familiarity with:

- segOP core spec (`segop/docs/spec.md`)
- Bitcoin Unified Data Standard (BUDS) vX.Y
  (see external BUDS repo for formal definitions)

---

## 2. Mapping BUDS → segOP

Each segOP payload MUST include a BUDS label at the top of its TLV envelope.

Example (conceptual):

- `T = 0x01` → BUDS label (e.g. `L2_STATE_ANCHOR`)
- `L = 0x01` → length = 1 byte
- `V = 0x10` → specific BUDS code (see BUDS registry)

The rest of the segOP payload is interpreted in the context of this label.

---

## 3. BUDS Codes Used by segOP

This prototype recognises a **minimal subset** of BUDS codes:

- `0x10` – L2 state anchors
- `0x11` – Channel / contract state
- `0x20` – Index / reference data
- `0x30` – Arbitrary application data (catch-all)

(Exact values to be aligned with BUDS registry.)

Unknown BUDS codes:

- Are treated as **generic segOP data**.
- MAY be subject to stricter relay / mempool policy.

---

## 4. Node Policy

New policy flags (examples):

- `-segopbudsallow=0x10,0x11,0x20`
- `-segopbudsdeny=0x30`

The mempool / relay policy:

- Accepts segOP txs whose payload BUDS label is in `allow`.
- Rejects (or deprioritises) ones in `deny`.

---

## 5. RPC / UX

`decodesegop` (or equivalent) SHOULD show:

- raw payload hex
- decoded BUDS label (name + code)
- any subtype info

---

## 6. Future Work

- Full sync with external BUDS registry.
- Advanced policies per tier (fees, size limits, pruning windows).
- Export hooks for external indexers.
