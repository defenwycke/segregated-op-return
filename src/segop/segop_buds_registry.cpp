#include "segop_buds_registry.h"
#include <cstdint>
#include <unordered_map>

namespace segop {

static const std::vector<SegopBudsLabel> G_BUDS_REGISTRY = {
    // Consensus-critical
    {"consensus.sig", "Signatures required for validation.", {"witness_stack","scriptsig"}, "T0"},
    {"consensus.script", "Executed script regions enforcing spending.", {"scriptsig","witness_script","scriptpubkey"}, "T0"},
    {"consensus.taproot_prog", "Taproot or tapscript programs.", {"witness_script"}, "T0"},

    // Payments / L2 anchors
    {"pay.standard", "Standard payments.", {"scriptpubkey"}, "T1"},
    {"pay.channel_open", "Lightning/L2 channel open.", {"scriptpubkey","witness_script"}, "T1"},
    {"pay.channel_update", "Updates for channel/L2 contracts.", {"witness_stack","witness_script"}, "T1"},
    {"contracts.vault", "Vault or recovery structures.", {"scriptpubkey","witness_script"}, "T1"},
    {"commitment.rollup_root", "Rollup anchor commitments.", {"scriptpubkey","witness_stack","coinbase"}, "T1"},
    {"meta.pool_tag", "Mining pool tags in coinbase.", {"coinbase"}, "T1"},

    // Explicit metadata
    {"da.op_return_embed", "Explicit OP_RETURN metadata.", {"op_return"}, "T2"},
    {"meta.inscription", "Inscription-like metadata.", {"witness_stack","op_return"}, "T2"},
    {"meta.ordinal", "Ordinal/NFT metadata.", {"witness_stack","op_return"}, "T2"},
    {"meta.indexer_hint", "Indexer hints.", {"op_return","scriptpubkey","witness_stack"}, "T2"},
    {"da.embed_misc", "General-purpose embedded metadata.", {"op_return","scriptpubkey","witness_stack"}, "T2"},

    // Arbitrary
    {"da.unknown", "Unclassified data.", {"scriptsig","witness_stack","witness_script","scriptpubkey","op_return","coinbase"}, "T3"},
    {"da.obfuscated", "Large opaque blobs.", {"scriptsig","witness_stack","witness_script","scriptpubkey"}, "T3"},
    {"da.unregistered_vendor", "Vendor-specific non-public data.", {"witness_stack","witness_script","scriptpubkey"}, "T3"}
};

const std::vector<SegopBudsLabel>& GetBudsRegistry() {
    return G_BUDS_REGISTRY;
}

const SegopBudsLabel* FindBudsLabel(const std::string& name) {
    for (const auto& r : G_BUDS_REGISTRY) {
        if (r.label == name) return &r;
    }
    return nullptr;
}

// Convert BUDS tier → numeric ARBDA tier
uint8_t TierStringToCode(const std::string& tier) {
    if (tier == "T0") return 0;
    if (tier == "T1") return 1;
    if (tier == "T2") return 2;
    return 3; // T3 or unknown
}

} // namespace segop
