import type { CascadeMultiplierProgression, CascadeStep, ClusterCascadeStep, Grid, MachineConfig, RNG } from "../types.js";
import { evalClusters } from "../evaluators/clusters.js";
import { evalPaylines } from "../evaluators/paylines.js";
import { evalScatter } from "../evaluators/scatters.js";
import { sampleSymbol } from "../factory/symbolFactory.js";
import { ConfigError } from "../errors.js";

type NullableGrid = Array<Array<string | null>>;

type MultiplierProgression = CascadeMultiplierProgression;

function cloneGrid(grid: Grid): Grid {
  return grid.map((col) => col.slice());
}

function toNullable(grid: Grid): NullableGrid {
  return grid.map((col) => col.map((s) => s));
}

function fromNullable(grid: NullableGrid): Grid {
  return grid.map((col) => col.map((s) => (s ?? "")));
}

function computeCascadeMultiplier(prog: MultiplierProgression | undefined, stepIndex: number): number {
  if (!prog) return 1;

  if (prog.type === "fixed") return Math.max(1, prog.value);

  const raw = prog.start + prog.step * stepIndex;
  const capped = prog.cap ? Math.min(raw, prog.cap) : raw;
  return Math.max(1, capped);
}

/**
 * refill cell with random symbol from reel strip (uniform draw from strip)
 */
function randomSymbolFromReel(machine: MachineConfig, rng: RNG, reelIndex: number): string {
  return sampleSymbol({
    machine,
    rng,
    reelIndex,
    ctx: { profile: "refill", reelIndex }
  });
}

function collapseAndRefill(machine: MachineConfig, rng: RNG, g: NullableGrid): void {
  const { reels, rows } = machine.layout;

  for (let reel = 0; reel < reels; reel++) {
    const col = g[reel]!;
    // gravity: pull non-nulls down (towards higher row index)
    const kept: string[] = [];
    for (let row = 0; row < rows; row++) {
      const v = col[row];
      if (v != null) kept.push(v);
    }
    // rebuild with nulls at top
    const newCol: Array<string | null> = Array.from({ length: rows }, () => null);
    let write = rows - 1;
    for (let i = kept.length - 1; i >= 0; i--) {
      newCol[write--] = kept[i]!;
    }
    // refill nulls from top
    for (let row = 0; row < rows; row++) {
      if (newCol[row] == null) newCol[row] = randomSymbolFromReel(machine, rng, reel);
    }
    g[reel] = newCol;
  }
}

function hasClusterRules(machine: MachineConfig): boolean {
  return machine.features?.cluster != null || machine.cluster != null;
}

export function runCascadePaylines(args: {
  machine: MachineConfig;
  rng: RNG;
  stake: number;
  initialGrid: Grid;
}): { finalGrid: Grid; steps: CascadeStep[]; totalPayout: number } {
  const machine = args.machine;
  if (!machine.paylines?.lines?.length) throw new ConfigError("cascade mode requires paylines");

  const removeWinningSymbols = machine.features?.cascade?.removeWinningSymbols ?? true;
  const maxSteps = machine.features?.cascade?.maxSteps ?? 50;

  let current = cloneGrid(args.initialGrid);
  let total = 0;

  const steps: CascadeStep[] = [];

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
    const lineWins = evalPaylines(current, machine, args.stake);
    const scatterWin = evalScatter(current, machine, args.stake);

    const basePayout = lineWins.reduce((s, w) => s + w.payout, 0) + (scatterWin ? scatterWin.payout : 0);

    if (basePayout <= 0) break;

    const stepMultiplier = computeCascadeMultiplier(machine.features?.cascade?.multiplierProgression, stepIndex);
    const stepPayout = Math.floor(basePayout * stepMultiplier);
    total += stepPayout;

    const removed: Array<{ reel: number; row: number }> = [];
    const nullable = toNullable(current);

    if (removeWinningSymbols) {
      for (const w of lineWins) {
        for (const p of w.positions) {
          if (nullable[p.reel]![p.row] != null) {
            nullable[p.reel]![p.row] = null;
            removed.push({ reel: p.reel, row: p.row });
          }
        }
      }
    }

    steps.push({
      stepIndex,
      grid: current,
      lineWins,
      ...(scatterWin ? { scatterWin } : {}),
      basePayout,
      stepMultiplier,
      stepPayout,
      removedPositions: removed
    });

    if (!removeWinningSymbols || removed.length === 0) break;

    collapseAndRefill(machine, args.rng, nullable);

    const after = fromNullable(nullable);
    current = after;
  }

  return { finalGrid: current, steps, totalPayout: total };
}

export function runCascadeClusters(args: {
  machine: MachineConfig;
  rng: RNG;
  stake: number;
  initialGrid: Grid;
}): { finalGrid: Grid; steps: ClusterCascadeStep[]; totalPayout: number } {
  const machine = args.machine;
  if (!hasClusterRules(machine)) throw new ConfigError("cluster modes require config.features.cluster or config.cluster");
  const clusterCascade = machine.features?.clusterCascade;
  const cascadeEnabled = clusterCascade?.enabled ?? true;
  const maxSteps = clusterCascade?.maxSteps ?? 50;

  let current = cloneGrid(args.initialGrid);
  let total = 0;
  const steps: ClusterCascadeStep[] = [];

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
    const clusterWins = evalClusters(current, machine, args.stake);
    const scatterWin = evalScatter(current, machine, args.stake);
    const basePayout = clusterWins.reduce((s, w) => s + w.payout, 0) + (scatterWin ? scatterWin.payout : 0);

    if (basePayout <= 0) break;

    const stepMultiplier = computeCascadeMultiplier(clusterCascade?.multiplierProgression, stepIndex);
    const stepPayout = Math.floor(basePayout * stepMultiplier);
    total += stepPayout;

    const removed: Array<{ reel: number; row: number }> = [];
    const nullable = toNullable(current);

    if (cascadeEnabled) {
      for (const win of clusterWins) {
        for (const pos of win.positions) {
          if (nullable[pos.reel]![pos.row] != null) {
            nullable[pos.reel]![pos.row] = null;
            removed.push({ reel: pos.reel, row: pos.row });
          }
        }
      }
    }

    steps.push({
      stepIndex,
      grid: current,
      clusterWins,
      basePayout,
      stepMultiplier,
      stepPayout,
      removedPositions: removed
    });

    if (!cascadeEnabled || removed.length === 0) break;

    collapseAndRefill(machine, args.rng, nullable);
    current = fromNullable(nullable);
  }

  return { finalGrid: current, steps, totalPayout: total };
}
