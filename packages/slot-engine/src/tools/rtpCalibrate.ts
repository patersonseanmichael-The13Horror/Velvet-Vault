import type { MachineConfig } from "../types.js";
import { runSimulation } from "../sim/run.js";

/**
 * Very simple heuristic tuner:
 * - Adjusts reel strips by swapping a small % of symbols.
 * - Uses paytable "value score" to decide which symbols are high/low.
 *
 * This will get you closer, not perfect. For perfect calibration you'd use a proper optimizer.
 */
export function calibrateRtp(args: {
  machine: MachineConfig;
  targetRtp: number;
  spinsPerIter: number;
  iterations: number;
  stake: number;
  adjustmentRate?: number;
  seedBase?: string;
}): { tuned: MachineConfig; history: Array<{ iter: number; rtp: number }> } {
  const rate = args.adjustmentRate ?? 0.03;

  const score = (sym: string): number => {
    const table = args.machine.paytable[sym];
    if (!table) return 0;

    let m = 0;
    for (const v of Object.values(table)) m = Math.max(m, v);
    return m;
  };

  const symbols = Object.keys(args.machine.paytable);
  const sorted = symbols.slice().sort((a, b) => score(a) - score(b));
  const bucket = Math.max(1, Math.floor(sorted.length / 3));
  const low = sorted.slice(0, bucket);
  const high = sorted.slice(Math.max(0, sorted.length - bucket));

  let tuned: MachineConfig = JSON.parse(JSON.stringify(args.machine));
  const history: Array<{ iter: number; rtp: number }> = [];

  for (let iter = 1; iter <= args.iterations; iter++) {
    const stats = runSimulation({
      machine: tuned,
      spins: args.spinsPerIter,
      stake: args.stake,
      seedBase: `${args.seedBase ?? "cal"}:${iter}`,
      carryFeatures: true
    });

    history.push({ iter, rtp: stats.rtp });

    const diff = stats.rtp - args.targetRtp;
    if (Math.abs(diff) < 0.002) break;

    const inject = diff > 0 ? low : high;
    const replace = diff > 0 ? high : low;

    for (let r = 0; r < tuned.reelSet.reels.length; r++) {
      const strip = tuned.reelSet.reels[r]!;
      const swaps = Math.max(1, Math.floor(strip.length * rate));

      for (let s = 0; s < swaps; s++) {
        const idx = Math.floor(Math.random() * strip.length);
        if (!replace.includes(strip[idx]!)) continue;

        const newSym = inject[Math.floor(Math.random() * inject.length)]!;
        strip[idx] = newSym;
      }
    }
  }

  return { tuned, history };
}
