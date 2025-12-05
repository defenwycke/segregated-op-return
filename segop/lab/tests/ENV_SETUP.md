# segOP Lab – Environment Setup (Regtest)

These commands set up a clean segOP regtest environment that all tests share.

Assumptions:

- Repo root: `/root/bitcoin-segop`
- segOP binaries built at: `/root/bitcoin-segop/src/bitcoind` and `/root/bitcoin-segop/src/bitcoin-cli`
- Dedicated regtest datadir: `/root/.bitcoin-segop-regtest`

---

## 1. Start segOP bitcoind (regtest)

Run this in **terminal 1** and leave it running:

```bash
mkdir -p /root/.bitcoin-segop-regtest

cd /root/bitcoin-segop

./src/bitcoind \
  -regtest \
  -datadir=/root/.bitcoin-segop-regtest \
  -server=1 \
  -fallbackfee=0.0001 \
  -printtoconsole=1
