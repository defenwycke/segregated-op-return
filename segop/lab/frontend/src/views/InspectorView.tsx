import { useEffect, useState } from "react";
import "./InspectorView.css";
import { useLabStore } from "../store/labStore";

interface DecodedHeader {
  tier: number;
  typeId: number;
  appId: number;
  version: number;
}

interface InspectResult {
  normalizedHex: string;
  header?: DecodedHeader;
  error?: string;
}

function normalizeHex(input: string): string {
  return input.replace(/0x/gi, "").replace(/[^0-9a-fA-F]/g, "").toLowerCase();
}

/**
 * Very small lab-level BUDS header decoder:
 * TLV: type 0xf0, length 0x06, value:
 *   [ tier (u8), typeId (u8), appId (u16), version (u16) ]
 */
function decodeBudsHeader(input: string): InspectResult {
  const normalizedHex = normalizeHex(input);

  if (!normalizedHex) {
    return { normalizedHex, error: "No hex provided." };
  }

  if (!normalizedHex.startsWith("f0")) {
    return {
      normalizedHex,
      error: "Does not start with BUDS header TLV type 0xf0.",
    };
  }

  if (normalizedHex.length < 4) {
    return {
      normalizedHex,
      error: "BUDS header too short to contain a length field.",
    };
  }

  const lenByte = parseInt(normalizedHex.slice(2, 4), 16);
  const expectedValueHexLen = lenByte * 2;

  const valueHex = normalizedHex.slice(4, 4 + expectedValueHexLen);
  if (valueHex.length < expectedValueHexLen) {
    return {
      normalizedHex,
      error: "BUDS header length is inconsistent with TLV header.",
    };
  }

  if (lenByte !== 6) {
    return {
      normalizedHex,
      error:
        "BUDS header length is not 6 bytes. This Lab expects [tier, type, appId, version].",
    };
  }

  const tier = parseInt(valueHex.slice(0, 2), 16);
  const typeId = parseInt(valueHex.slice(2, 4), 16);
  const appId = parseInt(valueHex.slice(4, 8), 16);
  const version = parseInt(valueHex.slice(8, 12), 16);

  if ([tier, typeId, appId, version].some((n) => Number.isNaN(n))) {
    return {
      normalizedHex,
      error: "Failed to parse BUDS header fields from value bytes.",
    };
  }

  return {
    normalizedHex,
    header: { tier, typeId, appId, version },
  };
}

function tierName(tier: number): string {
  switch (tier) {
    case 0:
      return "Consensus / Structural";
    case 1:
      return "Economic / State Commitments";
    case 2:
      return "Metadata / Indexing / Hints";
    case 3:
      return "Arbitrary / Bulk Data";
    default:
      return "Unknown tier";
  }
}

export default function InspectorView() {
  const { currentPayloadHex } = useLabStore();

  const [input, setInput] = useState<string>("");
  const [result, setResult] = useState<InspectResult | null>(null);
  const [hasInspected, setHasInspected] = useState(false);

  const runInspect = (source: string) => {
    const res = decodeBudsHeader(source);
    setResult(res);
    setHasInspected(true);
  };

  const handleInspectClick = () => {
    runInspect(input);
  };

  const handleUseSharedClick = () => {
    setInput(currentPayloadHex.trim());
    runInspect(currentPayloadHex.trim());
  };

  // Auto-inspect once when arriving with a shared payload
  useEffect(() => {
    if (!hasInspected && currentPayloadHex.trim()) {
      setInput(currentPayloadHex.trim());
      runInspect(currentPayloadHex.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPayloadHex]);

  const header = result?.header;
  const tierLabel =
    header && header.tier >= 0 && header.tier <= 3 ? `T${header.tier}` : "—";

  return (
    <div className="inspector-root">
      <section className="inspector-grid">
        {/* LEFT: INPUT */}
        <div className="inspector-card inspector-input">
          <h2>Inspector</h2>
          <p className="inspector-intro">
            Paste raw transaction hex, segOP payload hex, or a BUDS header TLV
            (type 0xF0). segOP Lab will normalise the hex, try to decode a BUDS
            header, and show the implied BUDS + ARBDA tiers.
          </p>

          <label className="inspector-label">
            Input
            <textarea
              placeholder="Paste TX hex, segOP hex, or TLV..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </label>

          <div className="inspector-actions">
            <button type="button" onClick={handleInspectClick}>
              Inspect
            </button>
            <button
              type="button"
              className="secondary"
              onClick={handleUseSharedClick}
            >
              Use shared payload buffer
            </button>
          </div>

          <div className="inspector-shared-hint">
            Shared buffer current value length:{" "}
            {currentPayloadHex.trim().length / 2} bytes
          </div>
        </div>

        {/* RIGHT: OUTPUT */}
        <div className="inspector-card inspector-output">
          <h3>Output</h3>

          {!result && (
            <div className="inspector-output-empty">
              Nothing inspected yet.
            </div>
          )}

          {result && (
            <>
              <div className="inspector-section">
                <h4>Normalised hex</h4>
                <pre className="inspector-hex">
                  {result.normalizedHex || "(empty)"}
                </pre>
              </div>

              <div className="inspector-section">
                <h4>BUDS header decode</h4>
                {header ? (
                  <div className="inspector-header-summary">
                    <div className={`tier-badge t${header.tier}`}>
                      {tierLabel}
                    </div>
                    <div className="header-fields">
                      <div>
                        <span className="field-label">Tier:</span>{" "}
                        <span className="field-value">
                          {header.tier} — {tierName(header.tier)}
                        </span>
                      </div>
                      <div>
                        <span className="field-label">Type ID:</span>{" "}
                        <span className="field-value">{header.typeId}</span>
                      </div>
                      <div>
                        <span className="field-label">App ID:</span>{" "}
                        <span className="field-value">{header.appId}</span>
                      </div>
                      <div>
                        <span className="field-label">Version:</span>{" "}
                        <span className="field-value">{header.version}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="inspector-error">
                    {result.error ||
                      "No BUDS header TLV found at the start of this hex."}
                  </div>
                )}
              </div>

              <div className="inspector-section">
                <h4>ARBDA tier (lab view)</h4>
                {header ? (
                  <div className="arbda-summary">
                    <div className={`tier-badge t${header.tier}`}>
                      {tierLabel}
                    </div>
                    <p>
                      In this Lab, ARBDA maps directly to the BUDS tier for the
                      header. T0 is treated as structural / consensus, T1 as
                      economic &amp; state, T2 as metadata / indexing, and T3 as
                      arbitrary data subject to strict policy.
                    </p>
                  </div>
                ) : (
                  <p className="arbda-hint">
                    Without a valid BUDS header, ARBDA can&apos;t classify this
                    payload.
                  </p>
                )}
              </div>

              <div className="inspector-section">
                <h4>BUDS / ARBDA colour key</h4>
                <div className="tier-legend">
                  <span className="tier-badge t0">T0</span>
                  <span className="tier-label">
                    Consensus / structural (green)
                  </span>

                  <span className="tier-badge t1">T1</span>
                  <span className="tier-label">
                    Economic / state commitments (blue)
                  </span>

                  <span className="tier-badge t2">T2</span>
                  <span className="tier-label">
                    Metadata / indexing / hints (orange)
                  </span>

                  <span className="tier-badge t3">T3</span>
                  <span className="tier-label">
                    Arbitrary / bulk data (red)
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
