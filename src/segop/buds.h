// segop/buds.h
#ifndef SEGOP_BUDS_H
#define SEGOP_BUDS_H

#include <string>
#include <optional>

namespace segop {

enum class BUDSCategory {
    L2_STATE_ANCHOR,
    CHANNEL_STATE,
    INDEX_DATA,
    ARBITRARY_DATA,
    UNKNOWN,
};

std::string ToString(BUDSCategory cat);

// Map a single-byte BUDS code to a category.
// (Codes to be aligned with the BUDS registry.)
BUDSCategory ClassifyBUDSCode(unsigned char code);

} // namespace segop

#endif // SEGOP_BUDS_H
