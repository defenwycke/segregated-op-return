#pragma once

#include <vector>

class CTransaction;

namespace segop {

// Where in the tx a given blob came from.
enum class BudsSurface {
    SCRIPT_SIG,
    SCRIPT_PUBKEY,
    WITNESS_STACK,
    WITNESS_SCRIPT,
    SEGOP_TLV,
    OP_RETURN,
    COINBASE,
    UNKNOWN
};

// Collected raw byte surfaces from a tx.
// This is non-consensus helper state for BUDS classification.
struct ExtractedSurfaces {
    std::vector<std::vector<unsigned char>> scriptsig;
    std::vector<std::vector<unsigned char>> scriptpubkey;
    std::vector<std::vector<unsigned char>> witness_stack;
    std::vector<std::vector<unsigned char>> witness_script;
    std::vector<std::vector<unsigned char>> segop_tlv;
    std::vector<std::vector<unsigned char>> op_return;
    std::vector<std::vector<unsigned char>> coinbase;
};

// Extract surfaces from a transaction for BUDS classification.
ExtractedSurfaces ExtractAllSurfaces(const CTransaction& tx);

} // namespace segop
