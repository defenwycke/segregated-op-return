#include <segop/segop_buds_registry.h>

#include <vector>
#include <string>

namespace segop {

static const std::vector<SegopBudsLabelInfo> G_BUDS_REGISTRY = {
    {
        "consensus.sig",
        "Signatures required for transaction validation.",
        {"witness_stack", "scriptsig"},
        "T0"
    },
    {
        "consensus.script",
        "Executed script regions that enforce spending conditions.",
        {"scriptsig", "witness_script", "scriptpubkey"},
        "T0"
    },
    {
        "consensus.taproot_prog",
        "Taproot or tapscript programs used in validation.",
        {"witness_script"},
        "T0"
    },

    {
        "pay.standard",
        "Standard payments and transfers to common scriptpubkey types.",
        {"scriptpubkey"},
        "T1"
    },
    {
        "pay.channel_open",
        "Lightning or L2 channel establishment outputs.",
        {"scriptpubkey", "witness_script"},
        "T1"
    },
    {
        "pay.channel_update",
        "Updates or closes for channel or L2 contract state.",
        {"witness_stack", "witness_script"},
        "T1"
    },
    {
        "contracts.vault",
        "Vault or recovery contract structures.",
        {"scriptpubkey", "witness_script"},
        "T1"
    },
    {
        "commitment.rollup_root",
        "Commitments anchoring L2 or rollup state to Bitcoin.",
        {"scriptpubkey", "witness_stack", "coinbase"},
        "T1"
    },
    {
        "meta.pool_tag",
        "Mining pool identification or metadata in coinbase.",
        {"coinbase"},
        "T1"
    },

    {
        "da.op_return_embed",
        "Explicit metadata embedded using OP_RETURN.",
        {"op_return"},
        "T2"
    },
    {
        "meta.inscription",
        "Known inscription-style payloads or formats.",
        {"witness_stack", "op_return"},
        "T2"
    },
    {
        "meta.ordinal",
        "Ordinal or NFT-related metadata.",
        {"witness_stack", "op_return"},
        "T2"
    },
    {
        "meta.indexer_hint",
        "Optional hints intended for external indexers or apps.",
        {"op_return", "scriptpubkey", "witness_stack"},
        "T2"
    },
    {
        "da.embed_misc",
        "General-purpose embedded metadata not covered by specific labels.",
        {"op_return", "scriptpubkey", "witness_stack"},
        "T2"
    },

    {
        "da.unknown",
        "Unclassified data that does not match any known pattern.",
        {"scriptsig", "witness_stack", "witness_script", "scriptpubkey", "op_return", "coinbase"},
        "T3"
    },
    {
        "da.obfuscated",
        "Large, opaque, or intentionally hidden data blobs.",
        {"scriptsig", "witness_stack", "witness_script", "scriptpubkey"},
        "T3"
    },
    {
        "da.unregistered_vendor",
        "Structured vendor-specific data for which no public label exists.",
        {"witness_stack", "witness_script", "scriptpubkey"},
        "T3"
    }
};

const std::vector<SegopBudsLabelInfo>& GetSegopBudsRegistry()
{
    return G_BUDS_REGISTRY;
}

} // namespace segop
