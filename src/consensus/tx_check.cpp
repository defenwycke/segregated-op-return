// Copyright (c) 2025 - Defenwycke - segOP
// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/tx_check.h>

#include <consensus/amount.h>
#include <consensus/consensus.h>
#include <consensus/validation.h>
#include <primitives/transaction.h>

#include <algorithm>
#include <set>

// segOP helpers (CSegopPayload, SegopIsValidTLV, BuildSegopCommitmentBlob)
#include <segop/segop.h>

/**
 * segOP: P2SOP script pattern and coupling rules
 *
 * Spec (high level):
 *
 *  - If a segOP payload is present:
 *      * There MUST be exactly one P2SOP output.
 *      * That P2SOP output MUST commit to the segOP payload using:
 *
 *          segop_commitment = TAGGED_HASH("segop:commitment", segop_payload_bytes)
 *          P2SOP_blob       = "P2SOP" || segop_commitment
 *
 *        and the script is:
 *
 *          scriptPubKey = OP_RETURN <len = P2SOP_blob.size()> <P2SOP_blob bytes>
 *
 *  - If no segOP payload is present:
 *      * There MUST NOT be any P2SOP output.
 *
 *  This file enforces that structural coupling at consensus.
 */

// -----------------------------------------------------------------------------
// Helpers for detecting and matching P2SOP outputs
// -----------------------------------------------------------------------------

/** Return true if the given scriptPubKey looks like *any* P2SOP output
 *  (regardless of which commitment it carries).
 *
 *  Format we match:
 *      OP_RETURN <len> "P2SOP" ...
 *  where:
 *      - len >= 5 (enough to hold "P2SOP")
 */
static bool ScriptHasP2SOPPrefix(const CScript& script)
{
    if (script.size() < 1 + 1 + 5) return false; // OP_RETURN + len + "P2SOP"

    if (script[0] != OP_RETURN) return false;
    const unsigned char push_len = static_cast<unsigned char>(script[1]);

    // Need at least 5 bytes of data for "P2SOP"
    if (push_len < 5) return false;

    // script structure: OP_RETURN [len] [len bytes of data...]
    // We only check the first 5 data bytes for the ASCII tag.
    if (script[2] != 'P') return false;
    if (script[3] != '2') return false;
    if (script[4] != 'S') return false;
    if (script[5] != 'O') return false;
    if (script[6] != 'P') return false;

    return true;
}

/** Return true if the transaction has *any* P2SOP-looking output. */
static bool TxHasAnyP2SOP(const CTransaction& tx)
{
    for (const auto& txout : tx.vout) {
        if (ScriptHasP2SOPPrefix(txout.scriptPubKey)) {
            return true;
        }
    }
    return false;
}

/**
 * Check that the transaction has *exactly one* P2SOP output whose data bytes
 * match the expected P2SOP blob exactly:
 *
 *   expected_blob = "P2SOP" || TAGGED_HASH("segop:commitment", payload)
 *
 * The script must be:
 *
 *   OP_RETURN <len = expected_blob.size()> <expected_blob bytes...>
 *
 * Returns true iff:
 *   - there is at least one P2SOP-looking output, and
 *   - exactly one of them has data == expected_blob, and
 *   - there are no *other* P2SOP-looking outputs with different data.
 */
static bool TxHasExactlyOneMatchingP2SOP(const CTransaction& tx,
                                         const std::vector<unsigned char>& expected_blob)
{
    if (expected_blob.size() < 5) {
        // Should never happen; P2SOP tag alone is 5 bytes.
        return false;
    }

    int match_count = 0;

    for (const auto& txout : tx.vout) {
        const CScript& script = txout.scriptPubKey;

        // Quickly skip anything that doesn't look like P2SOP at all.
        if (!ScriptHasP2SOPPrefix(script)) {
            continue;
        }

        // script layout: [0] = OP_RETURN
        //                [1] = push_len
        //                [2..] = data bytes ("P2SOP" || commitment)
        const unsigned char push_len = static_cast<unsigned char>(script[1]);

        // Data length must match expected_blob size.
        if (push_len != expected_blob.size()) {
            // This is a P2SOP-looking output, but with the wrong length.
            // That is not allowed when segOP is present.
            return false;
        }

        if (script.size() != 1 + 1 + expected_blob.size()) {
            // Malformed script length relative to push_len; also invalid.
            return false;
        }

        // Compare the data bytes directly to expected_blob.
        const bool equal = std::equal(
            expected_blob.begin(),
            expected_blob.end(),
            script.begin() + 2
        );

        if (!equal) {
            // A P2SOP-looking output exists but commits to the wrong blob.
            // Invalid for segOP-bearing transactions.
            return false;
        }

        // Found one correct P2SOP.
        match_count++;
        if (match_count > 1) {
            // More than one P2SOP with the correct blob is not allowed.
            return false;
        }
    }

    return match_count == 1;
}

// -----------------------------------------------------------------------------
// Main structural transaction checks (with segOP rules)
// -----------------------------------------------------------------------------

/**
 * Check basic structural properties of a transaction that do not depend on the
 * UTXO set or chain state.
 *
 * This is where we also enforce segOP's structural consensus rules:
 *   - if a segOP payload is present:
 *       * version must match CSegopPayload::SEGOP_VERSION
 *       * size must not exceed the spec cap
 *       * TLV structure must be valid
 *       * there must be exactly one P2SOP output whose data matches
 *         "P2SOP" || TAGGED_HASH("segop:commitment", segop_payload)
 *
 *   - if NO segOP payload is present:
 *       * there must be NO P2SOP outputs at all.
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
    // Note: TX_NO_WITNESS(tx) does *not* include segOP; segOP bytes are carried
    // in the extended lane and pay full weight via the GetTransactionWeight()
    // logic (see segOP spec: 4 WU/byte, no discount).
    if (::GetSerializeSize(TX_NO_WITNESS(tx)) * WITNESS_SCALE_FACTOR > MAX_BLOCK_WEIGHT) {
        return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-oversize");
    }

    const bool has_segop = !tx.segop_payload.IsNull();

    if (has_segop) {
        // ---------------------------------------------------------------------
        // segOP present: enforce payload, TLV, and P2SOP coupling.
        // ---------------------------------------------------------------------

        // Version enforcement (segOP v1 only for now).
        if (tx.segop_payload.version != CSegopPayload::SEGOP_VERSION) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-segop-version");
        }

        // 1) Size cap (prototype / spec value: 64 KiB).
        static constexpr unsigned int MAX_SEGOP_PAYLOAD_SIZE = 64000;
        if (tx.segop_payload.data.size() > MAX_SEGOP_PAYLOAD_SIZE) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-segop-toolarge");
        }

        // 2) TLV well-formedness: [type(1)][len(1)][value(len)] repeated; exact end.
        if (!SegopIsValidTLV(tx.segop_payload.data)) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-segop-tlv");
        }

        // 3) Build the expected P2SOP blob according to the spec:
        //      P2SOP_blob = "P2SOP" || TAGGED_HASH("segop:commitment", payload)
        //
        //    and require the transaction to contain *exactly one* OP_RETURN
        //    output whose pushed data exactly equals this blob, with no
        //    additional P2SOP-looking outputs.
        const std::vector<unsigned char> expected_p2sop_blob =
            BuildSegopCommitmentBlob(tx.segop_payload.data);

        if (!TxHasExactlyOneMatchingP2SOP(tx, expected_p2sop_blob)) {
            // Either:
            //  - no P2SOP found,
            //  - more than one P2SOP,
            //  - or a P2SOP is present but its commitment does not match.
            return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-segop-no-p2sop");
        }
    } else {
        // ---------------------------------------------------------------------
        // No segOP payload: P2SOP must not be present at all.
        // ---------------------------------------------------------------------
        if (TxHasAnyP2SOP(tx)) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-txns-segop-p2sop-without-segop");
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
