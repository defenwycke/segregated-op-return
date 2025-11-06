// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/tx_check.h>

#include <consensus/amount.h>
#include <consensus/consensus.h>
#include <consensus/validation.h>
#include <crypto/sha256.h>
#include <primitives/transaction.h>

#include <algorithm>
#include <set>

// segOP: P2SOP script pattern
//
// P2SOP output script (from spec):
//   OP_RETURN 0x23 "SOP" <32-byte commitment>
//
// Hex layout:
//   6a          OP_RETURN
//   23          PUSHDATA(35)
//   53 4f 50    'S' 'O' 'P'
//   <32 bytes>  commitment = SHA256(segop_payload)
//
// Total script length = 1 + 1 + 3 + 32 = 37 bytes.
static constexpr unsigned int P2SOP_SCRIPT_SIZE = 37;
static constexpr unsigned int P2SOP_PUSH_LEN    = 0x23;

// Helper: Try to find exactly one P2SOP output in tx.vout and extract its
// 32-byte commitment into `out_commitment`. Returns true if found, false if
// none or malformed. If more than one matching P2SOP is found, also returns
// false (we require exactly one).
static bool ExtractSegopCommitment(const CTransaction& tx, unsigned char (&out_commitment)[CSHA256::OUTPUT_SIZE])
{
    bool found = false;

    for (const auto& txout : tx.vout) {
        const CScript& script = txout.scriptPubKey;

        // Quick length check
        if (script.size() != P2SOP_SCRIPT_SIZE) continue;

        // Raw bytes: [0] = OP_RETURN, [1] = 0x23, [2..4] = "SOP"
        if (script[0] != OP_RETURN) continue;
        if (static_cast<unsigned char>(script[1]) != P2SOP_PUSH_LEN) continue;
        if (script[2] != 0x53 || script[3] != 0x4f || script[4] != 0x50) continue; // 'S','O','P'

        // If we've already found one P2SOP, having another is invalid.
        if (found) {
            return false;
        }

        // Extract the 32-byte commitment (bytes 5..36)
        std::copy(script.begin() + 5, script.begin() + 5 + CSHA256::OUTPUT_SIZE, out_commitment);
        found = true;
    }

    return found;
}

/**
 * Check basic structural properties of a transaction that do not depend on the
 * UTXO set or chain state.
 *
 * This is where we also enforce segOP's structural consensus rules:
 *   - if a segOP payload is present, its size must not exceed 100,000 bytes
 *   - if a segOP payload is present, there must be exactly one P2SOP output
 *     whose 32-byte commitment equals SHA256(segop_payload)
 */
bool CheckTransaction(const CTransaction& tx, TxValidationState& state)
{
    // Basic checks that don't depend on any context
    if (tx.vin.empty()) {
        return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-vin-empty");
    }
    if (tx.vout.empty()) {
        return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-vout-empty");
    }

    // Basic size limit: the non-witness serialized size times WITNESS_SCALE_FACTOR
    // must not exceed MAX_BLOCK_WEIGHT.
    //
    // Note: TX_NO_WITNESS(tx) *does* include segOP when present, so segOP bytes
    // are already charged at full 4 WU/byte here, matching the segOP spec.
    if (::GetSerializeSize(TX_NO_WITNESS(tx)) * WITNESS_SCALE_FACTOR > MAX_BLOCK_WEIGHT) {
        return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-oversize");
    }

    // segOP structural rules: only apply if a segOP payload is present.
    if (!tx.segop_payload.IsNull()) {
        // 1) Size cap: ≤ 100,000 bytes
        static constexpr unsigned int MAX_SEGOP_PAYLOAD_SIZE = 100000;
        if (tx.segop_payload.data.size() > MAX_SEGOP_PAYLOAD_SIZE) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-segop-toolarge");
        }

        // 2) Extract P2SOP commitment from a dedicated OP_RETURN output.
        unsigned char commitment_script[CSHA256::OUTPUT_SIZE];
        if (!ExtractSegopCommitment(tx, commitment_script)) {
            // Either no P2SOP output or more than one. Both are invalid when
            // a segOP payload is present.
            return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-segop-no-p2sop");
        }

        // 3) Compute SHA256(segop_payload) and compare.
        unsigned char payload_hash[CSHA256::OUTPUT_SIZE];
        CSHA256()
            .Write(tx.segop_payload.data.data(), tx.segop_payload.data.size())
            .Finalize(payload_hash);

        if (!std::equal(std::begin(commitment_script), std::end(commitment_script),
                        std::begin(payload_hash))) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-segop-commitment-mismatch");
        }
    }

    // Check for negative or overflow output values (same style as upstream).
    CAmount nValueOut{0};
    for (const auto& txout : tx.vout) {
        if (!MoneyRange(txout.nValue)) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-vout-negative");
        }

        nValueOut += txout.nValue;

        if (!MoneyRange(nValueOut)) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-vout-toolarge");
        }
    }

    // Check for duplicate inputs.
    std::set<COutPoint> vInOutPoints;
    for (const auto& txin : tx.vin) {
        if (!vInOutPoints.insert(txin.prevout).second) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-inputs-duplicate");
        }
    }

    if (tx.IsCoinBase()) {
        // Coinbase scriptsig size limits.
        if (tx.vin[0].scriptSig.size() < 2 ||
            tx.vin[0].scriptSig.size() > MAX_COINBASE_SCRIPTSIG_SIZE) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-cb-length");
        }
    } else {
        // For non-coinbase transactions, prevouts must not be null.
        for (const auto& txin : tx.vin) {
            if (txin.prevout.IsNull()) {
                return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-prevout-null");
            }
        }
    }

    return true;
}
