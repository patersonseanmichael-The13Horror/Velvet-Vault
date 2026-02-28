import type { MachineConfig } from "../types.js";
import { spin } from "../engine/spin.js";
import { initStats, finalizeStats, type SimStats } from "./stats.js";

export function runSimulation(args: {
  machine: MachineConfig;
  spins: number;
  stake: number;
  seedBase?: string;
  progressEvery?: number;
}): SimStats {
  const stats = initStats();
  const progressEvery = args.progressEvery ?? Math.max(1, Math.floor(args.spins / 10));

  for (let i = 0; i < args.spins; i++) {
    const seed = args.seedBase ? `${args.seedBase}:${i}` : undefined;
    const res = spin({
      machine: args.machine,
      bet: { stake: args.stake },
      seed
    });

    stats.spins++;
    stats.totalStake += args.stake;
    stats.totalPayout += res.outcome.totalPayout;

    if (res.outcome.totalPayout > 0) stats.hitSpins++;

    if (res.outcome.totalPayout > stats.maxWin) {
      stats.maxWin = res.outcome.totalPayout;
      stats.maxWinMultiplier = res.outcome.totalPayout / args.stake;
    }

    if ((i + 1) % progressEvery === 0) {
      console.log(`[sim] ${i + 1}/${args.spins} spins...`);
    }
  }

  return finalizeStats(stats);
}
