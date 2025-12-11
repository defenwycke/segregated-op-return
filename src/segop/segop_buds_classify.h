#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include <segop/segop_extract_surfaces.h>

class CTransaction;

namespace segop {

// Final BUDS classification result for one transaction (segOP-local + ARBDA-style tier).
struct SegopBudsClassification {
    uint8_t tier_code{0xff};           // BUDS T0..T3 as compact code
    std::string tier{"UNSPECIFIED"};   // e.g. "T1", "T2", "T3"

    uint8_t type_code{0xff};           // BUDS type code within the tier
    std::string type{"UNSPECIFIED"};   // e.g. "TEXT_NOTE", etc.

    std::string arbda_tier{"T3"};      // ARBDA style tier string ("T0".."T3")

    bool ambiguous{false};             // Multiple conflicting labels?
    std::vector<std::string> matched_labels; // Debug/inspection: which labels matched.
};

// Classify already-extracted surfaces.
bool ClassifyTransactionBuds(const ExtractedSurfaces& surfaces,
                             SegopBudsClassification& out);

// Convenience wrapper: extract from tx & classify.
bool ClassifyFromTransaction(const CTransaction& tx,
                             SegopBudsClassification& out);

} // namespace segop
