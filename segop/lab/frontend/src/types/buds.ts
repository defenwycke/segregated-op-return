// Basic BUDS v2 types for segOP Lab.
//
// NOTE: Codes and names here are placeholders / examples.
// You can change codes, names and descriptions to exactly
// match your BUDS v2 spec once you lock it.

export type BudsTier = 0 | 1 | 2 | 3;

export interface BudsTypeDef {
  code: number;          // numeric type code (1..255 for now)
  name: string;          // short label
  description: string;   // human-readable
  defaultTier: BudsTier; // suggested tier
  isCriticalInfra: boolean; // e.g. L1/L2 anchors vs metadata
}

export const BUDS_TYPES: BudsTypeDef[] = [
  {
    code: 1,
    name: "L1-infra-anchor",
    description: "Critical L1 infrastructure / consensus-adjacent anchor",
    defaultTier: 0,
    isCriticalInfra: true,
  },
  {
    code: 2,
    name: "L2-state-anchor",
    description: "Rollup / channel / sidechain state commitment",
    defaultTier: 1,
    isCriticalInfra: true,
  },
  {
    code: 3,
    name: "Service-metadata",
    description: "Service-level metadata (indexes, wallets, explorers, etc.)",
    defaultTier: 2,
    isCriticalInfra: false,
  },
  {
    code: 4,
    name: "User-metadata",
    description: "End-user metadata / arbitrary blobs / art / junk",
    defaultTier: 3,
    isCriticalInfra: false,
  },
  // Add more rows here to mirror the full BUDS v2 registry
];

export function getBudsTypeByCode(code: number): BudsTypeDef | undefined {
  return BUDS_TYPES.find((t) => t.code === code);
}

export interface BudsTag {
  tier: BudsTier;
  typeCode: number;
  subtypeCode?: number;
  appId?: string;
  version?: string;
}
