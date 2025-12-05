import { useState } from "react";
import "./InfoView.css";
import BudsRegistryCard from "../components/BudsRegistryCard";
import SegopRegistryCard from "../components/SegopRegistryCard";

export default function InfoView() {
  // start collapsed by default
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="info-root">
      {/* Instructions */}
      <section className="info-instructions">
        <button
          type="button"
          className="info-instructions-toggle"
          onClick={() => setShowInstructions((v) => !v)}
        >
          <span>How to use this Lab</span>
          <span className="info-toggle-icon">
            {showInstructions ? "−" : "+"}
          </span>
        </button>

        {showInstructions && (
          <div className="info-instructions-body">
            <ol>
              <li>
                <strong>Select a BUDS tier &amp; type</strong> from the BUDS
                registry (left) to define intent: payments, metadata, or
                arbitrary data.
              </li>
              <li>
                <strong>Use the segOP registry</strong> (right) to see how
                that intent is encoded into segOP TLVs and payload structure.
              </li>
              <li>
                Go to the <strong>Tx Builder / Payloads</strong> page to
                construct a BUDS header, stack TLVs and attach them to a
                segOP transaction model.
              </li>
              <li>
                Use the <strong>Wallet</strong> page to exercise node RPC
                (wallets, mempool, mining) once configured.
              </li>
              <li>
                On the <strong>Inspector</strong> page, run the BUDS Tag
                Engine and ARBDA policy over your payloads and transactions.
              </li>
              <li>
                Finally, the <strong>Tests</strong> and{" "}
                <strong>Simulator</strong> pages let you replay predefined
                scenarios and visualise pruning windows, storage savings and
                mempool composition.
              </li>
            </ol>
          </div>
        )}
      </section>

      {/* Registries row */}
      <section className="info-registries">
        <div className="info-panel">
          <h2>BUDS Registry</h2>
          <p className="info-panel-intro">
            Tiered classification for Bitcoin data: consensus, payments,
            structured metadata, and arbitrary data. Select a tier &amp; type
            here to drive the rest of the Lab.
          </p>
          <BudsRegistryCard />
        </div>

        <div className="info-panel">
          <h2>segOP Registry</h2>
          <p className="info-panel-intro">
            segOP payload layout and TLVs used by BUDS-aware applications.
            This shows the lab&apos;s header TLV and a few example content
            TLVs used in tests.
          </p>
          <SegopRegistryCard />
        </div>
      </section>
    </div>
  );
}
