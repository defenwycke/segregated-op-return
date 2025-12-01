// Lightweight BUDS v2-style registry for segOP Lab.
// This is NOT the canonical on-chain registry, just a lab view
// to make headers and tiers human-readable.

export type BudsTierId = 0 | 1 | 2 | 3;

export interface BudsTypeEntry {
  typeId: number;
  name: string;
  description: string;
  suggestedAppId?: number;
  suggestedVersion?: number;
  examples?: string[];
}

export interface BudsTierEntry {
  tier: BudsTierId;
  tierName: string;
  tierSummary: string;
  types: BudsTypeEntry[];
}

export const BUDS_REGISTRY: BudsTierEntry[] = [
  {
    tier: 0,
    tierName: "Tier 0 — Consensus / Structural",
    tierSummary:
      "Critical protocol state or consensus-adjacent metadata. Extremely restricted, normally empty for segOP payloads.",
    types: [
      {
        typeId: 0,
        name: "Reserved / none",
        description:
          "No explicit BUDS classification. Should rarely be used; most segOP payloads should be T1–T3.",
      },
    ],
  },
  {
    tier: 1,
    tierName: "Tier 1 — Economic / State Commitments",
    tierSummary:
      "Economic state and L2 commitments that directly affect money or security assumptions.",
    types: [
      {
        typeId: 1,
        name: "L2 / channel commitment root",
        description:
          "Merkle / vector commitment roots for channels, rollups, vaults or other L2 constructions anchored in segOP.",
        suggestedAppId: 1,
        suggestedVersion: 1,
        examples: [
          "Ghost Pay channel set root",
          "Rollup state root",
        ],
      },
      {
        typeId: 2,
        name: "Contract / vault state",
        description:
          "Compact representations of scripted contract state or vault trees.",
        suggestedAppId: 2,
        suggestedVersion: 1,
      },
    ],
  },
  {
    tier: 2,
    tierName: "Tier 2 — Metadata / Indexing / Hints",
    tierSummary:
      "Operational metadata that helps nodes, services and indexers, but is not strictly economic state.",
    types: [
      {
        typeId: 1,
        name: "L2 / anchor metadata",
        description:
          "Metadata around L2 anchors: epoch numbers, chain IDs, rollup names, index pointers.",
        suggestedAppId: 10,
        suggestedVersion: 1,
        examples: ["Ghost Node L2 anchor map"],
      },
      {
        typeId: 2,
        name: "Index / view hints",
        description:
          "Hints for indexes, views, or discovery layers (e.g. wallet discovery, service indexing).",
        suggestedAppId: 11,
        suggestedVersion: 1,
      },
      {
        typeId: 3,
        name: "Policy / relay hints",
        description:
          "Soft policy signals or relay hints that help nodes coordinate behaviour without changing consensus.",
        suggestedAppId: 12,
        suggestedVersion: 1,
      },
    ],
  },
  {
    tier: 3,
    tierName: "Tier 3 — Arbitrary / Bulk Data",
    tierSummary:
      "Arbitrary data and blobs. Subject to the strictest policies and pruning preferences.",
    types: [
      {
        typeId: 1,
        name: "Arbitrary blob",
        description:
          "Unstructured or opaque data that does not present itself as payments or L2 state.",
        suggestedAppId: 100,
        suggestedVersion: 1,
        examples: ["NFT-style metadata", "inscription-style payload"],
      },
      {
        typeId: 2,
        name: "Large opaque witness",
        description:
          "Bulk witness data with no declared structure. Very likely to be treated as spam under stricter policies.",
        suggestedAppId: 101,
        suggestedVersion: 1,
      },
    ],
  },
];
