// Copyright (c) 2025 segOP Authors
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SEGOP_SEGOP_H
#define BITCOIN_SEGOP_SEGOP_H

#include <serialize.h>

#include <cstdint>
#include <cstddef>
#include <vector>

/**
 * SegOP payload carried in the extended transaction serialization.
 *
 * Wire layout of the SegOP section (when enabled by the tx flag):
 *
 *   [ segop_marker (1) = 0x53 ]       // ASCII 'S'  (handled in tx serialization)
 *   [ segop_flag   (1) = version ]    // segOP version / feature bits
 *   [ segop_len    (varint) ]         // length of payload
 *   [ segop_payload (segop_len bytes) ]
 *
 * This struct models everything *after* the marker:
 *   - `version`  → segop_flag
 *   - `data`     → segop_payload bytes (TLV, Merkle root, etc.)
 */
struct CSegopPayload
{
    // segOP v1 version byte.
    static constexpr uint8_t SEGOP_VERSION_1 = 0x01;

    // Hard cap from the spec: maximum segOP payload size in bytes.
    // Enforced as a consensus rule in tx_check.
    static constexpr std::size_t MAX_SEGOP_PAYLOAD_SIZE = 100'000;

    uint8_t version;
    std::vector<unsigned char> data;

    CSegopPayload() { SetNull(); }

    void SetNull()
    {
        version = 0;
        data.clear();
    }

    bool IsNull() const
    {
        return version == 0 && data.empty();
    }

    // Convenience helper used by consensus checks.
    bool TooLarge() const
    {
        return data.size() > MAX_SEGOP_PAYLOAD_SIZE;
    }

    SERIALIZE_METHODS(CSegopPayload, obj)
    {
        // NOTE:
        //  - The 0x53 marker byte is *not* handled here; it is emitted/checked
        //    by the transaction serializer when the segOP flag bit is set.
        //  - std::vector<unsigned char> uses CompactSize/varint length encoding
        //    automatically, so this matches: [segop_len][segop_payload bytes].
        READWRITE(obj.version);
        READWRITE(obj.data);
    }
};

#endif // BITCOIN_SEGOP_SEGOP_H
