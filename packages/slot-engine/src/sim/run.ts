import type { FeatureState, MachineConfig } from "../types.js";
import { spin } from "../engine/spin.js";
import { initStats, finalizeStats, type SimStats } from "./stats.js";
import { initialFeatureState } from "../features/freeSpins.js";

export function runSimulation(args: {
  machine: MachineConfig;
  spins: number;
  stake: number;
  seedBase?: string;
  progressEvery?: number;
  carryFeatures?: boolean;
}): SimStats {
  const stats = initStats();
  const progressEvery = args.progressEvery ?? Math.max(1, Math.floor(args.spins / 10));
  const carry = args.carryFeatures ?? true;

  let state: FeatureState = initialFeatureState(args.machine);

  for (let i = 0; i < args.spins; i++) {
    const seed = args.seedBase ? `${args.seedBase}:${i}` : undefined;

    const res = spin({
      machine: args.machine,
      bet: { stake: args.stake },
      ...(seed ? { seed } : {}),
      ...(carry ? { state } : {})
    });

    if (carry) state = res.nextState;

    stats.spins++;
    stats.totalStake += res.outcome.cost.stakeToCharge;
    stats.totalPayout += res.outcome.totalPayout;

    if (res.outcome.totalPayout > 0) stats.hitSpins++;

    if (res.outcome.totalPayout > stats.maxWin) {
      stats.maxWin = res.outcome.totalPayout;
      stats.maxWinMultiplier = res.outcome.totalPayout / args.stake;
    }

    if (res.outcome.breakdown) {
      stats.breakdown.base += res.outcome.breakdown.base;
      stats.breakdown.scatters += res.outcome.breakdown.scatters;
      stats.breakdown.freeSpinBonus += res.outcome.breakdown.freeSpinBonus;
      stats.breakdown.bonus += res.outcome.breakdown.bonus;
      stats.breakdown.cascades += res.outcome.breakdown.cascades;
      stats.breakdown.clusters += res.outcome.breakdown.clusters;
      stats.breakdown.specials += res.outcome.breakdown.specials;
    }

    if ((i + 1) % progressEvery === 0) console.log(`[sim] ${i + 1}/${args.spins} spins...`);
  }

  return finalizeStats(stats);
}
