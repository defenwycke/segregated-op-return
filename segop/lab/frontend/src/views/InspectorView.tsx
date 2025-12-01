import "./InspectorView.css";
import { useState, useEffect } from "react";
import { decodeBudsHeader } from "../buds/engine";
import { useLabStore } from "../store/labStore";

export default function InspectorView() {
  const { currentPayloadHex, setCurrentPayloadHex } = useLabStore();

  // Start empty; we'll fill from the store in useEffect
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("Nothing inspected yet.");

  const runInspect = (raw: string) => {
    const trimmed = raw.trim();

    if (!trimmed) {
      setOutput("⚠️ Please enter TX hex, segOP payload, or TLV hex.");
      return;
    }

    const hex = trimmed.replace(/\s+/g, "");

    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      setOutput("❌ Input does not look like hex.\n\nRaw input:\n" + raw);
      return;
    }

    if (hex.length % 2 !== 0) {
      setOutput(
        "⚠️ Hex length is odd (each byte must be 2 hex chars).\n\nNormalised hex:\n" +
          hex
      );
      return;
    }

    try {
      const buds = decodeBudsHeader(hex);

      // keep store in sync with the cleaned hex
      setCurrentPayloadHex(hex);

      if (!buds) {
        setOutput(
          [
            "No BUDS header TLV (0xF0) detected at the start of this hex.",
            "",
            "Normalised hex:",
            hex,
          ].join("\n")
        );
        return;
      }

      const pretty = JSON.stringify(buds, null, 2);

      setOutput(
        [
          "✅ BUDS header decoded successfully.",
          "",
          "BUDS tag:",
          pretty,
          "",
          "Normalised hex:",
          hex,
        ].join("\n")
      );
    } catch (err: any) {
      setOutput(
        [
          "❌ Error while decoding as BUDS header:",
          String(err?.message ?? err),
          "",
          "Normalised hex:",
          hex,
        ].join("\n")
      );
    }
  };

  const handleInspect = () => {
    runInspect(input);
  };

  // On mount (and whenever the store changes), if there is a payload there,
  // auto-fill and auto-inspect it.
  useEffect(() => {
    if (currentPayloadHex) {
      setInput(currentPayloadHex);
      runInspect(currentPayloadHex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPayloadHex]);

  return (
    <div className="inspector-root">
      <h2>Inspector</h2>
      <p className="inspector-intro">
        Paste raw transaction hex, segOP payloads, or TLV headers. segOP Lab
        will attempt to decode a BUDS header TLV (0xF0) at the start of the
        input and show the result.
      </p>

      <div className="inspector-layout">
        <div className="inspector-input">
          <label>Input</label>
          <textarea
            placeholder="Paste TX hex, segOP hex, or TLV..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button onClick={handleInspect}>Inspect</button>
        </div>

        <div className="inspector-output">
          <label>Output</label>
          <pre>{output}</pre>
        </div>
      </div>
    </div>
  );
}
