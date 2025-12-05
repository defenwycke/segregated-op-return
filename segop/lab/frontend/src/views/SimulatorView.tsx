import { useMemo, useState } from "react";
import "./SimulatorView.css";

const BLOCKS_PER_DAY = 144;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export default function SimulatorView() {
  // --- Pruning model state ---
  const [chainLength, setChainLength] = useState(365 * BLOCKS_PER_DAY); // 1 year
  const [validationDays, setValidationDays] = useState(4); // min 4 days as discussed
  const [operatorDays, setOperatorDays] = useState(30);
  const [archiveDays, setArchiveDays] = useState(365);

  const [avgSegopBytesPerBlock, setAvgSegopBytesPerBlock] = useState(2048); // 2 KB
  const [t2Share, setT2Share] = useState(20); // % of segOP data that is T2
  const [t3Share, setT3Share] = useState(40); // % of segOP data that is T3
  const [pruneT2, setPruneT2] = useState(false);
  const [pruneT3, setPruneT3] = useState(true);

  // --- Mempool model state ---
  const [mempoolCapacityKb, setMempoolCapacityKb] = useState(300000); // 300 MB
  const [t0Tx, setT0Tx] = useState(50);
  const [t1Tx, setT1Tx] = useState(300);
  const [t2Tx, setT2Tx] = useState(200);
  const [t3Tx, setT3Tx] = useState(100);
  const [avgTxKb, setAvgTxKb] = useState(0.5);
  const [avgSegopKb, setAvgSegopKb] = useState(1.0);

  // --- Derived pruning windows ---
  const pruningModel = useMemo(() => {
    const tipIndex = chainLength - 1;

    const validationBlocks = clamp(
      Math.round(validationDays * BLOCKS_PER_DAY),
      4 * BLOCKS_PER_DAY,
      chainLength
    );
    const operatorBlocks = clamp(
      Math.round(operatorDays * BLOCKS_PER_DAY),
      0,
      chainLength
    );
    const archiveBlocks = clamp(
      Math.round(archiveDays * BLOCKS_PER_DAY),
      0,
      chainLength
    );

    // windows counted backwards from tip
    const validationStart = Math.max(0, tipIndex - validationBlocks + 1);
    const operatorStart = Math.max(0, validationStart - operatorBlocks);
    const archiveStart = Math.max(0, operatorStart - archiveBlocks);

    const validationLen = tipIndex - validationStart + 1;
    const operatorLen = validationStart - operatorStart;
    const archiveLen = operatorStart - archiveStart;
    const prunableLen = archiveStart; // everything before archiveStart

    const totalSegopBytes =
      chainLength * avgSegopBytesPerBlock;
    const prunableSegopBytes = prunableLen * avgSegopBytesPerBlock;

    const t2Fraction = clamp(t2Share / 100, 0, 1);
    const t3Fraction = clamp(t3Share / 100, 0, 1);

    let prunedBytes = 0;
    if (pruneT2) {
      prunedBytes += prunableSegopBytes * t2Fraction;
    }
    if (pruneT3) {
      prunedBytes += prunableSegopBytes * t3Fraction;
    }

    const totalMb = totalSegopBytes / (1024 * 1024);
    const prunableMb = prunableSegopBytes / (1024 * 1024);
    const prunedMb = prunedBytes / (1024 * 1024);
    const prunedPct = totalSegopBytes > 0 ? (prunedBytes / totalSegopBytes) * 100 : 0;

    return {
      tipIndex,
      validationStart,
      operatorStart,
      archiveStart,
      validationLen,
      operatorLen,
      archiveLen,
      prunableLen,
      totalSegopBytes,
      totalMb,
      prunableMb,
      prunedMb,
      prunedPct,
    };
  }, [
    chainLength,
    validationDays,
    operatorDays,
    archiveDays,
    avgSegopBytesPerBlock,
    t2Share,
    t3Share,
    pruneT2,
    pruneT3,
  ]);

  // Percent widths for the horizontal bar
  const totalBlocks = chainLength || 1;
  const vPct = (pruningModel.validationLen / totalBlocks) * 100;
  const oPct = (pruningModel.operatorLen / totalBlocks) * 100;
  const aPct = (pruningModel.archiveLen / totalBlocks) * 100;
  const pPct = (pruningModel.prunableLen / totalBlocks) * 100;

  // --- Mempool sim derived values ---
  const mempoolModel = useMemo(() => {
    const baseKb =
      (t0Tx + t1Tx + t2Tx + t3Tx) * avgTxKb +
      (t2Tx + t3Tx) * avgSegopKb; // assume only T2/T3 carry segOP

    let remaining = baseKb;
    let droppedT3 = 0;
    let droppedT2 = 0;

    if (remaining > mempoolCapacityKb) {
      // Drop T3 first
      const t3TotalKb = t3Tx * (avgTxKb + avgSegopKb);
      const excess = remaining - mempoolCapacityKb;
      const dropFrac = Math.min(1, excess / t3TotalKb || 0);
      droppedT3 = Math.round(t3Tx * dropFrac);
      remaining -= droppedT3 * (avgTxKb + avgSegopKb);
    }

    if (remaining > mempoolCapacityKb) {
      // Then drop T2
      const t2TotalKb = t2Tx * (avgTxKb + avgSegopKb);
      const excess2 = remaining - mempoolCapacityKb;
      const dropFrac2 = Math.min(1, excess2 / t2TotalKb || 0);
      droppedT2 = Math.round(t2Tx * dropFrac2);
      remaining -= droppedT2 * (avgTxKb + avgSegopKb);
    }

    const finalKb = Math.max(0, remaining);
    const overBy = Math.max(0, baseKb - mempoolCapacityKb);

    return {
      baseKb,
      finalKb,
      overBy,
      droppedT2,
      droppedT3,
    };
  }, [
    mempoolCapacityKb,
    t0Tx,
    t1Tx,
    t2Tx,
    t3Tx,
    avgTxKb,
    avgSegopKb,
  ]);

  return (
    <div className="sim-root">
      {/* PRUNING SIMULATOR */}
      <section className="sim-card">
        <h2>Pruning simulator</h2>
        <p className="sim-intro">
          Model validation, operator, and archive windows across a toy chain.
          The coloured bar shows which parts of the chain must be kept, and
          which are eligible for aggressive segOP pruning under BUDS / ARBDA
          policy.
        </p>

        <div className="sim-grid">
          {/* Controls */}
          <div className="sim-col">
            <h3>Chain &amp; windows</h3>

            <div className="sim-field">
              <label>
                Approx chain length (blocks)
                <span className="sim-label-note">
                  (e.g. 365 days × 144 blocks/day)
                </span>
              </label>
              <input
                type="number"
                min={BLOCKS_PER_DAY * 7}
                max={BLOCKS_PER_DAY * 365 * 5}
                value={chainLength}
                onChange={(e) =>
                  setChainLength(
                    clamp(
                      parseInt(e.target.value || "0", 10),
                      BLOCKS_PER_DAY * 7,
                      BLOCKS_PER_DAY * 365 * 5
                    )
                  )
                }
              />
            </div>

            <div className="sim-field">
              <label>
                Validation window (days)
                <span className="sim-label-note">(min 4 days)</span>
              </label>
              <input
                type="number"
                min={4}
                max={365}
                value={validationDays}
                onChange={(e) =>
                  setValidationDays(
                    clamp(parseInt(e.target.value || "0", 10), 4, 365)
                  )
                }
              />
            </div>

            <div className="sim-field">
              <label>Operator window (days)</label>
              <input
                type="number"
                min={0}
                max={365 * 5}
                value={operatorDays}
                onChange={(e) =>
                  setOperatorDays(
                    clamp(parseInt(e.target.value || "0", 10), 0, 365 * 5)
                  )
                }
              />
            </div>

            <div className="sim-field">
              <label>Archive window (days)</label>
              <input
                type="number"
                min={0}
                max={365 * 10}
                value={archiveDays}
                onChange={(e) =>
                  setArchiveDays(
                    clamp(parseInt(e.target.value || "0", 10), 0, 365 * 10)
                  )
                }
              />
            </div>

            <h3>segOP data mix</h3>

            <div className="sim-field">
              <label>Average segOP bytes per block</label>
              <input
                type="number"
                min={0}
                max={1024 * 1024}
                value={avgSegopBytesPerBlock}
                onChange={(e) =>
                  setAvgSegopBytesPerBlock(
                    clamp(parseInt(e.target.value || "0", 10), 0, 1024 * 1024)
                  )
                }
              />
            </div>

            <div className="sim-field">
              <label>T2 share of segOP data (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={t2Share}
                onChange={(e) =>
                  setT2Share(clamp(parseInt(e.target.value || "0", 10), 0, 100))
                }
              />
            </div>

            <div className="sim-field">
              <label>T3 share of segOP data (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={t3Share}
                onChange={(e) =>
                  setT3Share(clamp(parseInt(e.target.value || "0", 10), 0, 100))
                }
              />
            </div>

            <div className="sim-field sim-checkboxes">
              <label>Pruning policy</label>
              <div className="sim-checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    checked={pruneT2}
                    onChange={(e) => setPruneT2(e.target.checked)}
                  />{" "}
                  Prune T2 metadata in archive range
                </label>
              </div>
              <div className="sim-checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    checked={pruneT3}
                    onChange={(e) => setPruneT3(e.target.checked)}
                  />{" "}
                  Prune T3 arbitrary data in archive range
                </label>
              </div>
            </div>
          </div>

          {/* Visualisation + stats */}
          <div className="sim-col">
            <h3>Chain windows</h3>

            <div className="sim-bar-wrapper">
              <div className="sim-bar">
                {/* prunable (oldest) */}
                {pPct > 0 && (
                  <div
                    className="sim-segment sim-prunable"
                    style={{ width: `${pPct}%` }}
                  />
                )}
                {aPct > 0 && (
                  <div
                    className="sim-segment sim-archive"
                    style={{ width: `${aPct}%` }}
                  />
                )}
                {oPct > 0 && (
                  <div
                    className="sim-segment sim-operator"
                    style={{ width: `${oPct}%` }}
                  />
                )}
                {vPct > 0 && (
                  <div
                    className="sim-segment sim-validation"
                    style={{ width: `${vPct}%` }}
                  />
                )}
              </div>
              <div className="sim-bar-labels">
                <span>Genesis</span>
                <span>Chain tip</span>
              </div>
            </div>

            <div className="sim-legend">
              <span className="sim-dot sim-validation" /> Validation window
              <span className="sim-dot sim-operator" /> Operator window
              <span className="sim-dot sim-archive" /> Archive window
              <span className="sim-dot sim-prunable" /> Prunable range
            </div>

            <div className="sim-stats-grid">
              <div className="sim-stat">
                <div className="sim-stat-label">Validation length</div>
                <div className="sim-stat-value">
                  {pruningModel.validationLen} blocks
                </div>
              </div>
              <div className="sim-stat">
                <div className="sim-stat-label">Operator window</div>
                <div className="sim-stat-value">
                  {pruningModel.operatorLen} blocks
                </div>
              </div>
              <div className="sim-stat">
                <div className="sim-stat-label">Archive window</div>
                <div className="sim-stat-value">
                  {pruningModel.archiveLen} blocks
                </div>
              </div>
              <div className="sim-stat">
                <div className="sim-stat-label">Prunable range</div>
                <div className="sim-stat-value">
                  {pruningModel.prunableLen} blocks
                </div>
              </div>
            </div>

            <h3>Storage impact (segOP only)</h3>
            <div className="sim-stats-grid">
              <div className="sim-stat">
                <div className="sim-stat-label">Total segOP data</div>
                <div className="sim-stat-value">
                  {pruningModel.totalMb.toFixed(2)} MB
                </div>
              </div>
              <div className="sim-stat">
                <div className="sim-stat-label">
                  In archive/prunable windows
                </div>
                <div className="sim-stat-value">
                  {pruningModel.prunableMb.toFixed(2)} MB
                </div>
              </div>
              <div className="sim-stat">
                <div className="sim-stat-label">Pruned (T2/T3 policy)</div>
                <div className="sim-stat-value">
                  {pruningModel.prunedMb.toFixed(2)} MB
                </div>
              </div>
              <div className="sim-stat">
                <div className="sim-stat-label">Global reduction</div>
                <div className="sim-stat-value">
                  {pruningModel.prunedPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MEMPOOL SIMULATOR (stub) */}
      <section className="sim-card">
        <h2>Mempool pressure simulator (BUDS tiers)</h2>
        <p className="sim-intro">
          Rough illustration of how a policy that prefers T0/T1 can evict T3
          (and then T2) when capacity is tight. This is not a precise mempool
          model, just a lab visual for discussions.
        </p>

        <div className="sim-grid">
          <div className="sim-col">
            <h3>Inputs</h3>

            <div className="sim-field">
              <label>Mempool capacity (KB)</label>
              <input
                type="number"
                min={10000}
                max={1000000}
                value={mempoolCapacityKb}
                onChange={(e) =>
                  setMempoolCapacityKb(
                    clamp(parseInt(e.target.value || "0", 10), 10000, 1000000)
                  )
                }
              />
            </div>

            <div className="sim-field">
              <label>Average L1 tx size (KB)</label>
              <input
                type="number"
                min={0.1}
                max={5}
                step={0.1}
                value={avgTxKb}
                onChange={(e) =>
                  setAvgTxKb(parseFloat(e.target.value || "0") || 0.1)
                }
              />
            </div>

            <div className="sim-field">
              <label>Average segOP payload size (KB) for T2/T3</label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={avgSegopKb}
                onChange={(e) =>
                  setAvgSegopKb(parseFloat(e.target.value || "0") || 0)
                }
              />
            </div>

            <div className="sim-field">
              <label>T0 tx count</label>
              <input
                type="number"
                min={0}
                max={10000}
                value={t0Tx}
                onChange={(e) =>
                  setT0Tx(clamp(parseInt(e.target.value || "0", 10), 0, 10000))
                }
              />
            </div>

            <div className="sim-field">
              <label>T1 tx count</label>
              <input
                type="number"
                min={0}
                max={10000}
                value={t1Tx}
                onChange={(e) =>
                  setT1Tx(clamp(parseInt(e.target.value || "0", 10), 0, 10000))
                }
              />
            </div>

            <div className="sim-field">
              <label>T2 tx count</label>
              <input
                type="number"
                min={0}
                max={10000}
                value={t2Tx}
                onChange={(e) =>
                  setT2Tx(clamp(parseInt(e.target.value || "0", 10), 0, 10000))
                }
              />
            </div>

            <div className="sim-field">
              <label>T3 tx count</label>
              <input
                type="number"
                min={0}
                max={10000}
                value={t3Tx}
                onChange={(e) =>
                  setT3Tx(clamp(parseInt(e.target.value || "0", 10), 0, 10000))
                }
              />
            </div>
          </div>

          <div className="sim-col">
            <h3>Result</h3>

            <div className="sim-stats-grid">
              <div className="sim-stat">
                <div className="sim-stat-label">Base load</div>
                <div className="sim-stat-value">
                  {mempoolModel.baseKb.toFixed(0)} KB
                </div>
              </div>
              <div className="sim-stat">
                <div className="sim-stat-label">Capacity</div>
                <div className="sim-stat-value">
                  {mempoolCapacityKb.toFixed(0)} KB
                </div>
              </div>
              <div className="sim-stat">
                <div className="sim-stat-label">Over capacity</div>
                <div className="sim-stat-value">
                  {mempoolModel.overBy > 0
                    ? `${mempoolModel.overBy.toFixed(0)} KB`
                    : "0 (under capacity)"}
                </div>
              </div>
              <div className="sim-stat">
                <div className="sim-stat-label">Final load</div>
                <div className="sim-stat-value">
                  {mempoolModel.finalKb.toFixed(0)} KB
                </div>
              </div>
            </div>

            <div className="sim-mempool-summary">
              <div className="sim-mempool-line">
                <span className="tier-badge t0">T0</span>
                <span>Structural tx retained (never dropped in this model).</span>
              </div>
              <div className="sim-mempool-line">
                <span className="tier-badge t1">T1</span>
                <span>Economic tx retained unless things are extreme.</span>
              </div>
              <div className="sim-mempool-line">
                <span className="tier-badge t2">T2</span>
                <span>
                  Dropped after T3. In this run we drop {mempoolModel.droppedT2} T2 tx.
                </span>
              </div>
              <div className="sim-mempool-line">
                <span className="tier-badge t3">T3</span>
                <span>
                  Dropped first when over capacity. In this run we drop{" "}
                  {mempoolModel.droppedT3} T3 tx.
                </span>
              </div>
            </div>

            <p className="sim-footnote">
              This is intentionally simple: it assumes T3 &gt; T2 &gt; T1 &gt; T0
              priority and fixed average sizes, just to visualise why
              classification matters.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
