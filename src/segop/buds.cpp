// segop/buds.cpp
#include "segop/buds.h"

namespace segop {

std::string ToString(BUDSCategory cat)
{
    switch (cat) {
    case BUDSCategory::L2_STATE_ANCHOR: return "L2_STATE_ANCHOR";
    case BUDSCategory::CHANNEL_STATE:   return "CHANNEL_STATE";
    case BUDSCategory::INDEX_DATA:      return "INDEX_DATA";
    case BUDSCategory::ARBITRARY_DATA:  return "ARBITRARY_DATA";
    case BUDSCategory::UNKNOWN:
    default:                            return "UNKNOWN";
    }
}

BUDSCategory ClassifyBUDSCode(unsigned char code)
{
    switch (code) {
    case 0x10: return BUDSCategory::L2_STATE_ANCHOR;
    case 0x11: return BUDSCategory::CHANNEL_STATE;
    case 0x20: return BUDSCategory::INDEX_DATA;
    case 0x30: return BUDSCategory::ARBITRARY_DATA;
    default:   return BUDSCategory::UNKNOWN;
    }
}

} // namespace segop
