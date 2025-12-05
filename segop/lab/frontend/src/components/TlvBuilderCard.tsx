import { useState } from "react";
import { useLabStore } from "../store/labStore";

type TlvEntry = {
  id: number;
  typeHex: string;
  valueHex: string;
};

function normalizeHex(input: string): string {
  return (input || "")
    .replace(/^0x/i, "")
    .replace(/[^0-9a-fA-F]/g, "")
    .toLowerCase();
}

function toHex2(n: number): string {
  return n.toString(16).padStart(2, "0");
}

export default function TlvBuilderCard() {
  const currentPayloadHex = useLabStore(
    (s: any) => s.currentPayloadHex || ""
  );
  const setCurrentPayloadHex = useLabStore(
    (s: any) => s.setCurrentPayloadHex
  );

  const [entries, setEntries] = useState<TlvEntry[]>([
    { id: 1, typeHex: "f1", valueHex: "" },
  ]);
  const [prependHeader, setPrependHeader] = useState(true);
  const [payloadHex, setPayloadHex] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        typeHex: "f2",
        valueHex: "",
      },
    ]);
  };

  const removeEntry = (id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (
    id: number,
    field: "typeHex" | "valueHex",
    value: string
  ) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      )
    );
  };

  const buildPayload = () => {
    try {
      setError(null);

      let tlvHexParts: string[] = [];

      for (const entry of entries) {
        const tHex = normalizeHex(entry.typeHex);
        const vHex = normalizeHex(entry.valueHex);

        if (!tHex || tHex.length !== 2) {
          throw new Error(
            `TLV ${entry.id}: type must be 1 byte in hex (e.g. "f1").`
          );
        }

        if (vHex.length % 2 !== 0) {
          throw new Error(
            `TLV ${entry.id}: value hex length must be even (pairs of bytes).`
          );
        }

        const valueBytes = vHex.length / 2;
        if (valueBytes > 255) {
          throw new Error(
            `TLV ${entry.id}: value too long for 1-byte length (max 255 bytes).`
          );
        }

        const lenHex = toHex2(valueBytes);
        const tlvHex = tHex + lenHex + vHex;
        tlvHexParts.push(tlvHex);
      }

      let finalHex = tlvHexParts.join("");

      if (prependHeader && currentPayloadHex) {
        const headerNorm = normalizeHex(currentPayloadHex);
        finalHex = headerNorm + finalHex;
      }

      setPayloadHex(finalHex || "");
      setCurrentPayloadHex(finalHex || "");
    } catch (e: any) {
      setError(e?.message || String(e));
      setPayloadHex("");
    }
  };

  return (
    <div className="tlvbuilder-root">
      <h3>BUDS TLV Builder</h3>
      <p className="tlvbuilder-intro">
        Build a sequence of TLVs on top of the BUDS header. Each entry uses
        the lab TLV format <code>type (1 byte) | length (1 byte) | value</code>.
        You can optionally prepend the current BUDS header TLV from the
        shared payload buffer.
      </p>

      <div className="tlvbuilder-prepend">
        <label>
          <input
            type="checkbox"
            checked={prependHeader}
            onChange={(e) => setPrependHeader(e.target.checked)}
          />{" "}
          Prepend current payload as header (if present)
        </label>
        <small>
          Current payload hex starts with:{" "}
          {currentPayloadHex
            ? normalizeHex(currentPayloadHex).slice(0, 16) + "..."
            : "(none)"}
        </small>
      </div>

      <div className="tlvbuilder-list">
        {entries.map((entry) => (
          <div key={entry.id} className="tlvbuilder-row">
            <div className="tlvbuilder-type">
              <label>Type (hex)</label>
              <input
                type="text"
                value={entry.typeHex}
                onChange={(e) =>
                  updateEntry(entry.id, "typeHex", e.target.value)
                }
                placeholder="f1"
              />
            </div>
            <div className="tlvbuilder-value">
              <label>Value (hex)</label>
              <textarea
                value={entry.valueHex}
                onChange={(e) =>
                  updateEntry(entry.id, "valueHex", e.target.value)
                }
                placeholder="app-specific value hex..."
              />
            </div>
            <div className="tlvbuilder-actions">
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                disabled={entries.length === 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addEntry} className="tlvbuilder-add">
        + Add TLV entry
      </button>

      <button
        type="button"
        onClick={buildPayload}
        className="tlvbuilder-build"
      >
        Build TLV payload &amp; send to shared buffer
      </button>

      {error && <div className="payloads-error">{error}</div>}

      <div className="tlvbuilder-output">
        <label>Combined TLV payload hex</label>
        <pre>{payloadHex || "No TLV payload built yet."}</pre>
        <small>
          This hex is also written into the global payload buffer. Wallet,{" "}
          Inspector and Header Inspector will all see this payload.
        </small>
      </div>
    </div>
  );
}
