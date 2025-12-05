import { useState } from "react";
import BudsTagEngine from "../buds/tagEngine";
import type { ArbdaTier, BudsClassification } from "../buds/tagEngine";

type PolicyProfile = "strict" | "neutral" | "permissive";
type TxPresetKey =
  | "custom"
  | "t1_channel_root"
  | "t2_anchor_meta"
  | "t3_junk_inscription"
  | "t3_large_witness";

// --- Example transactions for presets ---

const PRESET_TXS: Record<TxPresetKey, any> = {
  custom: {
    txid: "custom-txid",
    vout: [],
    witness: [],
  },
  t1_channel_root: {
    txid: "t1-channel-root",
    vout: [
      {
        value: 0.01,
        scriptPubKey: {
          asm: "OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG",
          hex: "76a91400112233445566778899aabbccddeeff0011223388ac",
        },
      },
      {
        value: 0,
        scriptPubKey: {
          asm: "OP_RETURN 4c325f524f4f545f524556",
          hex: "6a0c4c325f524f4f545f524556",
        },
      },
    ],
    witness: [
      {
        stack: [
          "3045022100deadbeefcafebabedeadbeefcafebabedeadbeefcafebabe01",
          "0202cafebabedeadbeefcafebabedeadbeefcafebabedeadbeef",
        ],
      },
    ],
  },
  t2_anchor_meta: {
    txid: "t2-anchor-meta",
    vout: [
      {
        value: 0.001,
        scriptPubKey: {
          asm: "OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG",
          hex: "76a9148899aabbccddeeff00112233445566778899aabb88ac",
        },
      },
      {
        value: 0,
        scriptPubKey: {
          asm: "OP_RETURN 414e43484f525f4d455441",
          hex: "6a0c414e43484f525f4d455441",
        },
      },
    ],
    witness: [
      {
        stack: [
          "3044022055aa55aa55aa55aa55aa55aa55aa55aa55aa55aa55aa55aa022055aa55aa55aa55aa55aa55aa55aa55aa55aa55aa55aa55aa01",
          "03deadbeefcafebabedeadbeefcafebabedeadbeefcafebabe01",
        ],
      },
    ],
  },
  t3_junk_inscription: {
    txid: "t3-junk-inscription",
    vout: [
      {
        value: 0.0001,
        scriptPubKey: {
          asm: "OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG",
          hex: "76a914abcdefabcdefabcdefabcdefabcdefabcdefabcd88ac",
        },
      },
      {
        value: 0,
        scriptPubKey: {
          asm: "OP_RETURN 4a554e4b5f44415441",
          hex: "6a0a4a554e4b5f44415441",
        },
      },
    ],
    witness: [
      {
        stack: [
          // big blob
          "ff".repeat(700),
        ],
      },
    ],
  },
  t3_large_witness: {
    txid: "t3-large-witness",
    vout: [
      {
        value: 0.0002,
        scriptPubKey: {
          asm: "OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG",
          hex: "76a9141234567890abcdef1234567890abcdef1234567888ac",
        },
      },
    ],
    witness: [
      {
        stack: [
          "aa".repeat(600), // large but not huge
          "bb".repeat(300),
        ],
      },
    ],
  },
};

const PRESET_LABELS: Record<TxPresetKey, string> = {
  custom: "Custom (free edit)",
  t1_channel_root: "T1 – L2 channel root style tx",
  t2_anchor_meta: "T2 – anchor metadata / index hints",
  t3_junk_inscription: "T3 – junk / inscription-like payload",
  t3_large_witness: "T3 – large opaque witness blobs",
};

function txToPrettyJson(tx: any): string {
  return JSON.stringify(tx, null, 2);
}

export default function TagEnginePanel() {
  const [policyProfile, setPolicyProfile] =
    useState<PolicyProfile>("neutral");
  const [baseMinFeerate, setBaseMinFeerate] = useState("1.0");
  const [txFeerate, setTxFeerate] = useState("5.0");

  const [arbdaTier, setArbdaTier] = useState<ArbdaTier | null>(null);
  const [summaryText, setSummaryText] = useState<string>(
    "No classification yet. Choose a preset and click “Run Tag Engine”."
  );
  const [tagsText, setTagsText] = useState<string>(
    "No tags yet. Run the engine to see per-region labels."
  );
  const [policyText, setPolicyText] = useState<string>(
    "No policy result yet."
  );
  const [error, setError] = useState<string | null>(null);

  const [preset, setPreset] = useState<TxPresetKey>("t1_channel_root");
  const [txJson, setTxJson] = useState<string>(
    txToPrettyJson(PRESET_TXS["t1_channel_root"])
  );
  const [txJsonError, setTxJsonError] = useState<string | null>(null);

  const humanTier = (t: ArbdaTier | null) => t || "—";

  const handlePresetChange = (value: string) => {
    const key = value as TxPresetKey;
    setPreset(key);
    if (key === "custom") {
      // keep whatever the user has typed
      return;
    }
    const tx = PRESET_TXS[key];
    setTxJson(txToPrettyJson(tx));
    setTxJsonError(null);
  };

  const runEngine = () => {
    try {
      setError(null);
      setTxJsonError(null);

      const base = parseFloat(baseMinFeerate) || 0;
      const fee = parseFloat(txFeerate) || 0;

      let tx: any;

      if (txJson.trim().length > 0) {
        try {
          tx = JSON.parse(txJson);
        } catch (e: any) {
          setTxJsonError(
            "JSON parse error: " + (e?.message || String(e))
          );
          return;
        }
      } else {
        setTxJsonError("No transaction JSON provided.");
        return;
      }

      const engine = new BudsTagEngine(policyProfile);
      const cls: BudsClassification = engine.classify(tx);
      const summary = engine.summarizeTiers(cls);
      const tier = engine.computeArbdaTierFromCounts(summary.counts);
      const policy = engine.computePolicyScore(cls, base, fee);

      setArbdaTier(tier);

      const lines: string[] = [];
      lines.push(`Txid: ${cls.txid}`);
      lines.push(
        `T0: ${summary.counts.T0}, T1: ${summary.counts.T1}, T2: ${summary.counts.T2}, T3: ${summary.counts.T3}`
      );
      lines.push(
        `ARBDA tx tier: ${tier} (any T3 => tx T3 under “guilty until proven innocent”).`
      );
      setSummaryText(lines.join("\n"));

      const tagLines = (cls.tags || []).map((tag) => {
        const labels = (tag.labels || []).join(", ");
        return `${tag.surface} [${tag.start}-${tag.end}] => ${labels}`;
      });
      setTagsText(
        tagLines.length
          ? tagLines.join("\n")
          : "No tags found (transaction appears empty)."
      );

      const policyLines: string[] = [];
      policyLines.push(
        `Profile: ${policyProfile}, base mempool min: ${base.toFixed(
          2
        )} sat/vB`
      );
      policyLines.push(
        `Required feerate: ${policy.required.toFixed(
          2
        )} sat/vB (multiplier = ${policy.mult.toFixed(2)})`
      );
      policyLines.push(
        `Tx feerate: ${fee.toFixed(
          2
        )} sat/vB, effective score: ${policy.score.toFixed(
          2
        )} sat/vB (boost sum = ${policy.boostSum.toFixed(2)})`
      );
      if (policy.score >= policy.required) {
        policyLines.push(
          "✅ Under this policy, this transaction *would* be admitted."
        );
      } else {
        policyLines.push(
          "⚠️ Under this policy, this transaction *fails* the minimum scoring threshold."
        );
      }
      setPolicyText(policyLines.join("\n"));
    } catch (e: any) {
      setError("Tag Engine error: " + (e?.message || String(e)));
      setSummaryText("Engine failed. Check error.");
      setTagsText("Engine failed. Check error.");
      setPolicyText("Engine failed. Check error.");
    }
  };

  return (
    <div className="tagengine-root">
      <h3>BUDS Tag Engine (tx JSON)</h3>
      <p className="tagengine-intro">
        Choose an example transaction preset or use a custom JSON. The engine
        classifies regions into BUDS labels, derives ARBDA tx tier, and
        computes a policy score.
      </p>

      <div className="tagengine-controls">
        <div className="tagengine-row">
          <label>Preset</label>
          <select
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {Object.entries(PRESET_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="tagengine-row">
          <label>Policy profile</label>
          <select
            value={policyProfile}
            onChange={(e) =>
              setPolicyProfile(e.target.value as PolicyProfile)
            }
          >
            <option value="strict">Strict (da.* heavily penalised)</option>
            <option value="neutral">Neutral</option>
            <option value="permissive">
              Permissive (da.* allowed if fees are higher)
            </option>
          </select>
        </div>

        <div className="tagengine-row">
          <label>Base mempool min (sat/vB)</label>
          <input
            type="text"
            value={baseMinFeerate}
            onChange={(e) => setBaseMinFeerate(e.target.value)}
          />
        </div>

        <div className="tagengine-row">
          <label>Tx feerate (sat/vB)</label>
          <input
            type="text"
            value={txFeerate}
            onChange={(e) => setTxFeerate(e.target.value)}
          />
        </div>

        <button type="button" onClick={runEngine}>
          Run Tag Engine
        </button>
      </div>

      <div className="tagengine-json">
        <label>Transaction JSON</label>
        <textarea
          value={txJson}
          onChange={(e) => {
            setTxJson(e.target.value);
            setPreset("custom");
          }}
        />
        {txJsonError && (
          <div className="payloads-error">{txJsonError}</div>
        )}
      </div>

      {error && <div className="payloads-error">{error}</div>}

      <div className="tagengine-summary">
        <div className="tagengine-tier-pill">
          <span className="tagengine-tier-label">ARBDA tx tier</span>
          <span className="tagengine-tier-value">
            {humanTier(arbdaTier)}
          </span>
        </div>

        <div className="tagengine-block">
          <label>Summary</label>
          <pre>{summaryText}</pre>
        </div>

        <div className="tagengine-block">
          <label>Tags</label>
          <pre>{tagsText}</pre>
        </div>

        <div className="tagengine-block">
          <label>Policy result</label>
          <pre>{policyText}</pre>
        </div>
      </div>
    </div>
  );
}
