import "./SegopRegistryCard.css";

type SegopRegistryItem = {
  code: string;
  name: string;
  scope: string;
  notes: string;
};

const SEGOP_ITEMS: SegopRegistryItem[] = [
  {
    code: "0xF0",
    name: "BUDS header (lab format)",
    scope: "Required header",
    notes:
      "Tier, type, app-id, version. Exactly 6 bytes of value in this Lab: T | Type | AppId (u16) | Version (u16).",
  },
  {
    code: "0x01",
    name: "TEXT payload",
    scope: "Tier 2 / Tier 3",
    notes:
      "UTF-8 text payload used for small human-readable notes, labels, hints.",
  },
  {
    code: "0x02",
    name: "JSON payload",
    scope: "Tier 2",
    notes:
      "Structured JSON for index metadata, anchors or L2 state descriptions.",
  },
  {
    code: "0x03",
    name: "BLOB payload",
    scope: "Tier 3",
    notes:
      "Opaque binary used for arbitrary higher-volume data. May be pruned earlier under strict policies.",
  },
  {
    code: "0x10–0x1F",
    name: "App-specific TLVs",
    scope: "App / protocol",
    notes:
      "Reserved range for app/protocol-specific TLVs in Lab demos. Mapped via BUDS app-id + version.",
  },
];

export default function SegopRegistryCard() {
  return (
    <div className="segreg-root">
      <table className="segreg-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>Scope</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {SEGOP_ITEMS.map((item) => (
            <tr key={item.code}>
              <td className="segreg-code">{item.code}</td>
              <td>{item.name}</td>
              <td>{item.scope}</td>
              <td className="segreg-notes">{item.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="segreg-footnote">
        These codes are Lab-level. A production segOP registry would live in
        a dedicated TLV registry document.
      </p>
    </div>
  );
}
