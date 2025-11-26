// Copyright (c) 2025 - Defenwycke - segOP
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SEGOP_SEGOP_PRUNE_H
#define BITCOIN_SEGOP_SEGOP_PRUNE_H

#include <cstdint>

namespace segop {

/**
 * Non-consensus segOP pruning / retention policy.
 *
 * All values are in blocks and interpreted at the view / RPC layer only.
 */
struct PrunePolicy {
    bool enabled{false};

    // Validation Window (W): depth for which segOP payloads MUST be present
    // at admission time (consensus checks happen before pruning).
    int validation_window{0};

    // Archive Window (A): optional extended window for fast historical queries.
    int archive_window{0};

    // Operator Window (R): local retention extension beyond archive window.
    int operator_window{0};
};

// Global policy instance (view-layer, non-consensus).
extern PrunePolicy g_prune_policy;

// Default / min / max bounds for the three windows.
// All values are in blocks.
extern const int DEFAULT_SEGOP_VALIDATION_WINDOW;
extern const int MIN_SEGOP_VALIDATION_WINDOW;
extern const int MAX_SEGOP_VALIDATION_WINDOW;

extern const int DEFAULT_SEGOP_ARCHIVE_WINDOW;
extern const int MIN_SEGOP_ARCHIVE_WINDOW;
extern const int MAX_SEGOP_ARCHIVE_WINDOW;

extern const int DEFAULT_SEGOP_OPERATOR_WINDOW;
extern const int MIN_SEGOP_OPERATOR_WINDOW;
extern const int MAX_SEGOP_OPERATOR_WINDOW;

/**
 * Initialise the global pruning policy from node args.
 *
 * This is called once at startup from AppInitMain.
 */
void InitPrunePolicy(int validation_window,
                     int archive_window,
                     int operator_window,
                     bool enabled);

/**
 * View-layer helper:
 *
 * Return true if a block at `block_height` should be treated as
 * "segOP-pruned" when the active chain tip is `tip_height`.
 *
 * This does NOT affect consensus or disk layout; it is used by
 * RPC / REST / UI layers to decide whether to expose segOP hex/TLV.
 */
bool IsPrunedHeight(int tip_height, int block_height);
// Returns true if segOP pruning is globally enabled (view-layer policy).
bool IsPruneEnabled();
} // namespace segop

#endif // BITCOIN_SEGOP_SEGOP_PRUNE_H
