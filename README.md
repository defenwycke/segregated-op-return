# Segregated OP_RETURN – segOP  
*(Built on Bitcoin Core v30.x)*

This repository is a fork of **Bitcoin Core v30.x** that implements and
experiments with **Segregated OP_RETURN (segOP)** — a structured, full-fee
data lane that restores fee fairness and enables safe pruning, without any
consensus changes.

All segOP-related material lives in the [`segop/`](./segop) directory:

- [`segop/docs/`](./segop/docs) — formal specifications, design documents, diagrams  
- [`segop/peer-review/`](./segop/peer-review) — mailing list drafts, FAQs, reviewer notes  
- [`segop/lab/`](./segop/lab) — regtest tools, scripts, experiments, analysis  

The underlying node implementation and build system follow the normal
**Bitcoin Core directory structure**:

```
src/ → Node & wallet source code (with segOP integration)
doc/ → Upstream Bitcoin Core documentation
test/ → Unit tests + segOP tests
depends/ → Build dependencies
ci/, cmake/, contrib/, share/, … → Core infrastructure
```

## Quick start

Build & run is identical to Bitcoin Core:

```bash
./autogen.sh
./configure
make -j$(nproc)
src/bitcoind -regtest -segop=1 ...
```

## License

MIT License (same as upstream Bitcoin Core).
