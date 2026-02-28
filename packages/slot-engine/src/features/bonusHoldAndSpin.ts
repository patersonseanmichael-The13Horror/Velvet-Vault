import type { BonusStep, HoldAndSpinState, MachineConfig, RNG } from "../types.js";

function getBonusCfg(machine: MachineConfig) {
  return machine.features?.bonus?.holdAndSpin;
}

export function initialBonusState(machine: MachineConfig): HoldAndSpinState | undefined {
  const cfg = getBonusCfg(machine);
  if (!cfg?.enabled) return undefined;
  const { reels, rows } = machine.layout;
  return {
    active: false,
    respinsRemaining: 0,
    locked: Array.from({ length: reels }, () => Array.from({ length: rows }, () => null))
  };
}

export function countBonusSymbols(grid: string[][], bonusSymbol: string): number {
  let c = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let row = 0; row < grid[r]!.length; row++) {
      if (grid[r]![row] === bonusSymbol) c++;
    }
  }
  return c;
}

function weightedPick<T extends { weight: number }>(rng: RNG, items: T[]): T {
  let total = 0;
  for (const it of items) total += it.weight;
  const roll = rng.nextFloat() * total;
  let acc = 0;
  for (const it of items) {
    acc += it.weight;
    if (roll < acc) return it;
  }
  return items[items.length - 1]!;
}

/**
 * Executes the Hold&Spin bonus round fully server-side.
 * Returns steps + total bonus payout in stake units.
 */
export function runHoldAndSpinBonus(args: {
  machine: MachineConfig;
  rng: RNG;
  stake: number;
}): { steps: BonusStep[]; payout: number } {
  const cfg = getBonusCfg(args.machine);
  if (!cfg?.enabled) return { steps: [], payout: 0 };

  const reels = args.machine.layout.reels;
  const rows = args.machine.layout.rows;

  const respins = cfg.respins ?? 3;
  const landChance = cfg.landChance ?? 0.15;
  const values = (cfg.values ?? [{ value: 1, weight: 1 }]).map((v) => ({ value: v.value, weight: v.weight }));

  const locked: Array<Array<number | null>> = Array.from({ length: reels }, () => Array.from({ length: rows }, () => null));
  const steps: BonusStep[] = [];

  let respinsRemaining = respins;

  for (let respinIndex = 0; respinIndex < 200 && respinsRemaining > 0; respinIndex++) {
    const landed: Array<{ reel: number; row: number; valueMultiplier: number }> = [];

    // attempt to land bonus values on empty cells
    for (let reel = 0; reel < reels; reel++) {
      for (let row = 0; row < rows; row++) {
        if (locked[reel]![row] != null) continue;
        if (args.rng.nextFloat() < landChance) {
          const pick = weightedPick(args.rng, values);
          locked[reel]![row] = pick.value;
          landed.push({ reel, row, valueMultiplier: pick.value });
        }
      }
    }

    if (landed.length > 0) {
      // classic hold&spin resets respins on a hit
      respinsRemaining = respins;
    } else {
      respinsRemaining -= 1;
    }

    steps.push({
      respinIndex,
      landed,
      lockedSnapshot: locked.map((col) => col.slice())
    });
  }

  let payout = 0;
  for (let reel = 0; reel < reels; reel++) {
    for (let row = 0; row < rows; row++) {
      const v = locked[reel]![row];
      if (v != null) payout += Math.floor(args.stake * v);
    }
  }

  return { steps, payout };
}

export function enterHoldAndSpin(machine: MachineConfig): HoldAndSpinState | undefined {
  const cfg = getBonusCfg(machine);
  if (!cfg?.enabled) return undefined;

  const { reels, rows } = machine.layout;
  const respins = cfg.respins ?? 3;

  return {
    active: true,
    respinsRemaining: respins,
    locked: Array.from({ length: reels }, () => Array.from({ length: rows }, () => null))
  };
}
