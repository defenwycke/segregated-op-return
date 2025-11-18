// Copyright (c) 2025 - Defenwycke - segOP
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SEGOP_SEGOP_H
#define BITCOIN_SEGOP_SEGOP_H

#include <serialize.h>

#include <cstdint>
#include <cstddef>
#include <string>
#include <vector>
#include <limits>

#include <crypto/sha256.h>
#include <hash.h>
#include <span.h>   // MakeUCharSpan
#include <span>     // std::span, std::as_bytes

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
    static constexpr uint8_t SEGOP_VERSION = 0x01;

    // Hard cap from the spec: maximum segOP payload size in bytes.
    // Enforced as a consensus rule in tx_check.
    static constexpr std::size_t MAX_SEGOP_PAYLOAD_SIZE = 64'000;

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

// ---------------------------------------------------------------------------
// segOP TLV type registry (v1)
// ---------------------------------------------------------------------------
/*
 * TLV type ranges (documented, non-consensus registry):
 *
 *   0x01 = TEXT_UTF8    (human-readable UTF-8 string)
 *   0x02 = JSON_UTF8    (UTF-8 JSON document)
 *   0x03 = BINARY_BLOB  (opaque binary blob)
 *
 *   0x04–0x1f : reserved for future consensus-defined types
 *   0x20–0x7f : generic / open-use, non-consensus types
 *   0x80–0xff : application / L2-specific namespaces
 *
 * Unknown types are treated as opaque TLVs by consensus, and surfaced
 * as "kind": "unknown" in RPC decoding.
 */
namespace SegopTlvType {
    static constexpr uint8_t TEXT_UTF8   = 0x01; // human-readable UTF-8
    static constexpr uint8_t JSON_UTF8   = 0x02; // structured JSON (UTF-8)
    static constexpr uint8_t BINARY_BLOB = 0x03; // opaque bytes
}

/*
 * ---------------------------------------------------------------------------
 * segOP helper utilities (wallet / tools side)
 * ---------------------------------------------------------------------------
 *
 * NOTE: These helpers do *not* change consensus on their own. They just
 * construct payloads and commitment blobs that match what consensus already
 * enforces in src/consensus/tx_check.cpp.
 */

/**
 * segOP TLV helper: read a Bitcoin CompactSize (varint) from a byte vector.
 *
 * Returns false on overrun or non-canonical encoding.
 *
 * This mirrors the CompactSize rules used by Bitcoin's serialization:
 *  - < 253       : 1 byte
 *  - 253         : 0xfd + uint16 (little endian, >= 253)
 *  - 254         : 0xfe + uint32 (little endian, >= 0x10000)
 *  - 255         : 0xff + uint64 (little endian, >= 0x100000000)
 */
inline bool SegopReadCompactSize(const std::vector<unsigned char>& bytes,
                                 size_t&                           i,
                                 uint64_t&                         size_out)
{
    const size_t n = bytes.size();
    if (i >= n) return false;

    unsigned char chSize = bytes[i++];

    if (chSize < 253) {
        size_out = chSize;
        return true;
    }

    if (chSize == 253) {
        if (n - i < 2) return false;
        uint16_t v = static_cast<uint16_t>(bytes[i])
                   | (static_cast<uint16_t>(bytes[i + 1]) << 8);
        i += 2;
        if (v < 253) return false; // non-canonical
        size_out = v;
        return true;
    }

    if (chSize == 254) {
        if (n - i < 4) return false;
        uint32_t v =  static_cast<uint32_t>(bytes[i])
                    | (static_cast<uint32_t>(bytes[i + 1]) << 8)
                    | (static_cast<uint32_t>(bytes[i + 2]) << 16)
                    | (static_cast<uint32_t>(bytes[i + 3]) << 24);
        i += 4;
        if (v < 0x10000U) return false; // non-canonical
        size_out = v;
        return true;
    }

    // chSize == 255
    if (n - i < 8) return false;
    uint64_t v =  static_cast<uint64_t>(bytes[i])
                | (static_cast<uint64_t>(bytes[i + 1]) << 8)
                | (static_cast<uint64_t>(bytes[i + 2]) << 16)
                | (static_cast<uint64_t>(bytes[i + 3]) << 24)
                | (static_cast<uint64_t>(bytes[i + 4]) << 32)
                | (static_cast<uint64_t>(bytes[i + 5]) << 40)
                | (static_cast<uint64_t>(bytes[i + 6]) << 48)
                | (static_cast<uint64_t>(bytes[i + 7]) << 56);
    i += 8;
    if (v < 0x100000000ULL) return false; // non-canonical
    size_out = v;
    return true;
}

/**
 * segOP TLV helper: write a Bitcoin CompactSize (varint) into a byte vector.
 */
inline void SegopWriteCompactSize(std::vector<unsigned char>& out, uint64_t size)
{
    if (size < 253) {
        out.push_back(static_cast<unsigned char>(size));
    } else if (size <= 0xFFFFULL) {
        out.push_back(253);
        out.push_back(static_cast<unsigned char>(size & 0xFF));
        out.push_back(static_cast<unsigned char>((size >> 8) & 0xFF));
    } else if (size <= 0xFFFFFFFFULL) {
        out.push_back(254);
        out.push_back(static_cast<unsigned char>(size & 0xFF));
        out.push_back(static_cast<unsigned char>((size >> 8) & 0xFF));
        out.push_back(static_cast<unsigned char>((size >> 16) & 0xFF));
        out.push_back(static_cast<unsigned char>((size >> 24) & 0xFF));
    } else {
        out.push_back(255);
        out.push_back(static_cast<unsigned char>(size & 0xFF));
        out.push_back(static_cast<unsigned char>((size >> 8) & 0xFF));
        out.push_back(static_cast<unsigned char>((size >> 16) & 0xFF));
        out.push_back(static_cast<unsigned char>((size >> 24) & 0xFF));
        out.push_back(static_cast<unsigned char>((size >> 32) & 0xFF));
        out.push_back(static_cast<unsigned char>((size >> 40) & 0xFF));
        out.push_back(static_cast<unsigned char>((size >> 48) & 0xFF));
        out.push_back(static_cast<unsigned char>((size >> 56) & 0xFF));
    }
}

/**
 * Non-consensus segOP TLV helper struct.
 *
 * One logical TLV record:
 *   [type (1 byte)] [length (CompactSize)] [value bytes...]
 *
 * This is purely a construction helper; consensus only sees the
 * final byte vector and validates it with SegopIsValidTLV().
 */
struct SegopTlv
{
    uint8_t type;
    std::vector<unsigned char> value;
};

/**
 * Build a raw segOP TLV payload from a sequence of SegopTlv items.
 *
 * For each item:
 *   out += type (1 byte)
 *   out += CompactSize(value.size())
 *   out += value bytes...
 */
inline std::vector<unsigned char> BuildSegopTlvSequence(const std::vector<SegopTlv>& items)
{
    std::vector<unsigned char> out;
    out.reserve(16); // will grow as needed

    for (const auto& item : items) {
        // 1) type
        out.push_back(item.type);

        // 2) length as CompactSize
        SegopWriteCompactSize(out, static_cast<uint64_t>(item.value.size()));

        // 3) value bytes
        out.insert(out.end(), item.value.begin(), item.value.end());
    }

    return out;
}

/**
 * Validate that a raw segOP payload is a sequence of well-formed TLV
 * records with 1-byte type, CompactSize length and len bytes of data,
 * and that we end exactly at the boundary (no trailing slack).
 *
 * This enforces canonical CompactSize encoding, so malformed or
 * non-canonical encodings are rejected at consensus with
 * bad-txns-segop-tlv.
 */
inline bool SegopIsValidTLV(const std::vector<unsigned char>& bytes)
{
    size_t i = 0;
    const size_t n = bytes.size();

    while (i < n) {
        // Need at least a type byte
        if (n - i < 1) return false;

        uint8_t t = bytes[i++];
        (void)t;

        // Read CompactSize length
        uint64_t len = 0;
        if (!SegopReadCompactSize(bytes, i, len)) {
            return false;
        }

        // Guard against insane lengths / overflow
        if (len > static_cast<uint64_t>(std::numeric_limits<size_t>::max())) {
            return false;
        }

        if (n - i < static_cast<size_t>(len)) {
            return false; // overrun
        }

        // Skip value
        i += static_cast<size_t>(len);
    }

    // Must end exactly at boundary, no slack
    return i == n;
}

/**
 * Build a basic TLV payload for a UTF-8 text string.
 *
 * Layout (spec §6):
 *   [0x01 = type TEXT_UTF8] [len as CompactSize] [UTF-8 bytes...]
 *
 * Implemented in terms of BuildSegopTlvSequence so that single and
 * multi-TLV payloads use the same encoding logic.
 */
inline std::vector<unsigned char> BuildSegopTextTlv(const std::string& text)
{
    // Clamp to something safely within the global segOP cap.
    uint64_t len = text.size();
    if (len > CSegopPayload::MAX_SEGOP_PAYLOAD_SIZE) {
        len = CSegopPayload::MAX_SEGOP_PAYLOAD_SIZE;
    }

    SegopTlv item;
    item.type = SegopTlvType::TEXT_UTF8;
    item.value.assign(text.begin(),
                      text.begin() + static_cast<std::ptrdiff_t>(len));

    std::vector<SegopTlv> items;
    items.reserve(1);
    items.push_back(std::move(item));

    return BuildSegopTlvSequence(items);
}

/**
 * Convenience helper: build a segOP payload containing multiple
 * TEXT TLVs (all type 0x01).
 *
 * Each entry in `texts` becomes:
 *   [0x01][len(varint)][UTF-8 bytes...]
 *
 * The resulting payload is just their concatenation, which
 * SegopIsValidTLV() already accepts as a valid TLV sequence.
 */
inline std::vector<unsigned char> BuildSegopTextTlvMulti(const std::vector<std::string>& texts)
{
    std::vector<SegopTlv> items;
    items.reserve(texts.size());

    for (const auto& s : texts) {
        SegopTlv item;
        item.type = SegopTlvType::TEXT_UTF8;
        item.value.assign(s.begin(), s.end());
        items.push_back(std::move(item));
    }

    return BuildSegopTlvSequence(items);
}

/**
 * Build a TLV payload for a UTF-8 JSON string.
 *
 * Layout:
 *   [0x02 = JSON_UTF8] [len as CompactSize] [UTF-8 JSON bytes...]
 *
 * Consensus does not validate JSON; this is wallet / tooling sugar.
 */
inline std::vector<unsigned char> BuildSegopJsonTlv(const std::string& json_utf8)
{
    SegopTlv item;
    item.type = SegopTlvType::JSON_UTF8;
    item.value.assign(json_utf8.begin(), json_utf8.end());

    std::vector<SegopTlv> items;
    items.reserve(1);
    items.push_back(std::move(item));

    return BuildSegopTlvSequence(items);
}

/**
 * Build a TLV payload for an opaque binary blob.
 *
 * Layout:
 *   [0x03 = BINARY_BLOB] [len as CompactSize] [raw bytes...]
 *
 * Hex parsing / validation is done at the RPC layer; this helper
 * expects already-sanitised bytes.
 */
inline std::vector<unsigned char> BuildSegopBlobTlv(const std::vector<unsigned char>& blob)
{
    SegopTlv item;
    item.type = SegopTlvType::BINARY_BLOB;
    item.value = blob; // copy

    std::vector<SegopTlv> items;
    items.reserve(1);
    items.push_back(std::move(item));

    return BuildSegopTlvSequence(items);
}

/**
 * Build the P2SOP blob used by the segOP commitment output.
 *
 * Spec layout:
 *
 *   segop_commitment = TAGGED_HASH("segop:commitment", segop_payload_bytes)
 *   P2SOP_blob       = "P2SOP" || segop_commitment
 *
 * The script then is:
 *
 *   scriptPubKey = OP_RETURN <len = P2SOP_blob.size()> <P2SOP_blob bytes>
 */
inline std::vector<unsigned char> BuildSegopCommitmentBlob(const std::vector<unsigned char>& segop_payload)
{
    // BIP340-style tagged hash writer seeded with "segop:commitment".
    HashWriter hw = TaggedHash("segop:commitment");

    // HashWriter::write expects std::span<const std::byte>.
    // Convert the vector<unsigned char> to that via MakeUCharSpan + std::as_bytes.
    hw.write(std::as_bytes(MakeUCharSpan(segop_payload)));

    const uint256 segop_commitment = hw.GetHash();

    // Assemble "P2SOP" || segop_commitment
    std::vector<unsigned char> blob;
    blob.reserve(5 + segop_commitment.size());

    blob.push_back('P');
    blob.push_back('2');
    blob.push_back('S');
    blob.push_back('O');
    blob.push_back('P');

    blob.insert(blob.end(),
                segop_commitment.begin(),
                segop_commitment.end());

    return blob;
}

#endif // BITCOIN_SEGOP_SEGOP_H
