import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./PayloadsView.css";
import HeaderBuilderCard from "../components/HeaderBuilderCard";
import { useLabStore } from "../store/labStore";

type PayloadMode = "text" | "json" | "blob";

/**
 * Utility: UTF-8 → hex (browser safe, no Buffer)
 */
function utf8ToHex(input: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Utility: normalise hex (strip spaces, 0x, newlines)
 */
function normaliseHex(raw: string): string {
  return raw
    .trim()
    .replace(/^0x/i, "")
    .replace(/[^0-9a-fA-F]/g, "")
    .toLowerCase();
}

/**
 * Encode a simple TLV: [type (1 byte)][len (1 byte)][value ...]
 * This is a *lab-format* TLV for segOP payloads – not a consensus rule.
 */
function encodeTlv(typeByte: number, valueHex: string): string {
  const t = typeByte.toString(16).padStart(2, "0");
  const lengthByte = (valueHex.length / 2).toString(16).padStart(2, "0");
  return (t + lengthByte + valueHex).toLowerCase();
}

/**
 * Middle column: build TEXT / JSON / BLOB TLVs and append to the shared
 * segOP payload buffer.
 */
function TlvPayloadBuilder() {
  const navigate = useNavigate();
  const { currentPayloadHex, setCurrentPayloadHex } = useLabStore();

  const [mode, setMode] = useState<PayloadMode>("text");
  const [textBody, setTextBody] = useState("Hello from segOP Lab.");
  const [jsonBody, setJsonBody] = useState('{"msg":"Hello from segOP Lab."}');
  const [blobBody, setBlobBody] = useState("deadbeef");
  const [appendToExisting, setAppendToExisting] = useState(true);
  const [lastBuiltHex, setLastBuiltHex] = useState("");
  const [error, setError] = useState<string | null>(null);

  const existingHeaderHex = useMemo(
    () => normaliseHex(currentPayloadHex),
    [currentPayloadHex]
  );

  const existingHeaderBytes = existingHeaderHex.length / 2;

  const handleBuild = () => {
    try {
      setError(null);

      let valueHex = "";
      let typeByte = 0xe1; // default: TEXT

      if (mode === "text") {
        typeByte = 0xe1;
        valueHex = utf8ToHex(textBody);
      } else if (mode === "json") {
        typeByte = 0xe2;

        // basic JSON validation
        try {
          JSON.parse(jsonBody);
        } catch (e) {
          throw new Error("JSON is invalid. Please fix before building.");
        }

        valueHex = utf8ToHex(jsonBody);
      } else {
        typeByte = 0xe3;
        const norm = normaliseHex(blobBody);
        if (norm.length === 0 || norm.length % 2 !== 0) {
          throw new Error(
            "Blob hex must be non-empty and have an even number of hex characters."
          );
        }
        valueHex = norm;
      }

      const tlvHex = encodeTlv(typeByte, valueHex);

      const combined =
        appendToExisting && existingHeaderHex.length > 0
          ? existingHeaderHex + tlvHex
          : tlvHex;

      setLastBuiltHex(tlvHex);
      setCurrentPayloadHex(combined);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  const shortCombined =
    currentPayloadHex.trim().length > 0
      ? `${currentPayloadHex.trim().slice(0, 48)}${
          currentPayloadHex.trim().length > 48 ? "…" : ""
        }`
      : "(empty)";

  return (
    <div className="payloads-card">
      <h3>segOP TLV payload builder</h3>
      <p className="payloads-intro">
        Build a simple segOP payload TLV. TEXT, JSON, or BLOB are encoded as
        lab-format TLVs:
        <br />
        <code>0xE1</code> = TEXT, <code>0xE2</code> = JSON,
        <code>0xE3</code> = BLOB.
      </p>

      {/* Mode selector */}
      <div className="payloads-mode-row">
        <label>Payload type</label>
        <div className="payloads-mode-buttons">
          <button
            type="button"
            className={mode === "text" ? "active" : ""}
            onClick={() => setMode("text")}
          >
            TEXT
          </button>
          <button
            type="button"
            className={mode === "json" ? "active" : ""}
            onClick={() => setMode("json")}
          >
            JSON
          </button>
          <button
            type="button"
            className={mode === "blob" ? "active" : ""}
            onClick={() => setMode("blob")}
          >
            BLOB (hex)
          </button>
        </div>
      </div>

      {/* Editors */}
      {mode === "text" && (
        <div className="payloads-row">
          <label>TEXT body</label>
          <textarea
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            placeholder="Human-readable message, note, label, etc…"
          />
        </div>
      )}

      {mode === "json" && (
        <div className="payloads-row">
          <label>JSON body</label>
          <textarea
            value={jsonBody}
            onChange={(e) => setJsonBody(e.target.value)}
            placeholder='{"key": "value"}'
          />
        </div>
      )}

      {mode === "blob" && (
        <div className="payloads-row">
          <label>BLOB hex</label>
          <textarea
            value={blobBody}
            onChange={(e) => setBlobBody(e.target.value)}
            placeholder="Raw hex payload (no spaces)…"
          />
        </div>
      )}

      {/* Combination with existing header */}
      <div className="payloads-row inline">
        <label>
          <input
            type="checkbox"
            checked={appendToExisting}
            onChange={(e) => setAppendToExisting(e.target.checked)}
          />{" "}
          Append to existing payload in shared buffer (treat as header)
        </label>
      </div>

      {existingHeaderHex && (
        <div className="payloads-row tiny">
          <span className="payloads-meta">
            Current shared buffer length: {existingHeaderBytes} bytes.
          </span>
        </div>
      )}

      <button type="button" className="payloads-build-btn" onClick={handleBuild}>
        Build TLV and update shared payload
      </button>

      {error && <div className="payloads-error">{error}</div>}

      <div className="payloads-row">
        <label>Last built TLV (this call)</label>
        <pre className="payloads-pre">
          {lastBuiltHex || "(no TLV built in this session yet)"}
        </pre>
      </div>

      <div className="payloads-row">
        <label>Shared payload buffer (preview)</label>
        <div className="payloads-shared-preview">
          <span>{shortCombined}</span>
          <button type="button" onClick={() => navigate("/wallet")}>
            Use in Wallet
          </button>
          <button type="button" onClick={() => navigate("/inspector")}>
            Inspect in Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Right column: show the shared payload buffer in full, with basic stats and
 * quick actions.
 */
function SharedPayloadPanel() {
  const navigate = useNavigate();
  const { currentPayloadHex, setCurrentPayloadHex } = useLabStore();

  const hex = currentPayloadHex.trim();
  const byteLen = hex.length / 2;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hex || "");
    } catch {
      // ignore clipboard failures in this simple lab context
    }
  };

  const handleClear = () => {
    setCurrentPayloadHex("");
  };

  return (
    <div className="payloads-card">
      <h3>Shared payload buffer</h3>
      <p className="payloads-intro">
        This buffer is shared across the Wallet and Inspector. Header Builder
        and TLV Builder both write here.
      </p>

      <div className="payloads-row tiny">
        <span className="payloads-meta">
          Length: {byteLen} bytes ({hex.length} hex chars)
        </span>
      </div>

      <div className="payloads-row">
        <label>Current payload hex</label>
        <textarea
          value={hex}
          onChange={(e) => setCurrentPayloadHex(e.target.value)}
          placeholder="Empty – build a header and/or TLV payload to start…"
        />
      </div>

      <div className="payloads-actions-row">
        <button type="button" onClick={handleCopy}>
          Copy hex
        </button>
        <button type="button" onClick={handleClear}>
          Clear
        </button>
        <button type="button" onClick={() => navigate("/wallet")}>
          Send to Wallet
        </button>
        <button type="button" onClick={() => navigate("/inspector")}>
          Inspect in Inspector
        </button>
      </div>
    </div>
  );
}

export default function PayloadsView() {
  return (
    <div className="payloads-root">
      {/* Top instructions */}
      <section className="payloads-hero">
        <h2>Tx Builder — headers &amp; payloads</h2>
        <p>
          Use the BUDS Header Builder on the left to define{" "}
          <strong>Tier / Type / App / Version</strong>. Use the TLV payload
          builder in the middle to encode TEXT / JSON / BLOB. The shared buffer
          on the right is what the Wallet and Inspector see as your segOP
          payload.
        </p>
      </section>

      {/* Main three-column layout */}
      <section className="payloads-grid">
        <div className="payloads-column">
          <HeaderBuilderCard />
        </div>

        <div className="payloads-column">
          <TlvPayloadBuilder />
        </div>

        <div className="payloads-column">
          <SharedPayloadPanel />
        </div>
      </section>
    </div>
  );
}
