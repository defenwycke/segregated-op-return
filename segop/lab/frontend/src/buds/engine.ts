// BUDS Engine (decode-only, lab version)
//
// TLV FORMAT (lab assumption for now):
//
//   [ T (1 byte) | L (1 byte) | V (L bytes) ]
//
//   T = 0xF0 (BUDS header)
//
//   V layout:
//     byte 0: tier          (0..3)
//     byte 1: typeCode      (0..255)
//     byte 2: subtypeCode   (0..255, 0 = none)
//     byte 3: appIdLength   (0..255)
//     bytes 4..: appId UTF-8
//     next:  versionLength  (0..255)
//     bytes ..: version UTF-8
//
// This is deliberately simple for the Lab and can be updated to match
// the final BUDS v2 on-chain spec later.

import type { BudsTag, BudsTier } from "../types/buds";

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "").trim().toLowerCase();
  if (clean.length === 0) return new Uint8Array();
  if (clean.length % 2 !== 0) {
    throw new Error("Hex string must have even length");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error("Invalid hex character encountered");
    }
    out[i / 2] = byte;
  }
  return out;
}

// Exported helper so other parts of the lab can reuse this later.
export function decodeBudsHeader(payloadHex: string): BudsTag | null {
  const bytes = hexToBytes(payloadHex);

  if (bytes.length < 2) {
    return null;
  }

  const T = bytes[0];
  const L = bytes[1];

  if (T !== 0xf0) {
    // Not a BUDS header TLV at the start
    return null;
  }

  if (bytes.length < 2 + L) {
    throw new Error("BUDS header TLV length mismatch");
  }

  let offset = 2;

  if (L < 3) {
    throw new Error("BUDS header value too short");
  }

  const tier = bytes[offset++] as BudsTier;
  const typeCode = bytes[offset++];
  const subtypeCodeRaw = bytes[offset++];

  // App ID
  if (offset >= 2 + L) {
    throw new Error("Missing appId length in BUDS header");
  }

  const appIdLen = bytes[offset++];
  if (offset + appIdLen > 2 + L) {
    throw new Error("appId length exceeds BUDS header value");
  }

  const appIdBytes = bytes.slice(offset, offset + appIdLen);
  const appId =
    appIdLen > 0 ? new TextDecoder().decode(appIdBytes) : undefined;
  offset += appIdLen;

  // Version (optional)
  let version: string | undefined;
  if (offset < 2 + L) {
    const versionLen = bytes[offset++];
    if (offset + versionLen > 2 + L) {
      throw new Error("version length exceeds BUDS header value");
    }
    const versionBytes = bytes.slice(offset, offset + versionLen);
    version =
      versionLen > 0 ? new TextDecoder().decode(versionBytes) : undefined;
  }

  const tag: BudsTag = {
    tier,
    typeCode,
    subtypeCode: subtypeCodeRaw || undefined,
    appId,
    version,
  };

  return tag;
}
