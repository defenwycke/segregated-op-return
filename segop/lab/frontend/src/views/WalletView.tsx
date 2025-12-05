import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WalletView.css";
import { useLabStore } from "../store/labStore";

type WalletSide = "A" | "B";

interface LabWalletCardProps {
  side: WalletSide;
  label: string;
}

/**
 * Placeholder wallet card. Later we will wire this to real RPC
 * (create/load/refresh/mine). For now it just shows stub data.
 */
function LabWalletCard({ side, label }: LabWalletCardProps) {
  const [address] = useState(`bc1qexamplewallet${side.toLowerCase()}`);
  const [balance] = useState("0.00000000");

  const handleCreate = () => {
    console.log(`Create wallet ${side}`);
  };
  const handleLoad = () => {
    console.log(`Load wallet ${side}`);
  };
  const handleRefresh = () => {
    console.log(`Refresh wallet ${side}`);
  };
  const handleMineHere = () => {
    console.log(`Mine block paying to wallet ${side}`);
  };

  return (
    <div className="wallet-card">
      <div className="wallet-card-header">
        <h3>{label}</h3>
        <span className="wallet-role-pill">
          {side === "A" ? "Sender side" : "Receiver side"}
        </span>
      </div>

      <div className="wallet-row">
        <label>Address</label>
        <div className="wallet-mono">{address}</div>
      </div>

      <div className="wallet-row">
        <label>Balance</label>
        <div>{balance} BTC</div>
      </div>

      <div className="wallet-actions">
        <button type="button" onClick={handleCreate}>
          Create wallet
        </button>
        <button type="button" onClick={handleLoad}>
          Load wallet
        </button>
        <button type="button" onClick={handleRefresh}>
          Refresh
        </button>
        <button type="button" onClick={handleMineHere}>
          Mine → {label}
        </button>
      </div>
    </div>
  );
}

export default function WalletView() {
  const navigate = useNavigate();
  const { currentPayloadHex, setCurrentPayloadHex } = useLabStore();

  // Tx builder / lab JSON state
  const [fromLabel, setFromLabel] = useState("Lab Wallet A");
  const [toLabel, setToLabel] = useState("Lab Wallet B");
  const [amountBtc, setAmountBtc] = useState("0.001");
  const [feerate, setFeerate] = useState("5.0");
  const [includeSegopOutput, setIncludeSegopOutput] = useState(true);
  const [txJson, setTxJson] = useState<string>("");

  const handleInspectClick = () => {
    const hex = currentPayloadHex.trim();
    setCurrentPayloadHex(hex);
    navigate("/inspector");
  };

  const handleBuildTxJson = () => {
    const amt = parseFloat(amountBtc) || 0;
    const feerateNum = parseFloat(feerate) || 0;
    const segopHex = currentPayloadHex.trim();

    const txModel = {
      network: "regtest",
      version: 2,
      lab_kind: "segop-lab-transaction",
      from_label: fromLabel,
      to_label: toLabel,
      amount_btc: amt,
      feerate_sat_vb: feerateNum,
      include_segop_output: includeSegopOutput,
      segop_payload_hex: includeSegopOutput && segopHex ? segopHex : null,
      segop_payload_bytes:
        includeSegopOutput && segopHex ? segopHex.length / 2 : 0,
      inputs: [
        {
          role: "funding-utxo",
          txid: "dummy-utxo-txid",
          vout: 0,
          value_btc: amt + 0.001,
        },
      ],
      outputs: [
        {
          role: "recipient",
          address_hint: toLabel,
          value_btc: amt,
          script_type: "p2wpkh",
        },
        includeSegopOutput && segopHex
          ? {
              role: "segop",
              address_hint: "segop-data-output",
              value_btc: 0,
              script_type: "p2wsh",
              segop_payload_hex: segopHex,
            }
          : null,
        {
          role: "change",
          address_hint: fromLabel,
          value_btc: 0.001,
          script_type: "p2wpkh",
        },
      ].filter(Boolean),
      notes:
        "This is a segOP Lab representation of a transaction, not a real Bitcoin wire-format TX. Phase B will use RPC/PSBT.",
    };

    setTxJson(JSON.stringify(txModel, null, 2));
  };

  const shortPayload =
    currentPayloadHex.trim().length > 0
      ? `${currentPayloadHex.trim().slice(0, 40)}${
          currentPayloadHex.trim().length > 40 ? "…" : ""
        }`
      : "(empty)";

  return (
    <div className="wallet-root">
      {/* MEMPOOL / BLOCK TIMELINE */}
      <section className="wallet-mempool-strip">
        <div className="wallet-mempool-header">
          <h2>Mempool &amp; recent blocks</h2>
          <span className="wallet-mempool-sub">
            Stub visual – later this will reflect your real node&apos;s mempool
            and recent blocks via RPC.
          </span>
        </div>

        <div className="wallet-mempool-timeline">
          <div className="wallet-block wallet-block-old">Block -3</div>
          <div className="wallet-block wallet-block-old">Block -2</div>
          <div className="wallet-block wallet-block-old">Block -1</div>
          <div className="wallet-block wallet-block-tip">Tip</div>
          <div className="wallet-mempool-bar">Mempool (unconfirmed)</div>
        </div>
      </section>

      {/* MIDDLE: WALLET A — segOP TRANSFER — WALLET B */}
      <section className="wallet-main-row">
        {/* Left: Wallet A */}
        <div className="wallet-column">
          <LabWalletCard side="A" label="Lab Wallet A" />
        </div>

        {/* Middle: segOP transfer */}
        <div className="wallet-column wallet-transfer-column">
          <div className="transfer-card">
            <h3>segOP transfer</h3>

            <div className="transfer-row">
              <label>From / To</label>
              <div className="transfer-fromto">
                <input
                  type="text"
                  value={fromLabel}
                  onChange={(e) => setFromLabel(e.target.value)}
                />
                <span className="transfer-arrow">→</span>
                <input
                  type="text"
                  value={toLabel}
                  onChange={(e) => setToLabel(e.target.value)}
                />
              </div>
            </div>

            <div className="transfer-row">
              <label>Amount (BTC)</label>
              <input
                type="text"
                value={amountBtc}
                onChange={(e) => setAmountBtc(e.target.value)}
              />
            </div>

            <div className="transfer-row">
              <label>Current payload in shared buffer</label>
              <div className="transfer-shared-payload">
                <span className="payload-preview">{shortPayload}</span>
                <button type="button" onClick={handleInspectClick}>
                  Inspect in Inspector
                </button>
              </div>
            </div>

            <div className="transfer-row">
              <label>segOP payload (hex or TLV)</label>
              <textarea
                placeholder="Paste segOP TLV payload here..."
                value={currentPayloadHex}
                onChange={(e) => setCurrentPayloadHex(e.target.value)}
              />
            </div>

            <div className="transfer-actions">
              <button type="button">Use BUDS template</button>
              <button type="button">Build TLV…</button>
              <button type="button">Send A → B</button>
              <button type="button">Send B → A</button>
            </div>
          </div>
        </div>

        {/* Right: Wallet B */}
        <div className="wallet-column">
          <LabWalletCard side="B" label="Lab Wallet B" />
        </div>
      </section>

      {/* BOTTOM: MINING + TX BUILDER JSON */}
      <section className="wallet-bottom">
        <div className="mining-card">
          <div className="mining-left">
            <h3>Local mining / regtest</h3>

            <div className="transfer-row">
              <label>Blocks to mine</label>
              <input type="number" min={1} defaultValue={1} />
            </div>

            <div className="mining-actions">
              <button type="button">Mine to Wallet A</button>
              <button type="button">Mine to Wallet B</button>
              <button type="button">Refresh balances</button>
            </div>
          </div>

          <div className="mining-right">
            <h3>Build segOP transaction (lab JSON)</h3>

            <div className="transfer-row inline">
              <label>Feerate (sat/vB)</label>
              <input
                type="text"
                value={feerate}
                onChange={(e) => setFeerate(e.target.value)}
              />
            </div>

            <div className="transfer-row inline">
              <label>
                <input
                  type="checkbox"
                  checked={includeSegopOutput}
                  onChange={(e) => setIncludeSegopOutput(e.target.checked)}
                />{" "}
                Include segOP output with current payload
              </label>
            </div>

            <button
              type="button"
              className="mining-build-btn"
              onClick={handleBuildTxJson}
            >
              Build transaction JSON
            </button>
          </div>
        </div>

        <div className="wallet-txjson-panel">
          <h3>Lab transaction JSON</h3>
          <pre className="wallet-txjson">
            {txJson || "Click “Build transaction JSON” to generate a model."}
          </pre>
        </div>
      </section>
    </div>
  );
}
