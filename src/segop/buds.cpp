// src/segop/buds.cpp
#include <segop/buds.h>

namespace segop {

// -----------------------------------------------------------------------------
// String helpers
// -----------------------------------------------------------------------------
const char* ToString(BUDSTier tier)
{
    switch (tier) {
    case BUDSTier::T0_MONETARY:    return "T0_MONETARY";
    case BUDSTier::T1_METADATA:    return "T1_METADATA";
    case BUDSTier::T2_OPERATIONAL: return "T2_OPERATIONAL";
    case BUDSTier::T3_ARBITRARY:   return "T3_ARBITRARY";
    case BUDSTier::UNSPECIFIED:    return "UNSPECIFIED";
    case BUDSTier::AMBIGUOUS:      return "AMBIGUOUS";
    }
    return "UNKNOWN_TIER";
}

const char* ToString(BUDSDataType type)
{
    switch (type) {
    case BUDSDataType::UNSPECIFIED:         return "UNSPECIFIED";

    case BUDSDataType::TEXT_NOTE:           return "TEXT_NOTE";
    case BUDSDataType::JSON_METADATA:       return "JSON_METADATA";
    case BUDSDataType::RECEIPT:             return "RECEIPT";
    case BUDSDataType::INVOICE:             return "INVOICE";

    case BUDSDataType::L2_STATE_ANCHOR:     return "L2_STATE_ANCHOR";
    case BUDSDataType::ROLLUP_BATCH_REF:    return "ROLLUP_BATCH_REF";
    case BUDSDataType::PROOF_REF:           return "PROOF_REF";
    case BUDSDataType::VAULT_METADATA:      return "VAULT_METADATA";
    case BUDSDataType::PEG_REF:             return "PEG_REF";

    case BUDSDataType::ARBITRARY_NAMESPACE: return "ARBITRARY_NAMESPACE";

    case BUDSDataType::UNKNOWN:             return "UNKNOWN";
    }
    return "UNKNOWN_TYPE";
}

const char* ToString(ARBDATier tier)
{
    switch (tier) {
    case ARBDATier::T0: return "T0";
    case ARBDATier::T1: return "T1";
    case ARBDATier::T2: return "T2";
    case ARBDATier::T3: return "T3";
    }
    return "UNKNOWN_ARBDA";
}

// -----------------------------------------------------------------------------
// Decode tier/type codes
// -----------------------------------------------------------------------------
BUDSTier DecodeTierCode(uint8_t raw_code)
{
    switch (raw_code) {
    case 0x00: return BUDSTier::T0_MONETARY;
    case 0x10: return BUDSTier::T1_METADATA;
    case 0x20: return BUDSTier::T2_OPERATIONAL;
    case 0x30: return BUDSTier::T3_ARBITRARY;
    default:   return BUDSTier::UNSPECIFIED;
    }
}

BUDSDataType DecodeDataTypeCode(BUDSTier tier, uint8_t raw_code)
{
    switch (tier) {
    case BUDSTier::T1_METADATA:
        switch (raw_code) {
        case 0x01: return BUDSDataType::TEXT_NOTE;
        case 0x02: return BUDSDataType::JSON_METADATA;
        case 0x03: return BUDSDataType::RECEIPT;
        case 0x04: return BUDSDataType::INVOICE;
        default:   return BUDSDataType::UNKNOWN;
        }

    case BUDSTier::T2_OPERATIONAL:
        switch (raw_code) {
        case 0x01: return BUDSDataType::L2_STATE_ANCHOR;
        case 0x02: return BUDSDataType::ROLLUP_BATCH_REF;
        case 0x03: return BUDSDataType::PROOF_REF;
        case 0x04: return BUDSDataType::VAULT_METADATA;
        case 0x05: return BUDSDataType::PEG_REF;
        default:   return BUDSDataType::UNKNOWN;
        }

    case BUDSTier::T3_ARBITRARY:
        if (raw_code >= 0x80) {
            return BUDSDataType::ARBITRARY_NAMESPACE;
        }
        return BUDSDataType::UNKNOWN;

    case BUDSTier::T0_MONETARY:
    case BUDSTier::UNSPECIFIED:
    case BUDSTier::AMBIGUOUS:
        return BUDSDataType::UNSPECIFIED;
    }

    return BUDSDataType::UNKNOWN;
}

// -----------------------------------------------------------------------------
// ARBDA rule implementation
// -----------------------------------------------------------------------------
ARBDATier ComputeARBDATier(const BUDSTierPresence& p)
{
    // From your spec:
    // if has_T3:      arbda_tx_tier = T3
    // else if has_T2: arbda_tx_tier = T2
    // else if has_T1: arbda_tx_tier = T1
    // else:           arbda_tx_tier = T0
    if (p.has_t3) return ARBDATier::T3;
    if (p.has_t2) return ARBDATier::T2;
    if (p.has_t1) return ARBDATier::T1;
    return ARBDATier::T0;
}

} // namespace segop
