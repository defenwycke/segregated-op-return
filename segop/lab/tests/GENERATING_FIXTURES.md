# Generating segOP Lab Fixtures

This directory contains placeholder .hex files for all tests listed in README.md.

Each `*.hex` file is intended to hold a raw transaction or block hex string that:
- can be fed into the segOP node for validation, and
- matches the behaviour described in the corresponding `.md` file.

## Suggested workflow (regtest)

1. Run a segOP-enabled `bitcoind` on regtest.
2. Create and fund a wallet with some UTXOs.
3. For `tx_valid` cases:
   - Build a transaction that:
     - sets the segOP flag bit correctly,
     - includes exactly one P2SOP output committing to the segOP payload,
     - encodes the segOP section with the desired TLVs (you can reuse TLVs from `segop/lab/examples`).
   - Sign the transaction.
   - Use `getrawtransaction` or your own tooling to obtain the raw tx hex.
   - Paste that hex into the matching `tx_valid/NN_*.hex`.

4. For `tx_invalid` cases:
   - Start from a valid transaction and mutate:
     - flags, segOP marker/version, segop_len,
     - TLV lengths/values,
     - P2SOP commitment, or
     - number of P2SOP outputs,
     to create the exact failure described in the `.md`.
   - Confirm that your segOP node rejects the tx.
   - Save the final raw tx hex into the matching `tx_invalid/NN_*.hex`.

5. For block-level tests:
   - Use regtest to mine or construct a block containing the relevant txs.
   - Extract raw block hex (e.g. via RPC).
   - Save into `block_valid/*.hex` or `block_invalid/*.hex` as appropriate.

## TLV helpers

The script `segop/lab/scripts/gen_tlv.py` can be used to build TLV payloads for the segOP section, e.g.:

- examples/text/plain_hello_world.tlv
- examples/text/buds_t1_textnote.tlv
- examples/json/simple_object.tlv
- examples/blob/small_blob_deadbeef.tlv

These binary TLVs can then be embedded into transactions by your segOP-aware tooling or custom scripts.
