#!/usr/bin/env python3
import json
import subprocess
import sys

# Base bitcoin-cli command (assumes bitcoind -regtest is running
# and ~/.bitcoin/bitcoin.conf has rpcuser/rpcpassword set).
CLI_BASE = ["bitcoin-cli", "-regtest"]

# Wallet we’ll use for this test
TEST_WALLET = "segop_lab_test01"


def run_cli(args, wallet=None, parse_json=False):
    """
    Helper to call bitcoin-cli.
    - args: list of arguments after bitcoin-cli -regtest
    - wallet: optional wallet name (uses -rpcwallet=...)
    - parse_json: if True, JSON-decodes the output
    """
    cmd = CLI_BASE[:]
    if wallet:
        cmd.append(f"-rpcwallet={wallet}")
    cmd.extend(args)

    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as e:
        sys.stderr.write(f"\nCommand failed: {' '.join(cmd)}\n")
        sys.stderr.write(e.output.decode(errors="ignore") + "\n")
        raise

    text = out.decode().strip()
    if parse_json:
        return json.loads(text)
    return text


def ensure_wallet(name: str) -> None:
    """Make sure TEST_WALLET exists and is loaded."""
    wallets = run_cli(["listwallets"], parse_json=True)
    if name in wallets:
        return

    # Best effort: create wallet. If it already exists on disk but isn’t
    # loaded, Core may auto-load it depending on config.
    try:
        run_cli(["createwallet", name])
        print(f"[info] Created wallet {name}")
    except Exception as e:
        print(
            f"[warn] Could not create wallet {name}, continuing anyway: {e}",
            file=sys.stderr,
        )


def ensure_funded(wallet: str, min_balance: float = 1.0) -> None:
    """
    Make sure wallet has at least `min_balance` BTC.
    If not, mine 101 blocks to a new address from this wallet.
    """
    bal = float(run_cli(["getbalance"], wallet=wallet))
    if bal >= min_balance:
        print(f"[info] Wallet {wallet} already funded: {bal} BTC")
        return

    addr = run_cli(["getnewaddress", "test_miner", "bech32"], wallet=wallet)
    print(f"[info] Mining to {addr} to fund wallet {wallet}...")

    # 101 blocks so coinbase outputs mature
    run_cli(["generatetoaddress", "101", addr])

    bal2 = float(run_cli(["getbalance"], wallet=wallet))
    print(f"[info] New balance in {wallet}: {bal2} BTC")


def main() -> None:
    # 1. Environment prep
    ensure_wallet(TEST_WALLET)
    ensure_funded(TEST_WALLET, min_balance=1.0)

    # 2. Destination address for this test tx
    dest = run_cli(["getnewaddress", "test01_dest", "bech32"], wallet=TEST_WALLET)

    # 3. segOP-style payload (placeholder TLV)
    #    Later we’ll generate this from the Lab / BUDS header builder so it
    #    matches your matrix row exactly.
    payload_hex = "f00602010200010001"  # demo header+TEXT TLV, stub

    # 4. Build raw tx:
    #    - outputs: pay 0.001 BTC to dest
    #    - plus an OP_RETURN with our TLV via {"data": "..."}
    outputs = {dest: 0.001, "data": payload_hex}

    raw = run_cli(
        ["createrawtransaction", "[]", json.dumps(outputs)],
        wallet=TEST_WALLET,
    )

    # 5. Let Core pick inputs + change
    funded_info = run_cli(
        ["fundrawtransaction", raw],
        wallet=TEST_WALLET,
        parse_json=True,
    )
    funded_hex = funded_info["hex"]

    # 6. Sign with the test wallet
    signed_info = run_cli(
        ["signrawtransactionwithwallet", funded_hex],
        wallet=TEST_WALLET,
        parse_json=True,
    )
    if not signed_info.get("complete"):
        raise SystemExit("[error] Signing failed (complete = false)")
    signed_hex = signed_info["hex"]

    # 7. Broadcast
    txid = run_cli(["sendrawtransaction", signed_hex])

    # 8. Emit machine-readable summary (what the Lab / docs will use)
    summary = {
        "test_id": "T01_BASIC_SEGOP_TEXT",
        "description": "Basic segOP-style TEXT payload in OP_RETURN, 0.001 BTC to dest",
        "network": "regtest",
        "wallet": TEST_WALLET,
        "dest_address": dest,
        "payload_hex": payload_hex,
        "txid": txid,
        "fundraw_fee": funded_info.get("fee"),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
