// Copyright (c) 2025 segOP Authors
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <segop/segop_prune.h>

#include <algorithm>   // std::max
#include <logging.h>   // LogPrintf

namespace segop {

// Global policy instance (non-consensus)
PrunePolicy g_prune_policy{};

// Default / min / max windows (in blocks).
// These are policy-only and can be tuned per deployment.

const int DEFAULT_SEGOP_VALIDATION_WINDOW = 144;   // ~1 day
const int MIN_SEGOP_VALIDATION_WINDOW     = 6;     // sanity floor
const int MAX_SEGOP_VALIDATION_WINDOW     = 2016;  // ~2 weeks

const int DEFAULT_SEGOP_ARCHIVE_WINDOW    = 2016;  // ~2 weeks
const int MIN_SEGOP_ARCHIVE_WINDOW        = 144;   // >= validation default
const int MAX_SEGOP_ARCHIVE_WINDOW        = 65535; // arbitrary large cap

const int DEFAULT_SEGOP_OPERATOR_WINDOW   = 8064;  // ~8 weeks
const int MIN_SEGOP_OPERATOR_WINDOW       = 0;     // operators may disable extension
const int MAX_SEGOP_OPERATOR_WINDOW       = 262800; // ~5 years

bool IsPruneEnabled()
{
    return g_prune_policy.enabled;
}

void InitPrunePolicy(int validation_window,
                     int archive_window,
                     int operator_window,
                     bool enabled)
{
    g_prune_policy.enabled           = enabled;
    g_prune_policy.validation_window = validation_window;
    g_prune_policy.archive_window    = archive_window;
    g_prune_policy.operator_window   = operator_window;

    LogPrintf("segop: prune policy enabled=%d validation=%d archive=%d operator=%d\n",
              enabled,
              validation_window,
              archive_window,
              operator_window);
}

bool IsPrunedHeight(int tip_height, int block_height)
{
    const auto& policy = g_prune_policy;

    // Global pruning disabled? Always keep full payload.
    if (!policy.enabled) {
        return false;
    }

    // If we don't know the heights, never prune.
    if (tip_height < 0 || block_height < 0) {
        return false;
    }

    const int depth = tip_height - block_height;
    if (depth < 0) {
        // Future / reorg weirdness: do not prune.
        return false;
    }

    // Effective retention window: E = max(W, R)
    const int validation = policy.validation_window;
    const int operator_w = policy.operator_window;
    const int E = std::max(validation, operator_w);

    // If misconfigured, keep everything.
    if (E <= 0) {
        return false;
    }

    // Prune once depth >= E blocks from tip.
    return depth >= E;
}

} // namespace segop
