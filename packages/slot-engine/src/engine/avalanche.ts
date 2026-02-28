import type { CascadeStep, Grid, MachineConfig, RNG } from "../types.js";
import { evalPaylines } from "../evaluators/paylines.js";
import { evalScatter } from "../evaluators/scatters.js";
import { sampleSymbol } from "../factory/symbolFactory.js";
import { ConfigError } from "../errors.js";

type NullableGrid = Array<Array<string | null>>;

function computeMultiplier(machine: MachineConfig, stepIndex: number): number {
  const prog = machine.features?.avalanche?.multiplierProgression;
  if (!prog) return 1;
  if (prog.type === "fixed") return Math.max(1, prog.value);
  const raw = prog.start + prog.step * stepIndex;
  const capped = prog.cap ? Math.min(raw, prog.cap) : raw;
  return Math.max(1, capped);
}

function toNullable(grid: Grid): NullableGrid {
  return grid.map((col) => col.map((s) => s));
}

function fromNullable(grid: NullableGrid): Grid {
  return grid.map((col) => col.map((s) => (s ?? "")));
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

export function runAvalanche(args: {
  machine: MachineConfig;
  rng: RNG;
  stake: number;
  initialGrid: Grid;
}): { finalGrid: Grid; steps: CascadeStep[]; totalPayout: number } {
  const machine = args.machine;
  if (!machine.paylines?.lines?.length) throw new ConfigError("avalanche requires paylines");

  const enabled = machine.features?.avalanche?.enabled ?? true;
  if (!enabled) throw new ConfigError("avalanche mode requires features.avalanche.enabled");

  const stickyWild = machine.features?.avalanche?.stickyWild ?? true;
  const stickyWildSymbol = machine.features?.avalanche?.stickyWildSymbol ?? machine.wild?.wildSymbol ?? "W";
  const maxSteps = machine.features?.avalanche?.maxSteps ?? 50;

  let current = args.initialGrid.map((c) => c.slice());
  let total = 0;
  const steps: CascadeStep[] = [];

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
    const lineWins = evalPaylines(current, machine, args.stake);
    const scatterWin = evalScatter(current, machine, args.stake);
    const basePayout = lineWins.reduce((s, w) => s + w.payout, 0) + (scatterWin ? scatterWin.payout : 0);

    if (basePayout <= 0) break;

    const stepMultiplier = computeMultiplier(machine, stepIndex);
    const stepPayout = Math.floor(basePayout * stepMultiplier);
    total += stepPayout;

    const nullable = toNullable(current);
    const removed: Array<{ reel: number; row: number }> = [];

    for (const w of lineWins) {
      for (const p of w.positions) {
        const sym = nullable[p.reel]![p.row];
        if (sym == null) continue;

        // Sticky wilds remain on screen across avalanche steps.
        if (stickyWild && sym === stickyWildSymbol) continue;

        nullable[p.reel]![p.row] = null;
        removed.push({ reel: p.reel, row: p.row });
      }
    }

    if (removed.length === 0) break;

    collapseAndRefill(machine, args.rng, nullable);

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

    current = fromNullable(nullable);
  }

  return { finalGrid: current, steps, totalPayout: total };
}
