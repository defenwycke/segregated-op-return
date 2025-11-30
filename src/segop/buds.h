// src/segop/buds.h
// BUDS tier + type registry and ARBDA scoring for segOP

#ifndef BITCOIN_SEGOP_BUDS_H
#define BITCOIN_SEGOP_BUDS_H

#include <cstdint>

namespace segop {

// -----------------------------------------------------------------------------
// BUDS tiers (structured tiering)
// -----------------------------------------------------------------------------
enum class BUDSTier : uint8_t {
    T0_MONETARY     = 0,   // pure monetary / consensus data
    T1_METADATA     = 1,   // planned / structured metadata
    T2_OPERATIONAL  = 2,   // L2 infra, anchors, proofs
    T3_ARBITRARY    = 3,   // arbitrary / opaque / app blobs
    UNSPECIFIED     = 0xfe,
    AMBIGUOUS       = 0xff,
};

// -----------------------------------------------------------------------------
// BUDS data types (within tiers)
// This is intentionally small and conservative for the prototype.
// The same raw type_code (0x01 etc.) can mean different things per tier.
// -----------------------------------------------------------------------------
enum class BUDSDataType : uint8_t {
    UNSPECIFIED          = 0x00,

    // T1 (structured metadata) – 0x10 range
    TEXT_NOTE            = 0x11,
    JSON_METADATA        = 0x12,
    RECEIPT              = 0x13,
    INVOICE              = 0x14,

    // T2 (operational) – 0x20 range
    L2_STATE_ANCHOR      = 0x21,
    ROLLUP_BATCH_REF     = 0x22,
    PROOF_REF            = 0x23,
    VAULT_METADATA       = 0x24,
    PEG_REF              = 0x25,

    // T3 (arbitrary / app)
    ARBITRARY_NAMESPACE  = 0x80, // app-defined space

    UNKNOWN              = 0xff,
};

// -----------------------------------------------------------------------------
// ARBDA – transaction-level risk tier
// (we reuse T0–T3 naming here, but this is "one score per tx")
// -----------------------------------------------------------------------------
enum class ARBDATier : uint8_t {
    T0 = 0,
    T1 = 1,
    T2 = 2,
    T3 = 3,
};

// Simple presence bitmap for tiers within a transaction / payload.
struct BUDSTierPresence {
    bool has_t0{false};
    bool has_t1{false};
    bool has_t2{false};
    bool has_t3{false};
};

// String helpers (for RPC / logs)
const char* ToString(BUDSTier tier);
const char* ToString(BUDSDataType type);
const char* ToString(ARBDATier tier);

// Map raw tier byte -> enum (T0/T1/T2/T3/UNSPECIFIED)
BUDSTier DecodeTierCode(uint8_t raw_code);

// Map raw data-type code + tier -> semantic enum
BUDSDataType DecodeDataTypeCode(BUDSTier tier, uint8_t raw_code);

// ARBDA rule from BUDS spec:
// if has_T3: T3
// else if has_T2: T2
// else if has_T1: T1
// else: T0
ARBDATier ComputeARBDATier(const BUDSTierPresence& presence);

} // namespace segop

#endif // BITCOIN_SEGOP_BUDS_H
