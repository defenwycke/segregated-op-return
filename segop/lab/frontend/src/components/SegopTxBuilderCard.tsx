import { useState } from "react";
import { useLabStore } from "../store/labStore";

function shortenHex(hex: string, maxLen = 24): string {
  const h = (hex || "").replace(/^0x/i, "").toLowerCase();
  if (!h) return "(none)";
  if (h.length <= maxLen) return h;
  return h.slice(0, maxLen) + "...";
}

export default function SegopTxBuilderCard() {
  const currentPayloadHex = useLabStore(
    (s: any) => s.currentPayloadHex || ""
  );

  const [fromLabel, setFromLabel] = useState("Lab Wallet A");
  const [toLabel, setToLabel] = useState("Lab Wallet B");
  const [amountBtc, setAmountBtc] = useState("0.001");
  const [feerate, setFeerate] = useState("5.0");
  const [includeSegop, setIncludeSegop] = useState(true);

  const [txJson, setTxJson] = useState("");
  const [error, setError] = useState<string | null>(null);

  const buildTx = () => {
    try {
      setError(null);

      const amt = parseFloat(amountBtc);
      const fee = parseFloat(feerate);

      if (!Number.isFinite(amt) || amt <= 0) {
        throw new Error("Amount must be a positive number (BTC).");
      }
      if (!Number.isFinite(fee) || fee <= 0) {
        throw new Error("Feerate must be a positive number (sat/vB).");
      }

      const payloadHex = (currentPayloadHex || "").replace(
        /[^0-9a-fA-F]/g,
        ""
      );

      if (includeSegop && !payloadHex) {
        throw new Error(
          "Include segOP is enabled but there is no payload in the shared buffer. Build a BUDS header / TLV first."
        );
      }

      const segopBytes = includeSegop ? payloadHex.length / 2 : 0;

      // This is a LAB representation, not wire-format Bitcoin hex.
      const tx = {
        network: "regtest",
        version: 2,
        lab_kind: "segop-lab-transaction",
        from_label: fromLabel,
        to_label: toLabel,
        amount_btc: amt,
        feerate_sat_vb: fee,
        include_segop_output: includeSegop,
        segop_payload_hex: includeSegop ? payloadHex : null,
        segop_payload_bytes: segopBytes,
        inputs: [
          {
            role: "funding-utxo",
            txid_hint: "dummy-utxo-txid",
            vout: 0,
            value_btc: amt + 0.0001, // dummy value
          },
        ],
        outputs: [
          {
            role: "recipient",
            address_hint: toLabel || "recipient-address",
            value_btc: amt,
            script_type: "p2pkh",
          },
          includeSegop
            ? {
                role: "segop",
                address_hint: "segop-data-output",
                value_btc: 0,
                script_type: "segop",
                segop_payload_hex: payloadHex,
              }
            : null,
          {
            role: "change",
            address_hint: fromLabel || "change-address",
            value_btc: 0.0001, // dummy
            script_type: "p2pkh",
          },
        ].filter(Boolean),
        notes:
          "This is a segOP Lab representation of a transaction, not a real Bitcoin wire-format hex. Phase B will use RPC/PSBT to create real transactions.",
      };

      setTxJson(JSON.stringify(tx, null, 2));
    } catch (e: any) {
      setError(e?.message || String(e));
      setTxJson("");
    }
  };

  return (
    <div className="segtx-root">
      <h3>segOP Transaction Builder (Lab)</h3>
      <p className="segtx-intro">
        Construct a lab-grade segOP transaction model using the current
        payload from the Payloads / BUDS workbench. This does not broadcast
        or use real Bitcoin wire-format yet; it&apos;s for inspection and
        documentation.
      </p>

      <div className="segtx-grid">
        <div className="segtx-field">
          <label>From label</label>
          <input
            type="text"
            value={fromLabel}
            onChange={(e) => setFromLabel(e.target.value)}
          />
          <small>Label for funding wallet / change output.</small>
        </div>

        <div className="segtx-field">
          <label>To label</label>
          <input
            type="text"
            value={toLabel}
            onChange={(e) => setToLabel(e.target.value)}
          />
          <small>Label for recipient wallet.</small>
        </div>

        <div className="segtx-field">
          <label>Amount (BTC)</label>
          <input
            type="text"
            value={amountBtc}
            onChange={(e) => setAmountBtc(e.target.value)}
          />
          <small>Value to send to the recipient output.</small>
        </div>

        <div className="segtx-field">
          <label>Feerate (sat/vB)</label>
          <input
            type="text"
            value={feerate}
            onChange={(e) => setFeerate(e.target.value)}
          />
          <small>Used for policy and future RPC integration.</small>
        </div>
      </div>

      <div className="segtx-payload-status">
        <label>Current payload in shared buffer</label>
        <div className="segtx-payload-line">
          <code>{shortenHex(currentPayloadHex)}</code>
        </div>
        <small>
          This is whatever the Header Builder / TLV Builder last wrote. It
          will be attached as the segOP payload when enabled.
        </small>

        <label className="segtx-include">
          <input
            type="checkbox"
            checked={includeSegop}
            onChange={(e) => setIncludeSegop(e.target.checked)}
          />{" "}
          Include segOP output with current payload
        </label>
      </div>

      <button type="button" onClick={buildTx} className="segtx-build-btn">
        Build segOP transaction (lab JSON)
      </button>

      {error && <div className="payloads-error">{error}</div>}

      <div className="segtx-output">
        <label>Lab transaction JSON</label>
        <pre>
          {txJson ||
            "No transaction built yet. Fill the fields above and click the build button."}
        </pre>
        <small>
          This JSON is meant for inspection, docs and later integration with
          PSBT / RPC. It is not a raw Bitcoin transaction hex.
        </small>
      </div>
    </div>
  );
}
