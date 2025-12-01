import { useState, useEffect } from "react";
import { useLabStore } from "../store/labStore";

// Simple BUDS header model for the Lab.
// TLV: type 0xF0, length = 6, value = [tier(1), type(1), appId(2), version(2)]
// Hex: f0 06 TT TT AA AA VV VV
function encodeHeaderHex(
  tier: number,
  typeId: number,
  appId: number,
  version: number
): string {
  const clampByte = (n: number) => Math.max(0, Math.min(255, n | 0));
  const clampWord = (n: number) => Math.max(0, Math.min(0xffff, n | 0));

  const t = clampByte(tier);
  const ty = clampByte(typeId);
  const app = clampWord(appId);
  const ver = clampWord(version);

  const toHex2 = (n: number) => n.toString(16).padStart(2, "0");
  const toHex4 = (n: number) => n.toString(16).padStart(4, "0");

  const valueHex = [
    toHex2(t),
    toHex2(ty),
    toHex4(app),
    toHex4(ver),
  ].join("");

  const lengthHex = toHex2(valueHex.length / 2); // 6 bytes => "06"
  return ("f0" + lengthHex + valueHex).toLowerCase();
}

export default function HeaderBuilderCard() {
  const setCurrentPayloadHex = useLabStore(
    (s: any) => s.setCurrentPayloadHex
  );

  const [tier, setTier] = useState("2");        // sensible default: Tier 2
  const [typeId, setTypeId] = useState("1");    // e.g. "indexed metadata"
  const [appId, setAppId] = useState("1");      // app registry index
  const [version, setVersion] = useState("1");  // app/version
  const [headerHex, setHeaderHex] = useState("");
  const [notes, setNotes] = useState(
    "Tier 2 / Type 1 – default example header."
  );

  const [error, setError] = useState<string | null>(null);

  const buildHeader = () => {
    try {
      setError(null);

      const tNum = parseInt(tier, 10);
      const typeNum = parseInt(typeId, 10);
      const appNum = parseInt(appId, 10);
      const verNum = parseInt(version, 10);

      if (Number.isNaN(tNum) || Number.isNaN(typeNum)) {
        throw new Error("Tier and Type must be integers.");
      }

      const hex = encodeHeaderHex(tNum, typeNum, appNum, verNum);
      setHeaderHex(hex);
      setCurrentPayloadHex(hex); // push into shared payload buffer
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  return (
    <div className="headerbuilder-root">
      <h3>BUDS Header Builder</h3>
      <p className="headerbuilder-intro">
        Build a simple BUDS header TLV for segOP. This writes hex into the
        shared payload buffer, so you can immediately inspect it or attach it
        to a segOP transaction from the Wallet tab.
      </p>

      <div className="headerbuilder-grid">
        <div className="headerbuilder-field">
          <label>Tier (0–3)</label>
          <input
            type="number"
            min={0}
            max={3}
            value={tier}
            onChange={(e) => setTier(e.target.value)}
          />
          <small>
            T0 = consensus, T1 = payments/contracts, T2 = metadata/indexing,
            T3 = arbitrary data.
          </small>
        </div>

        <div className="headerbuilder-field">
          <label>Type ID</label>
          <input
            type="number"
            min={0}
            max={255}
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
          />
          <small>Application-defined type within this tier.</small>
        </div>

        <div className="headerbuilder-field">
          <label>App ID</label>
          <input
            type="number"
            min={0}
            max={65535}
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          />
          <small>Registry index for the app / protocol.</small>
        </div>

        <div className="headerbuilder-field">
          <label>Version</label>
          <input
            type="number"
            min={0}
            max={65535}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
          <small>Schema / app version.</small>
        </div>
      </div>

      <div className="headerbuilder-notes">
        <label>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Human-readable description of this header..."
        />
      </div>

      <button type="button" onClick={buildHeader}>
        Build header &amp; send to shared payload
      </button>

      {error && <div className="payloads-error">{error}</div>}

      <div className="headerbuilder-output">
        <label>Header TLV hex (lab format)</label>
        <pre>{headerHex || "No header built yet."}</pre>
        <small>
          The hex is also written into the global payload buffer. Switch to
          the Wallet or Inspector tab to see / use it there.
        </small>
      </div>
    </div>
  );
}
