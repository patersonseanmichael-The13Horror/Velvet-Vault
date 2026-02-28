import type { ClusterCascadeStep, Grid, MachineConfig, RNG } from "../types.js";
import { evalClusters } from "../evaluators/clusters.js";
import { computeClusterSpecialEffects } from "../effects/clusterSpecials.js";
import { sampleSymbol } from "../factory/symbolFactory.js";
import { ConfigError } from "../errors.js";

type NullableGrid = Array<Array<string | null>>;

function toNullable(grid: Grid): NullableGrid {
  return grid.map((col) => col.map((s) => s));
}

function fromNullable(grid: NullableGrid): Grid {
  return grid.map((col) => col.map((s) => (s ?? "")));
}

function computeStepMultiplier(machine: MachineConfig, stepIndex: number): number {
  const prog = machine.features?.clusterCascade?.multiplierProgression;
  if (!prog) return 1;
  if (prog.type === "fixed") return Math.max(1, prog.value);

  const raw = prog.start + prog.step * stepIndex;
  const capped = prog.cap ? Math.min(raw, prog.cap) : raw;
  return Math.max(1, capped);
}

function randomSymbolFromReel(machine: MachineConfig, rng: RNG, reelIndex: number): string {
  return sampleSymbol({ machine, rng, reelIndex, ctx: { profile: "refill", reelIndex } });
}

function collapseAndRefill(machine: MachineConfig, rng: RNG, g: NullableGrid): void {
  const { reels, rows } = machine.layout;
  for (let reel = 0; reel < reels; reel++) {
    const col = g[reel]!;
    const kept: string[] = [];
    for (let row = 0; row < rows; row++) {
      const v = col[row];
      if (v != null) kept.push(v);
    }
    const newCol: Array<string | null> = Array.from({ length: rows }, () => null);
    let write = rows - 1;
    for (let i = kept.length - 1; i >= 0; i--) newCol[write--] = kept[i]!;
    for (let row = 0; row < rows; row++) {
      if (newCol[row] == null) newCol[row] = randomSymbolFromReel(machine, rng, reel);
    }
    g[reel] = newCol;
  }
}

export function runClusterCascade(args: {
  machine: MachineConfig;
  rng: RNG;
  stake: number;
  initialGrid: Grid;
}): { finalGrid: Grid; steps: ClusterCascadeStep[]; totalPayout: number } {
  const machine = args.machine;
  const enabled = machine.features?.clusterCascade?.enabled ?? true;
  if (!enabled) throw new ConfigError("cluster_cascade mode requires features.clusterCascade.enabled");

  const maxSteps = machine.features?.clusterCascade?.maxSteps ?? 50;

  let current = args.initialGrid.map((c) => c.slice());
  let total = 0;

  const steps: ClusterCascadeStep[] = [];

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
    const clusterWins = evalClusters(current, machine, args.stake);
    const basePayout = clusterWins.reduce((s, w) => s + w.payout, 0);

    if (basePayout <= 0) break;

    const stepMultiplier = computeStepMultiplier(machine, stepIndex);
    const stepPayout = Math.floor(basePayout * stepMultiplier);
    total += stepPayout;

    const removed: Array<{ reel: number; row: number }> = [];
    const nullable = toNullable(current);

    for (const w of clusterWins) {
      for (const p of w.positions) {
        if (nullable[p.reel]![p.row] != null) {
          nullable[p.reel]![p.row] = null;
          removed.push({ reel: p.reel, row: p.row });
        }
      }
    }

    const effectsOut = computeClusterSpecialEffects({
      grid: current,
      machine,
      removed: removed.map((x) => ({ reel: x.reel, row: x.row })),
      markRemoved: (p) => {
        if (nullable[p.reel]![p.row] != null) {
          nullable[p.reel]![p.row] = null;
          removed.push({ reel: p.reel, row: p.row });
        }
      },
      setSymbol: (p, sym) => {
        if (nullable[p.reel]![p.row] != null) nullable[p.reel]![p.row] = sym;
      }
    });
    const effects = effectsOut.effects;

    collapseAndRefill(machine, args.rng, nullable);

    steps.push({
      stepIndex,
      grid: current,
      clusterWins,
      basePayout,
      stepMultiplier,
      stepPayout,
      removedPositions: removed,
      ...(effects.length > 0 ? { effects } : {})
    });

    current = fromNullable(nullable);
  }

  return { finalGrid: current, steps, totalPayout: total };
}
