# Segregated OP_RETURN (segOP)

This directory contains the **segOP** proposal and implementation notes
on top of Bitcoin Core v30.x.

- `docs/` – formal specs, design documents, diagrams
- `peer-review/` – mailing list drafts, FAQs, review materials
- `lab/` – experimental tools, regtest scripts, and analysis

The actual node implementation lives in the normal Bitcoin Core tree
under `src/` and related directories. This repo is a fork of
**bitcoin/bitcoin v30.x** with segOP added as a policy / implementation
layer (no consensus changes).
