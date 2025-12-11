#include <segop/segop_extract_surfaces.h>

#include <primitives/transaction.h>
#include <script/script.h>

namespace segop {

ExtractedSurfaces ExtractAllSurfaces(const CTransaction& tx)
{
    ExtractedSurfaces out;

    // segOP lane
    if (!tx.segop_payload.IsNull() && !tx.segop_payload.data.empty()) {
        out.segop_tlv.push_back(tx.segop_payload.data);
    }

    // scriptsig surfaces (inputs)
    for (const CTxIn& in : tx.vin) {
        if (!in.scriptSig.empty()) {
            std::vector<unsigned char> bytes(in.scriptSig.begin(), in.scriptSig.end());
            out.scriptsig.push_back(std::move(bytes));
        }
    }

    // witness stack surfaces (inputs)
    for (const CTxIn& in : tx.vin) {
        for (const auto& stack_item : in.scriptWitness.stack) {
            if (!stack_item.empty()) {
                out.witness_stack.push_back(stack_item);
            }
        }
    }

    // scriptpubkey (including OP_RETURN) surfaces (outputs)
    for (const CTxOut& outp : tx.vout) {
        if (!outp.scriptPubKey.empty()) {
            std::vector<unsigned char> bytes(outp.scriptPubKey.begin(), outp.scriptPubKey.end());
            // All scriptpubkeys
            out.scriptpubkey.push_back(bytes);

            // Crude OP_RETURN detection
            if (outp.scriptPubKey[0] == OP_RETURN) {
                out.op_return.push_back(std::move(bytes));
            }
        }
    }

    // coinbase surface
    if (tx.IsCoinBase() && !tx.vin.empty()) {
        const CScript& cb = tx.vin[0].scriptSig;
        if (!cb.empty()) {
            std::vector<unsigned char> bytes(cb.begin(), cb.end());
            out.coinbase.push_back(std::move(bytes));
        }
    }

    return out;
}

} // namespace segop
