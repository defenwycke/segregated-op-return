#ifndef BITCOIN_SEGOP_BUDS_REGISTRY_H
#define BITCOIN_SEGOP_BUDS_REGISTRY_H

#include <map>
#include <set>
#include <string>

// Minimal view of a single BUDS label entry from the JSON registry.
struct SegopBudsLabelInfo {
    std::string label;          // e.g. "da.embed_misc"
    std::string description;    // human-readable text
    std::set<std::string> surfaces; // e.g. "op_return", "witness_stack", ...
    std::string suggested_tier; // "T0", "T1", "T2", "T3"
};

// Return a reference to the loaded registry map.
//
// Key is the label string (e.g. "da.embed_misc").
// If loading failed, this may be empty.
const std::map<std::string, SegopBudsLabelInfo>& GetSegopBudsRegistry();

// Convenience lookup by label. Returns nullptr if not found.
const SegopBudsLabelInfo* FindSegopBudsLabel(const std::string& label);

#endif // BITCOIN_SEGOP_BUDS_REGISTRY_H
