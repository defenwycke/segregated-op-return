#include <segop/segop_buds_classify.h>

#include <segop/segop.h>
#include <segop/segop_buds_registry.h>

#include <primitives/transaction.h>
#include <script/script.h>

namespace segop {

/** Map T0/T1/T2/T3 string → canonical code. */
static uint8_t TierCodeFromString(const std::string& t)
{
    if (t == "T0") return 0x00;
    if (t == "T1") return 0x01;
    if (t == "T2") return 0x02;
    if (t == "T3") return 0x03;
    return 0xff;
}

/** Apply registry tier into a SegopBudsResult. */
static void ApplyTierFromLabel(const SegopBudsLabelInfo& info, SegopBudsResult& out)
{
    out.buds_tier      = info.suggested_tier;
    out.buds_tier_code = TierCodeFromString(info.suggested_tier);

    // For the ARBDA summary, we currently treat suggested_tier as the ARBDA tier.
    // This can be refined later if ARBDA diverges from suggested_tier.
    out.arbda_tier = info.suggested_tier;
}

/** Find a registry entry by exact label string (e.g. "pay.standard"). */
static const SegopBudsLabelInfo* FindLabel(const std::string& label)
{
    const auto& reg = GetSegopBudsRegistry();

    auto it = reg.find(label);
    if (it == reg.end()) {
        return nullptr;
    }
    return &it->second;
}

/** Initialise a conservative "unknown" / T3 result. */
static SegopBudsResult MakeDefaultResult()
{
    SegopBudsResult res;
    res.buds_tier_code = 0xff;
    res.buds_tier      = "UNSPECIFIED";
    res.buds_type_code = 0xff;
    res.buds_type      = "UNSPECIFIED";
    res.arbda_tier     = "T3";
    // We consider "unknown" data to be T3 by default.
    res.labels.push_back("da.unknown");
    return res;
}

SegopBudsResult ClassifyTransactionWithBUDS(const CTransaction& tx,
                                            const CSegopPayload* segop_payload)
{
    SegopBudsResult res = MakeDefaultResult();

    // --- 1) Detect surfaces present in this tx ------------------------------

    const bool has_segop_lane = (segop_payload != nullptr) && !segop_payload->data.empty();

    bool has_nontrivial_op_return = false;
    bool has_spendable_outputs    = false;

    for (const auto& out : tx.vout) {
        const CScript& spk = out.scriptPubKey;

        if (spk.IsUnspendable() && !spk.empty() && spk[0] == OP_RETURN) {
            // Treat any non-empty OP_RETURN as explicit embedded metadata.
            if (spk.size() > 1) has_nontrivial_op_return = true;
        } else {
            // Anything else we conservatively treat as "spendable" (payments / contracts).
            has_spendable_outputs = true;
        }
    }

    // --- 2) Pure consensus / payment only? ---------------------------------
    //
    // Heuristic:
    //  - If there is no segOP lane and no non-trivial OP_RETURN,
    //    we classify this as "pay.standard" → T1.
    // This matches the registry entry:
    //   "label": "pay.standard", suggested_tier: "T1"
    //
    if (!has_segop_lane && !has_nontrivial_op_return) {
        if (const auto* info = FindLabel("pay.standard")) {
            ApplyTierFromLabel(*info, res);
            res.labels.clear();
            res.labels.push_back(info->label);
        } else {
            // Fallback if registry somehow missing the label.
            res.buds_tier_code = 0x01;
            res.buds_tier      = "T1";
            res.arbda_tier     = "T1";
            res.labels.clear();
            res.labels.push_back("pay.standard");
        }

        // Type-code mapping is engine-internal; 0x00 meaning "plain payment".
        res.buds_type_code = 0x00;
        res.buds_type      = "PAY_STANDARD";
        return res;
    }

    // --- 3) Embedded metadata via segOP lane or OP_RETURN ------------------
    //
    // For now, we treat all segOP lane content and explicit OP_RETURN payloads
    // as "embedded metadata" (da.embed_misc).  This is conservative and
    // consistent with BUDS: it's clearly non-consensus data, not bare payment.
    //
    // Further refinement (e.g. distinguishing inscriptions, rollup roots, etc.)
    // is layered on top of this by more detailed pattern-matching in future.
    //
    if (has_segop_lane || has_nontrivial_op_return) {
        if (const auto* info = FindLabel("da.embed_misc")) {
            ApplyTierFromLabel(*info, res);
            res.labels.clear();
            res.labels.push_back(info->label);
        } else {
            // Fallback if registry label missing.
            res.buds_tier_code = 0x02;
            res.buds_tier      = "T2";
            res.arbda_tier     = "T2";
            res.labels.clear();
            res.labels.push_back("da.embed_misc");
        }

        if (has_nontrivial_op_return) {
            // Also mark that we have explicit OP_RETURN metadata.
            res.labels.push_back("da.op_return_embed");
        }

        // buds_type_code/type are engine-defined; here we map segOP/OP_RETURN
        // embedded metadata to a generic type.
        res.buds_type_code = 0x01;
        res.buds_type      = "EMBED_MISC";

        return res;
    }

    // --- 4) Fallback: unknown / T3 -----------------------------------------
    //
    // If we reach here, everything is weird enough that we keep the default
    // "da.unknown" classification and T3 ARBDA tier.
    //
    return res;
}

} // namespace segop
