import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TestsView.css";
import { useLabStore } from "../store/labStore";

type Tier = 0 | 1 | 2 | 3;

interface TestVector {
  id: string;
  name: string;
  category: string;
  description: string;
  tier: Tier;
  typeId: number;
  headerHex: string;
  payloadHex: string;
  expectedScore: string;
  notes: string;
}

const TEST_VECTORS: TestVector[] = [
  {
    id: "t0-struct-empty",
    category: "Structural / Consensus",
    name: "T0 structural header only",
    description:
      "Minimal BUDS header in Tier 0 with no payload. Models consensus-adjacent or structural metadata.",
    tier: 0,
    typeId: 1,
    headerHex: "f006000100010001",
    payloadHex: "",
    expectedScore: "ARBDA = T0 (best-case / structural)",
    notes:
      "Used to illustrate that structural data should be extremely rare for segOP. Most Lab demos will not use T0.",
  },
  {
    id: "t1-payment-note",
    category: "Economic / State",
    name: "T1 payment anchor + short note",
    description:
      "Tier 1 header (economic / state) with a tiny TEXT payload. Think: channel commitment anchor plus a human label.",
    tier: 1,
    typeId: 1,
    headerHex: "f006010100010001",
    payloadHex:
      "e10d486f64f3206e6f7465207061796d656e7421", // TLV-ish TEXT (lab only)
    expectedScore:
      "ARBDA = T1 (economic). Small text note attached to a payment/state output.",
    notes:
      "Keeps payload tiny but inside the economic tier. Suitable for things like channel labels, vault labels, etc.",
  },
  {
    id: "t2-json-index",
    category: "Metadata / Indexing",
    name: "T2 JSON index metadata",
    description:
      "Tier 2 header with a JSON-style payload for index / rollup metadata.",
    tier: 2,
    typeId: 2,
    headerHex: "f006020200020001",
    payloadHex:
      "e2207b2274797065223a22696e646578222c2276657273223a22312e30227d", // pseudo JSON TLV
    expectedScore:
      "ARBDA = T2 (metadata). Nodes may prune payload under tighter policies while keeping economic state safe.",
    notes:
      "Demonstrates structured JSON metadata destined for indexers, rollups, or L2 state summaries.",
  },
  {
    id: "t3-blob",
    category: "Arbitrary / Bulk",
    name: "T3 arbitrary BLOB payload",
    description:
      "Tier 3 header with a large opaque BLOB-style payload. Worst ARBDA tier, highest pruning pressure.",
    tier: 3,
    typeId: 3,
    headerHex: "f006030300030001",
    payloadHex:
      "e340" +
      "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    expectedScore:
      "ARBDA = T3 (arbitrary). Subject to strictest policies and highest fees.",
    notes:
      "Intended to model the kind of data that critics call 'spam'. segOP + BUDS lets us isolate and price this explicitly.",
  },
];

function tierName(tier: Tier): string {
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

function tierBadgeClass(tier: Tier): string {
  return `tier-badge t${tier}`;
}

export default function TestsView() {
  const navigate = useNavigate();
  const { setCurrentPayloadHex } = useLabStore();

  const [selectedId, setSelectedId] = useState<string>(
    TEST_VECTORS[0]?.id ?? ""
  );

  const selected =
    TEST_VECTORS.find((t) => t.id === selectedId) || TEST_VECTORS[0];

  const combinedHex = `${selected.headerHex}${selected.payloadHex}`;

  const categories = Array.from(
    new Set(TEST_VECTORS.map((t) => t.category))
  );

  const handleLoadToBuffer = () => {
    setCurrentPayloadHex(combinedHex);
  };

  const handleOpenWallet = () => {
    setCurrentPayloadHex(combinedHex);
    navigate("/wallet");
  };

  const handleOpenInspector = () => {
    setCurrentPayloadHex(combinedHex);
    navigate("/inspector");
  };

  return (
    <div className="tests-root">
      <section className="tests-hero">
        <h1>Tests</h1>
        <p>
          One-click segOP + BUDS test vectors. Each test predefines a BUDS
          header, a payload TLV, and an expected BUDS/ARBDA classification. Use
          them to replay scenarios across the Wallet, Inspector, and Simulator.
        </p>
      </section>

      <section className="tests-grid">
        {/* LEFT: test library */}
        <div className="tests-card tests-left">
          <h2>Test library</h2>
          <p className="tests-left-intro">
            Pick a vector to see its header, payload, and scoring. Click
            &quot;Load into shared buffer&quot; to push the combined hex into
            the Lab&apos;s global payload buffer.
          </p>

          {categories.map((cat) => (
            <div key={cat} className="tests-category">
              <div className="tests-category-header">{cat}</div>
              <div className="tests-category-body">
                {TEST_VECTORS.filter((t) => t.category === cat).map((t) => {
                  const active = t.id === selected.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={
                        active
                          ? "tests-test-row tests-test-row-active"
                          : "tests-test-row"
                      }
                      onClick={() => setSelectedId(t.id)}
                    >
                      <div className="tests-test-main">
                        <div className="tests-test-title">
                          <span className={tierBadgeClass(t.tier)}>
                            T{t.tier}
                          </span>
                          <span>{t.name}</span>
                        </div>
                        <div className="tests-test-desc">
                          {t.description}
                        </div>
                      </div>
                      <div className="tests-test-meta">
                        <span className="tests-test-tier">
                          Tier {t.tier} / Type {t.typeId}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: details + "tag engine" style scoring */}
        <div className="tests-card tests-right">
          <h2>Selected test</h2>

          <div className="tests-detail-block">
            <h3>Overview</h3>
            <div className="tests-overview">
              <div className={tierBadgeClass(selected.tier)}>
                T{selected.tier}
              </div>
              <div className="tests-overview-text">
                <div className="tests-overview-title">{selected.name}</div>
                <div className="tests-overview-desc">
                  {selected.description}
                </div>
                <div className="tests-overview-meta">
                  Tier {selected.tier} — {tierName(selected.tier)} · Type{" "}
                  {selected.typeId}
                </div>
              </div>
            </div>
          </div>

          <div className="tests-detail-block">
            <h3>Header &amp; payload hex</h3>
            <div className="tests-hex-grid">
              <div>
                <label className="tests-label">BUDS header TLV (0xF0)</label>
                <pre className="tests-hex">{selected.headerHex}</pre>
              </div>
              <div>
                <label className="tests-label">
                  segOP payload TLV (lab format)
                </label>
                <pre className="tests-hex">
                  {selected.payloadHex || "(none)"}
                </pre>
              </div>
            </div>

            <div>
              <label className="tests-label">Combined hex (buffer)</label>
              <pre className="tests-hex">{combinedHex || "(empty)"}</pre>
            </div>
          </div>

          <div className="tests-detail-block">
            <h3>Tag engine / ARBDA scoring (lab view)</h3>
            <div className="tests-tag-summary">
              <div className={tierBadgeClass(selected.tier)}>
                T{selected.tier}
              </div>
              <div className="tests-tag-text">
                <div className="tests-tag-score">
                  {selected.expectedScore}
                </div>
                <div className="tests-tag-notes">{selected.notes}</div>
              </div>
            </div>

            <div className="tests-tier-legend">
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

          <div className="tests-detail-block">
            <h3>Actions</h3>
            <div className="tests-actions">
              <button type="button" onClick={handleLoadToBuffer}>
                Load into shared buffer
              </button>
              <button type="button" onClick={handleOpenInspector}>
                Open in Inspector
              </button>
              <button type="button" onClick={handleOpenWallet}>
                Open in Wallet
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
