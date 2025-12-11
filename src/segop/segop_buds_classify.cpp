#include <segop/segop_buds_classify.h>
#include <segop/segop_buds_registry.h>
#include <segop/segop_extract_surfaces.h>

#include <primitives/transaction.h>

namespace segop {

// Map registry suggested_tier ("T0".."T3") into ARBDA string (for now 1:1).
static std::string SuggestedTierToArbda(const std::string& t)
{
    if (t == "T0") return "T0";
    if (t == "T1") return "T1";
    if (t == "T2") return "T2";
    return "T3";
}

bool ClassifyTransactionBuds(const ExtractedSurfaces& surfaces,
                             SegopBudsClassification& out)
{
    out = SegopBudsClassification{};

    const auto& registry = GetBudsRegistry();

    // For this first pass we do something conservative but real:
    //
    //  * If we see any segOP TLV data, treat it as generic embedded metadata
    //    and map it to the label "da.embed_misc" if present in the registry.
    //  * Otherwise we fall back to T3 / unclassified.
    const SegopBudsLabel* misc = FindBudsLabel("da.embed_misc");
    if (!surfaces.segop_tlv.empty() && misc != nullptr) {
        out.matched_labels.push_back(misc->label);

        out.tier       = misc->suggested_tier;             // "T2"
        out.tier_code  = TierStringToCode(misc->suggested_tier);
        out.type       = "UNSPECIFIED";
        out.type_code  = 0xff;

        out.arbda_tier = SuggestedTierToArbda(misc->suggested_tier);
        out.ambiguous  = false;
        return true;
    }

    // Default: nothing we know how to classify yet → T3 arbitrary data.
    out.tier       = "T3";
    out.tier_code  = TierStringToCode("T3");
    out.type       = "UNSPECIFIED";
    out.type_code  = 0xff;
    out.arbda_tier = "T3";
    out.ambiguous  = false;
    return false;
}

bool ClassifyFromTransaction(const CTransaction& tx,
                             SegopBudsClassification& out)
{
    ExtractedSurfaces surfaces = ExtractAllSurfaces(tx);
    return ClassifyTransactionBuds(surfaces, out);
}

} // namespace segop
