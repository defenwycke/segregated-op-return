// Copyright (c) 2025 Defenwycke - segOP
// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <primitives/transaction.h>

#include <consensus/amount.h>
#include <crypto/hex_base.h>
#include <hash.h>
#include <primitives/transaction_identifier.h>
#include <script/script.h>
#include <serialize.h>
#include <tinyformat.h>
#include <uint256.h>

#include <algorithm>
#include <cassert>
#include <stdexcept>

/** COutPoint *****************************************************************/

std::string COutPoint::ToString() const
{
    return strprintf("COutPoint(%s, %u)", hash.ToString().substr(0, 10), n);
}

/** CTxIn *********************************************************************/

CTxIn::CTxIn(COutPoint prevoutIn, CScript scriptSigIn, uint32_t nSequenceIn)
{
    prevout = prevoutIn;
    scriptSig = scriptSigIn;
    nSequence = nSequenceIn;
}

CTxIn::CTxIn(Txid hashPrevTx, uint32_t nOut, CScript scriptSigIn, uint32_t nSequenceIn)
{
    prevout = COutPoint(hashPrevTx, nOut);
    scriptSig = scriptSigIn;
    nSequence = nSequenceIn;
}

std::string CTxIn::ToString() const
{
    std::string str;
    str += "CTxIn(";
    str += prevout.ToString();
    if (prevout.IsNull()) {
        str += strprintf(", coinbase %s", HexStr(scriptSig));
    } else {
        str += strprintf(", scriptSig=%s", HexStr(scriptSig).substr(0, 24));
    }
    if (nSequence != SEQUENCE_FINAL) {
        str += strprintf(", nSequence=%u", nSequence);
    }
    str += ")";
    return str;
}

/** CTxOut ********************************************************************/

CTxOut::CTxOut(const CAmount& nValueIn, CScript scriptPubKeyIn)
{
    nValue = nValueIn;
    scriptPubKey = scriptPubKeyIn;
}

std::string CTxOut::ToString() const
{
    return strprintf(
        "CTxOut(nValue=%d.%08d, scriptPubKey=%s)",
        nValue / COIN,
        nValue % COIN,
        HexStr(scriptPubKey).substr(0, 30)
    );
}

/** CMutableTransaction *******************************************************/

CMutableTransaction::CMutableTransaction()
    : vin(),
      vout(),
      version{CTransaction::CURRENT_VERSION},
      nLockTime{0},
      segop_payload() // segOP: default-constructed (null)
{
}

CMutableTransaction::CMutableTransaction(const CTransaction& tx)
    : vin(tx.vin),
      vout(tx.vout),
      version{tx.version},
      nLockTime{tx.nLockTime},
      segop_payload(tx.segop_payload) // segOP: carry payload across
{
}

Txid CMutableTransaction::GetHash() const
{
    // Hash of the transaction without witness (and without segwit discount).
    // This helper is used internally by the wallet; consensus txid is defined
    // by CTransaction::ComputeHash().
    return Txid::FromUint256((HashWriter{} << TX_NO_WITNESS(*this)).GetHash());
}

/** CTransaction (internal helpers) *******************************************/

bool CTransaction::ComputeHasWitness() const
{
    return std::any_of(vin.begin(), vin.end(), [](const CTxIn& input) {
        return !input.scriptWitness.IsNull();
    });
}

Txid CTransaction::ComputeHash() const
{
    // Spec §7.2.1: txid is the legacy non-witness serialization that ignores
    // marker, flag, witness *and segOP*. To preserve that behaviour, hash a
    // copy of the transaction with segOP stripped.
    CMutableTransaction tx_legacy{*this};
    tx_legacy.segop_payload.SetNull();

    return Txid::FromUint256((HashWriter{} << TX_NO_WITNESS(tx_legacy)).GetHash());
}

Wtxid CTransaction::ComputeWitnessHash() const
{
    // Spec §7.2.2 and BIP141: if there is no witness, wtxid == txid.
    if (!HasWitness()) {
        return Wtxid::FromUint256(hash.ToUint256());
    }

    // With witness: wtxid is computed over the extended-with-witness
    // serialization *excluding segOP*. So we hash a copy with segOP stripped.
    CMutableTransaction tx_extended{*this};
    tx_extended.segop_payload.SetNull();

    return Wtxid::FromUint256((HashWriter{} << TX_WITH_WITNESS(tx_extended)).GetHash());
}

Fullxid CTransaction::ComputeFullxid() const
{
    // Spec §7.2.3: fullxid = TAGGED_HASH("segop:fullxid", extended_serialization)
    // where extended_serialization is the full extended wire format:
    //
    //   nVersion || marker || flag || vin || vout ||
    //   [witness data, if present] ||
    //   [segOP section, if present] ||
    //   nLockTime
    //
    // TX_WITH_WITNESS(*this) is defined to emit exactly that extended
    // serialization for segOP-aware nodes, so we feed it straight into
    // a tagged HashWriter.

    HashWriter hw = TaggedHash("segop:fullxid");
    hw << TX_WITH_WITNESS(*this);

    return Fullxid::FromUint256(hw.GetHash());
}

/** CTransaction (public) *****************************************************/

CTransaction::CTransaction(const CMutableTransaction& tx)
    : vin(tx.vin),
      vout(tx.vout),
      version{tx.version},
      nLockTime{tx.nLockTime},
      segop_payload(tx.segop_payload),
      m_has_witness{ComputeHasWitness()},
      hash{ComputeHash()},
      m_witness_hash{ComputeWitnessHash()},
      m_full_hash{ComputeFullxid()}
{
}

CTransaction::CTransaction(CMutableTransaction&& tx)
    : vin(std::move(tx.vin)),
      vout(std::move(tx.vout)),
      version{tx.version},
      nLockTime{tx.nLockTime},
      segop_payload(std::move(tx.segop_payload)),
      m_has_witness{ComputeHasWitness()},
      hash{ComputeHash()},
      m_witness_hash{ComputeWitnessHash()},
      m_full_hash{ComputeFullxid()}
{
}

CAmount CTransaction::GetValueOut() const
{
    CAmount nValueOut = 0;
    for (const auto& tx_out : vout) {
        if (!MoneyRange(tx_out.nValue) || !MoneyRange(nValueOut + tx_out.nValue)) {
            throw std::runtime_error(std::string(__func__) + ": value out of range");
        }
        nValueOut += tx_out.nValue;
    }
    assert(MoneyRange(nValueOut));
    return nValueOut;
}

unsigned int CTransaction::GetTotalSize() const
{
    // Full serialized size in extended-with-witness form, which for segOP-aware
    // nodes includes the segOP section between witness (if any) and nLockTime.
    return ::GetSerializeSize(TX_WITH_WITNESS(*this));
}

std::string CTransaction::ToString() const
{
    std::string str;
    str += strprintf(
        "CTransaction(hash=%s, ver=%u, vin.size=%u, vout.size=%u, nLockTime=%u)\n",
        GetHash().ToString().substr(0, 10),
        version,
        vin.size(),
        vout.size(),
        nLockTime
    );

    for (const auto& tx_in : vin) {
        str += "    " + tx_in.ToString() + "\n";
    }
    for (const auto& tx_in : vin) {
        str += "    " + tx_in.scriptWitness.ToString() + "\n";
    }
    for (const auto& tx_out : vout) {
        str += "    " + tx_out.ToString() + "\n";
    }

    // segOP debugging: show presence and size, but not full payload hex
    if (!segop_payload.IsNull()) {
        str += strprintf(
            "    segOP(version=%u, size=%u bytes)\n",
            segop_payload.version,
            static_cast<unsigned int>(segop_payload.data.size())
        );
    }

    return str;
}
