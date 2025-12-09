#ifndef BITCOIN_SEGOP_BUDS_CLASSIFY_H
#define BITCOIN_SEGOP_BUDS_CLASSIFY_H

#include <cstdint>
#include <string>
#include <vector>

class CTransaction;
class CSegopPayload;

namespace segop {

/** Result of BUDS classification for a single transaction. */
struct SegopBudsResult {
    uint8_t buds_tier_code;   // 0x00..0x03, or 0xff when unspecified
    std::string buds_tier;    // "T0","T1","T2","T3","UNSPECIFIED"

    uint8_t buds_type_code;   // arbitrary type code (registry / engine defined), or 0xff
    std::string buds_type;    // e.g. "PAY_STANDARD","EMBED_MISC","UNKNOWN"

    std::string arbda_tier;   // "T0","T1","T2","T3"

    // Labels matched from the registry for this tx (e.g. "pay.standard", "da.embed_misc")
    std::vector<std::string> labels;
};

/**
 * BUDS classifier entry point for segOP.
 *
 * - Looks at the full CTransaction (all outputs, and segOP lane if present).
 * - Uses the embedded BUDS v2 registry for label → tier mapping.
 * - Returns a conservative classification; can be refined over time
 *   without changing this public interface.
 */
SegopBudsResult ClassifyTransactionWithBUDS(const CTransaction& tx,
                                            const CSegopPayload* segop_payload);

} // namespace segop

#endif // BITCOIN_SEGOP_BUDS_CLASSIFY_H
