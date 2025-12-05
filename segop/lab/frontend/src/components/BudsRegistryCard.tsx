import { useState } from "react";
import { BUDS_REGISTRY } from "../buds/registry";
import type { BudsTierEntry, BudsTypeEntry } from "../buds/registry";
import { useLabStore } from "../store/labStore";
import "./BudsRegistryCard.css";

function TypeRow({
  tier,
  type,
  onApply,
}: {
  tier: number;
  type: BudsTypeEntry;
  onApply: () => void;
}) {
  return (
    <div className="budsregistry-type-row">
      <div className="budsregistry-type-main">
        <div className="budsregistry-type-label">
          <span className="budsregistry-type-id">
            T{tier}.{type.typeId}
          </span>
          <span className="budsregistry-type-name">{type.name}</span>
        </div>
        <div className="budsregistry-type-desc">{type.description}</div>
        {type.examples && type.examples.length > 0 && (
          <div className="budsregistry-type-examples">
            <span>Examples: </span>
            {type.examples.join(", ")}
          </div>
        )}
      </div>

      <div className="budsregistry-type-meta">
        <div>
          <span className="budsregistry-meta-label">Suggested App ID:</span>{" "}
          <span className="budsregistry-meta-value">
            {type.suggestedAppId !== undefined ? type.suggestedAppId : "—"}
          </span>
        </div>
        <div>
          <span className="budsregistry-meta-label">Suggested Version:</span>{" "}
          <span className="budsregistry-meta-value">
            {type.suggestedVersion !== undefined ? type.suggestedVersion : "—"}
          </span>
        </div>
        <div className="budsregistry-meta-note">
          Use these values as defaults in the Header Builder when modelling this
          type.
        </div>
        <button
          type="button"
          className="budsregistry-apply"
          onClick={onApply}
        >
          Apply to header builder
        </button>
      </div>
    </div>
  );
}

function TierCard({ tier }: { tier: BudsTierEntry }) {
  // 🔒 start collapsed for all tiers
  const [expanded, setExpanded] = useState<boolean>(false);
  const setHeaderPreset = useLabStore((s) => s.setHeaderPreset);

  // choose pill class based on tier number (T0–T3)
  const pillClass = `budsregistry-tier-pill budsregistry-tier-pill-t${tier.tier}`;

  return (
    <div className="budsregistry-tier">
      <div
        className="budsregistry-tier-header"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="budsregistry-tier-title">
          <span className={pillClass}>T{tier.tier}</span>
          <span>{tier.tierName}</span>
        </div>
        <span className="budsregistry-toggle">{expanded ? "−" : "+"}</span>
      </div>

      <p className="budsregistry-tier-summary">{tier.tierSummary}</p>

      {expanded && (
        <div className="budsregistry-type-list">
          {tier.types.map((t) => (
            <TypeRow
              key={t.typeId}
              tier={tier.tier}
              type={t}
              onApply={() =>
                setHeaderPreset({
                  tier: tier.tier,
                  typeId: t.typeId,
                  appId: t.suggestedAppId ?? 0,
                  version: t.suggestedVersion ?? 1,
                  notes: `${tier.tierName}: ${t.name} — ${t.description}`,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BudsRegistryCard() {
  return (
    <div className="budsregistry-root">
      <h3>BUDS Registry (lab view)</h3>
      <p className="budsregistry-intro">
        Tier → Type overview of BUDS entries used in segOP Lab. This is a
        lab-facing registry snapshot to make tiers and type IDs human readable.
        For canonical definitions, see the BUDS spec / registry repo.
      </p>

      <div className="budsregistry-grid">
        {BUDS_REGISTRY.map((tier) => (
          <TierCard key={tier.tier} tier={tier} />
        ))}
      </div>
    </div>
  );
}
