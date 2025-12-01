import React, { useMemo, useState } from "react";
import type { BudsTier } from "../types/buds";
import "./SimulatorView.css";

type MaybeBudsTier = BudsTier | null;

type PruneMode = "archive" | "validation_only" | "aggressive";

interface SimBlock {
  height: number;
  hasSegop: boolean;
  budsTier: MaybeBudsTier;
  inValidationWindow: boolean;
  inOperatorWindow: boolean;
  inArchiveWindow: boolean;
  isPruned: boolean;
  isReorg: boolean;
}

// Approximate full Bitcoin chain height; you can replace this
// with a live value from your node later.
const CHAIN_TIP_HEIGHT = 850_000;

const MIN_VISIBLE_BLOCKS = 50;
const MAX_VISIBLE_BLOCKS = 400;
const ZOOM_STEP = 20;
const DRAG_SENSITIVITY = 0.5; // blocks per pixel moved

export default function SimulatorView() {
  const [pruneMode, setPruneMode] = useState<PruneMode>("validation_only");
  const [validationWindow, setValidationWindow] = useState(2016);
  const [operatorExtra, setOperatorExtra] = useState(2016);
  const [archiveExtra, setArchiveExtra] = useState(10_000);
  const [reorgDepth, setReorgDepth] = useState(4);

  // How many blocks are visible in the window (zoom level)
  const [visibleBlocks, setVisibleBlocks] = useState(200);

  // Start height of the visible window (left edge of the bar)
  // 0 = genesis, max = CHAIN_TIP_HEIGHT - visibleBlocks + 1
  const [windowStartHeight, setWindowStartHeight] = useState(
    CHAIN_TIP_HEIGHT - visibleBlocks + 1
  );

  const tipHeight = CHAIN_TIP_HEIGHT;

  // Clamp helpers
  const clampVisibleBlocks = (val: number) =>
    Math.min(MAX_VISIBLE_BLOCKS, Math.max(MIN_VISIBLE_BLOCKS, val));

  const clampWindowStart = (start: number, currentVisible = visibleBlocks) => {
    const maxStart = Math.max(0, tipHeight - currentVisible + 1);
    if (start < 0) return 0;
    if (start > maxStart) return maxStart;
    return start;
  };

  const blocks: SimBlock[] = useMemo(() => {
    const start = clampWindowStart(windowStartHeight);
    const end = Math.min(tipHeight, start + visibleBlocks - 1);
    const arr: SimBlock[] = [];

    for (let h = start; h <= end; h++) {
      const distance = tipHeight - h;

      const inValidationWindow = distance < validationWindow;
      const inOperatorWindow =
        distance >= validationWindow &&
        distance < validationWindow + operatorExtra;
      const inArchiveWindow =
        distance >= validationWindow + operatorExtra &&
        distance <
          validationWindow + operatorExtra + archiveExtra;

      const isPruned =
        pruneMode === "aggressive"
          ? !inValidationWindow
          : pruneMode === "validation_only"
          ? !(inValidationWindow || inOperatorWindow)
          : false; // archive mode keeps everything we show

      const isReorg = distance < reorgDepth;

      // Temporary synthetic segOP + BUDS tier data
      const hasSegop = Math.random() < 0.15;
      const budsTier: MaybeBudsTier = hasSegop
        ? (Math.floor(Math.random() * 4) as BudsTier)
        : null;

      arr.push({
        height: h,
        hasSegop,
        budsTier,
        inValidationWindow,
        inOperatorWindow,
        inArchiveWindow,
        isPruned,
        isReorg,
      });
    }

    return arr;
  }, [
    tipHeight,
    pruneMode,
    validationWindow,
    operatorExtra,
    archiveExtra,
    reorgDepth,
    windowStartHeight,
    visibleBlocks,
  ]);

  const prunedSegopCount = blocks.filter((b) => b.hasSegop && b.isPruned).length;
  const totalSegopCount = blocks.filter((b) => b.hasSegop).length;

  const firstVisibleHeight = blocks.length ? blocks[0].height : 0;
  const lastVisibleHeight = blocks.length
    ? blocks[blocks.length - 1].height
    : 0;

  // Wheel = zoom in/out around the current window
  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? ZOOM_STEP : -ZOOM_STEP;

    setVisibleBlocks((prev) => {
      const nextVisible = clampVisibleBlocks(prev + delta);
      // Adjust start so we don't "fall off" the tip/genesis
      setWindowStartHeight((prevStart) =>
        clampWindowStart(prevStart, nextVisible)
      );
      return nextVisible;
    });
  };

  // Drag = pan along the chain
  const handleDrag = (deltaX: number) => {
    // Drag right (positive deltaX) moves window toward older blocks (lower heights)
    const blockDelta = Math.round(deltaX * DRAG_SENSITIVITY);
    setWindowStartHeight((prev) =>
      clampWindowStart(prev - blockDelta, visibleBlocks)
    );
  };

  // Slider zoom
  const handleVisibleRangeChange = (value: number) => {
    const nextVisible = clampVisibleBlocks(value);
    setVisibleBlocks(nextVisible);
    setWindowStartHeight((prevStart) =>
      clampWindowStart(prevStart, nextVisible)
    );
  };

  return (
    <div className="sim-root">
      <h2>Pruning &amp; Reorg Simulator</h2>

      <div className="sim-layout">
        <div className="sim-controls">
          <label>
            Prune mode
            <select
              value={pruneMode}
              onChange={(e) => setPruneMode(e.target.value as PruneMode)}
            >
              <option value="archive">Archive (keep all)</option>
              <option value="validation_only">
                Validation + Operator windows
              </option>
              <option value="aggressive">Aggressive (validation only)</option>
            </select>
          </label>

          <label>
            Validation window (blocks)
            <input
              type="number"
              value={validationWindow}
              onChange={(e) => setValidationWindow(Number(e.target.value) || 0)}
              min={0}
            />
          </label>

          <label>
            Operator extra window
            <input
              type="number"
              value={operatorExtra}
              onChange={(e) => setOperatorExtra(Number(e.target.value) || 0)}
              min={0}
            />
          </label>

          <label>
            Archive extra window
            <input
              type="number"
              value={archiveExtra}
              onChange={(e) => setArchiveExtra(Number(e.target.value) || 0)}
              min={0}
            />
          </label>

          <label className="range-row">
            Visible range (blocks)
            <div className="range-with-value">
              <input
                type="range"
                min={MIN_VISIBLE_BLOCKS}
                max={MAX_VISIBLE_BLOCKS}
                step={10}
                value={visibleBlocks}
                onChange={(e) =>
                  handleVisibleRangeChange(Number(e.target.value))
                }
              />
              <span>{visibleBlocks}</span>
            </div>
          </label>

          <label className="range-row">
            Reorg depth (blocks)
            <div className="range-with-value">
              <input
                type="range"
                min={0}
                max={24}
                value={reorgDepth}
                onChange={(e) => setReorgDepth(Number(e.target.value))}
              />
              <span>{reorgDepth}</span>
            </div>
          </label>

          <div className="sim-summary">
            <div>Total segOP blocks (simulated): {totalSegopCount}</div>
            <div>
              segOP blocks pruned under this policy: {prunedSegopCount}
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "#aaa" }}>
              Visible window:{" "}
              <span>
                {firstVisibleHeight} → {lastVisibleHeight} (of 0 →{" "}
                {CHAIN_TIP_HEIGHT})
              </span>
            </div>
          </div>
        </div>

        <div className="sim-visual">
          <div className="sim-axis-labels">
            <span>Genesis (0)</span>
            <span>Chain tip ({CHAIN_TIP_HEIGHT})</span>
          </div>
          <BlockStrip
            blocks={blocks}
            onWheelZoom={handleWheelZoom}
            onDrag={handleDrag}
          />
          <Legend />
        </div>
      </div>
    </div>
  );
}

function BlockStrip({
  blocks,
  onWheelZoom,
  onDrag,
}: {
  blocks: SimBlock[];
  onWheelZoom: (e: React.WheelEvent<HTMLDivElement>) => void;
  onDrag: (deltaX: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [lastX, setLastX] = useState<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
    setLastX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging || lastX === null) return;
    const deltaX = e.clientX - lastX;
    if (Math.abs(deltaX) >= 2) {
      onDrag(deltaX);
      setLastX(e.clientX);
    }
  };

  const endDrag = () => {
    setDragging(false);
    setLastX(null);
  };

  return (
    <div
      className="block-strip"
      onWheel={onWheelZoom}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      {blocks.map((b) => (
        <div
          key={b.height}
          className={[
            "block",
            b.inArchiveWindow ? "block-archive" : "",
            b.inOperatorWindow ? "block-operator" : "",
            b.inValidationWindow ? "block-validation" : "",
            b.isPruned ? "block-pruned" : "",
            b.hasSegop ? "block-segop" : "",
            b.isReorg ? "block-reorg" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          title={`Height ${b.height}${
            b.hasSegop ? ` • segOP (Tier ${b.budsTier ?? "?"})` : ""
          }${b.isPruned ? " • pruned" : ""}${
            b.isReorg ? " • in reorg range" : ""
          }`}
        />
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="sim-legend">
      <span className="legend-item">
        <span className="legend-swatch swatch-validation" /> Validation window
      </span>
      <span className="legend-item">
        <span className="legend-swatch swatch-operator" /> Operator window
      </span>
      <span className="legend-item">
        <span className="legend-swatch swatch-archive" /> Archive window
      </span>
      <span className="legend-item">
        <span className="legend-swatch swatch-segop" /> segOP payload
      </span>
      <span className="legend-item">
        <span className="legend-swatch swatch-pruned" /> Pruned
      </span>
      <span className="legend-item">
        <span className="legend-swatch swatch-reorg" /> Reorg range
      </span>
    </div>
  );
}
