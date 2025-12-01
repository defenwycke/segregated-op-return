import { useMemo } from "react";
import { useLabStore } from "../store/labStore";

type DecodedHeader = {
  tier: number;
  typeId: number;
  appId: number;
  version: number;
  rawValueHex: string;
};

function normalizeHex(input: string): string {
  return (input || "")
    .replace(/^0x/i, "")
    .replace(/[^0-9a-fA-F]/g, "")
    .toLowerCase();
}

function hexByte(hex: string, offset: number): number {
  if (offset + 2 > hex.length) return NaN;
  return parseInt(hex.slice(offset, offset + 2), 16);
}

function hexWord(hex: string, offset: number): number {
  if (offset + 4 > hex.length) return NaN;
  return parseInt(hex.slice(offset, offset + 4), 16);
}

const TIER_DESCRIPTIONS: Record<number, string> = {
  0: "Tier 0 — consensus / critical protocol state",
  1: "Tier 1 — payments, contracts, state commitments",
  2: "Tier 2 — metadata, indexing, L2 anchors, signalling",
  3: "Tier 3 — arbitrary data / blobs / junk",
};

function decodeHeaderFromHex(hex: string): {
  header?: DecodedHeader;
  errors: string[];
} {
  const errors: string[] = [];
  const norm = normalizeHex(hex);

  if (!norm) {
    errors.push("No payload hex available.");
    return { errors };
  }

  if (norm.length < 4) {
    errors.push("Payload too short to contain a TLV header.");
    return { errors };
  }

  const tByte = hexByte(norm, 0); // type
  const lenByte = hexByte(norm, 2);

  if (Number.isNaN(tByte) || Number.isNaN(lenByte)) {
    errors.push("Failed to read TLV type/length from payload.");
    return { errors };
  }

  if (tByte !== 0xf0) {
    errors.push(
      `First TLV is type 0x${tByte.toString(
        16
      )}, not 0xf0. This does not look like a BUDS header TLV.`
    );
    return { errors };
  }

  const expectedValueBytes = lenByte;
  const expectedValueHexLen = expectedValueBytes * 2;
  const valueHex = norm.slice(4, 4 + expectedValueHexLen);

  if (valueHex.length < expectedValueHexLen) {
    errors.push(
      `Declared header length is ${expectedValueBytes} bytes, but only ${
        valueHex.length / 2
      } bytes of value are present.`
    );
    return { errors };
  }

  if (expectedValueBytes < 6) {
    errors.push(
      `Header value is only ${expectedValueBytes} bytes, expected at least 6 (tier, type, appId, version).`
    );
    return { errors };
  }

  const tier = hexByte(valueHex, 0);
  const typeId = hexByte(valueHex, 2);
  const appId = hexWord(valueHex, 4);
  const version = hexWord(valueHex, 8);

  if (
    [tier, typeId, appId, version].some((n) => Number.isNaN(n))
  ) {
    errors.push("Failed to decode tier/type/appId/version from header.");
    return { errors };
  }

  return {
    header: {
      tier,
      typeId,
      appId,
      version,
      rawValueHex: valueHex,
    },
    errors,
  };
}

export default function HeaderInspectorCard() {
  const currentPayloadHex = useLabStore(
    (s: any) => s.currentPayloadHex || ""
  );

  const { header, errors } = useMemo(
    () => decodeHeaderFromHex(currentPayloadHex),
    [currentPayloadHex]
  );

  const tierDesc =
    header && TIER_DESCRIPTIONS[header.tier]
      ? TIER_DESCRIPTIONS[header.tier]
      : header
      ? `Tier ${header.tier} — (no description registered in Lab)`
      : "";

  return (
    <div className="headerinspector-root">
      <h3>BUDS Header Inspector</h3>
      <p className="headerinspector-intro">
        Decodes the BUDS header TLV (type 0xF0) at the start of the current
        payload. This uses the same lab format as the Header Builder above:
        <code>f0 len tier type appId version</code>.
      </p>

      <div className="headerinspector-current">
        <label>Current payload hex (from shared buffer)</label>
        <pre>
          {currentPayloadHex
            ? currentPayloadHex
            : "No payload in buffer yet. Build a header above, or send one here from the Wallet / Inspector."}
        </pre>
      </div>

      {errors.length > 0 && (
        <div className="payloads-error">
          {errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {header && errors.length === 0 && (
        <div className="headerinspector-details">
          <div className="headerinspector-row">
            <span className="headerinspector-label">Tier</span>
            <span className="headerinspector-value">
              {header.tier} — {tierDesc}
            </span>
          </div>

          <div className="headerinspector-row">
            <span className="headerinspector-label">Type ID</span>
            <span className="headerinspector-value">
              {header.typeId}{" "}
              <span className="headerinspector-note">
                (lab-defined semantic; see BUDS registry)
              </span>
            </span>
          </div>

          <div className="headerinspector-row">
            <span className="headerinspector-label">App ID</span>
            <span className="headerinspector-value">
              {header.appId}{" "}
              <span className="headerinspector-note">
                (registry index for the app / protocol)
              </span>
            </span>
          </div>

          <div className="headerinspector-row">
            <span className="headerinspector-label">Version</span>
            <span className="headerinspector-value">
              {header.version}{" "}
              <span className="headerinspector-note">
                (schema / app version)
              </span>
            </span>
          </div>

          <div className="headerinspector-row">
            <span className="headerinspector-label">Raw value hex</span>
            <span className="headerinspector-value">
              <code>{header.rawValueHex}</code>
            </span>
          </div>

          <div className="headerinspector-row">
            <span className="headerinspector-label">ARBDA hint</span>
            <span className="headerinspector-value">
              {header.tier === 0 &&
                "This should correspond to critical protocol state (T0)."}
              {header.tier === 1 &&
                "This is primary payment / contract / state commitment data (T1)."}
              {header.tier === 2 &&
                "This is metadata / indexing / L2 anchor material (T2)."}
              {header.tier === 3 &&
                "This is arbitrary / bulk data (T3) and may face stricter policies."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
