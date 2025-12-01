// BUDS Tag Engine (segOP Lab)
// ---------------------------
// Classifies scripts & witness into BUDS-style labels,
// derives ARBDA tx tier (T0–T3), and computes policy score.

export type ArbdaTier = "T0" | "T1" | "T2" | "T3";

export interface BudsTagRegion {
  surface: string; // e.g. "scriptpubkey[0]"
  start: number;   // byte offset
  end: number;     // byte length
  labels: string[];
}

export interface BudsClassification {
  txid: string;
  tags: BudsTagRegion[];
}

export interface TierSummary {
  tiersPresent: ArbdaTier[];
  counts: Record<ArbdaTier, number>;
}

export interface PolicyEntry {
  minMult: number;
  boost: number;
}

export interface PolicyTable {
  [label: string]: PolicyEntry;
}

export interface PolicyScoreResult {
  required: number; // required feerate (sat/vB)
  score: number;    // effective score (sat/vB)
  mult: number;     // max minMult from labels
  boostSum: number; // sum of boosts (clamped)
  summary: TierSummary;
}

export default class BudsTagEngine {
  largeBlobThreshold: number;
  policyProfile: "strict" | "neutral" | "permissive";

  constructor(profile: "strict" | "neutral" | "permissive" = "neutral") {
    this.largeBlobThreshold = 512; // bytes
    this.policyProfile = profile;
  }

  setPolicyProfile(profile: string) {
    if (
      profile === "strict" ||
      profile === "neutral" ||
      profile === "permissive"
    ) {
      this.policyProfile = profile;
    } else {
      this.policyProfile = "neutral";
    }
  }

  // --- small helpers ---

  private hexByteLen(hex?: string): number {
    return Math.floor(((hex || "").length) / 2);
  }

  private hexStartsWith(hex: string | undefined, prefix: string): boolean {
    return (hex || "").toLowerCase().startsWith(prefix.toLowerCase());
  }

  private hexEndsWith(hex: string | undefined, suffix: string): boolean {
    hex = (hex || "").toLowerCase();
    suffix = suffix.toLowerCase();
    if (hex.length < suffix.length) return false;
    return hex.slice(-suffix.length) === suffix;
  }

  // --- script recognition ---

  private isLikelyOpReturn(spk: { asm?: string; hex?: string }): boolean {
    if (spk.asm && spk.asm.startsWith("OP_RETURN")) return true;
    if (this.hexStartsWith(spk.hex, "6a")) return true;
    return false;
  }

  // P2PKH: OP_DUP OP_HASH160 <20B> OP_EQUALVERIFY OP_CHECKSIG
  private isLikelyP2PKH(spk: { asm?: string; hex?: string }): boolean {
    const hex = spk.hex || "";
    if (hex.length !== 50) return false; // 25 bytes
    if (!this.hexStartsWith(hex, "76a914")) return false;
    if (!this.hexEndsWith(hex, "88ac")) return false;
    return true;
  }

  // --- classification ---

  /**
   * classify(tx)
   *
   * tx JSON shape:
   * {
   *   txid: string,
   *   vout: [
   *     { value: number, scriptPubKey: { asm: string, hex: string } },
   *     ...
   *   ],
   *   witness: [
   *     { stack: [hex, hex, ...] },
   *     ...
   *   ]
   * }
   */
  classify(tx: any): BudsClassification {
    const tags: BudsTagRegion[] = [];

    // outputs
    (tx.vout || []).forEach((out: any, idx: number) => {
      const spk = out.scriptPubKey || { asm: "", hex: "" };
      const surface = `scriptpubkey[${idx}]`;
      const byteLen = this.hexByteLen(spk.hex);
      const labels: string[] = [];

      if (this.isLikelyOpReturn(spk)) {
        labels.push("da.op_return_embed");
      } else if (this.isLikelyP2PKH(spk)) {
        labels.push("pay.standard");
      } else {
        // TODO: P2WPKH, P2TR, multisig, etc.
        labels.push("pay.standard");
      }

      tags.push({
        surface,
        start: 0,
        end: byteLen,
        labels,
      });
    });

    // witness
    (tx.witness || []).forEach((wit: any, vinIdx: number) => {
      (wit.stack || []).forEach((itemHex: string, stackIdx: number) => {
        const byteLen = this.hexByteLen(itemHex);
        const surface = `witness.stack[${vinIdx}:${stackIdx}]`;
        const labels: string[] = [];

        if (byteLen > this.largeBlobThreshold) {
          labels.push("da.obfuscated");
        } else {
          labels.push("da.unknown");
        }

        tags.push({
          surface,
          start: 0,
          end: byteLen,
          labels,
        });
      });
    });

    return {
      txid: tx.txid || "<no-txid>",
      tags,
    };
  }

  // --- tiers ---

  private getTierForLabel(label: string | undefined): ArbdaTier {
    if (!label) return "T3";

    if (label.startsWith("consensus.")) return "T0";

    if (
      label.startsWith("pay.") ||
      label.startsWith("commitment.") ||
      label.startsWith("contracts.")
    ) {
      return "T1";
    }

    if (
      label.startsWith("meta.") ||
      label.startsWith("index.") ||
      label.startsWith("signals.") ||
      label === "da.op_return_embed"
    ) {
      return "T2";
    }

    return "T3";
  }

  summarizeTiers(classification: BudsClassification): TierSummary {
    const tiersPresent = new Set<ArbdaTier>();
    const counts: Record<ArbdaTier, number> = {
      T0: 0,
      T1: 0,
      T2: 0,
      T3: 0,
    };

    (classification.tags || []).forEach((tag) => {
      (tag.labels || []).forEach((label) => {
        const tier = this.getTierForLabel(label);
        tiersPresent.add(tier);
        counts[tier] += 1;
      });
    });

    return {
      tiersPresent: Array.from(tiersPresent).sort() as ArbdaTier[],
      counts,
    };
  }

  computeArbdaTierFromCounts(counts: Record<ArbdaTier, number>): ArbdaTier {
    if (counts.T3 > 0) return "T3";
    if (counts.T2 > 0) return "T2";
    if (counts.T1 > 0) return "T1";
    return "T0";
  }

  // --- policy profiles & scoring ---

  private getPolicyTableForProfile(
    profile?: string
  ): PolicyTable {
    const p =
      (profile || this.policyProfile) as "strict" | "neutral" | "permissive";

    if (p === "strict") {
      return {
        "da.obfuscated": { minMult: 4.0, boost: -0.7 },
        "da.unknown": { minMult: 3.0, boost: -0.4 },
        "da.op_return_embed": { minMult: 2.0, boost: -0.2 },
        "pay.standard": { minMult: 1.0, boost: 0.0 },
        "pay.channel_open": { minMult: 1.0, boost: 0.2 },
      };
    }

    if (p === "permissive") {
      return {
        "da.obfuscated": { minMult: 2.0, boost: -0.3 },
        "da.unknown": { minMult: 1.5, boost: -0.1 },
        "da.op_return_embed": { minMult: 1.2, boost: -0.05 },
        "pay.standard": { minMult: 1.0, boost: 0.0 },
        "pay.channel_open": { minMult: 1.0, boost: 0.1 },
      };
    }

    // neutral (default)
    return {
      "da.obfuscated": { minMult: 3.0, boost: -0.5 },
      "da.unknown": { minMult: 2.0, boost: -0.3 },
      "da.op_return_embed": { minMult: 1.5, boost: -0.1 },
      "pay.standard": { minMult: 1.0, boost: 0.0 },
      "pay.channel_open": { minMult: 1.0, boost: 0.1 },
    };
  }

  private getPolicyForLabel(label: string): PolicyEntry {
    const table = this.getPolicyTableForProfile();
    return (
      table[label] || {
        minMult: 1.0,
        boost: 0.0,
      }
    );
  }

  computePolicyScore(
    classification: BudsClassification,
    baseMinFeerate: number,
    txFeerate: number
  ): PolicyScoreResult {
    const summary = this.summarizeTiers(classification);

    let mult = 1.0;
    let boostSum = 0.0;
    const seen = new Set<string>();

    (classification.tags || []).forEach((tag) => {
      (tag.labels || []).forEach((label) => {
        const policy = this.getPolicyForLabel(label);
        mult = Math.max(mult, policy.minMult);
        if (!seen.has(label)) {
          seen.add(label);
          boostSum += policy.boost;
        }
      });
    });

    // clamp boost
    boostSum = Math.max(-0.9, Math.min(boostSum, 1.0));

    const required = baseMinFeerate * mult;
    const score = txFeerate * (1 + boostSum);

    return {
      required,
      score,
      mult,
      boostSum,
      summary,
    };
  }
}
