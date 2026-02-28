import type { Grid, MachineConfig, ScatterWin } from "../types.js";

export function evalScatter(grid: Grid, config: MachineConfig, stake: number): ScatterWin | undefined {
  const rules = config.scatter;
  if (!rules) return undefined;

  const positions: Array<{ reel: number; row: number }> = [];
  for (let reel = 0; reel < grid.length; reel++) {
    const col = grid[reel]!;
    for (let row = 0; row < col.length; row++) {
      if (col[row] === rules.scatterSymbol) {
        positions.push({ reel, row });
      }
    }
  }

  const count = positions.length;
  const payoutMultiplier = rules.paytable[count] ?? 0;
  if (payoutMultiplier <= 0) return undefined;

  return {
    symbol: rules.scatterSymbol,
    count,
    payoutMultiplier,
    payout: Math.floor(stake * payoutMultiplier),
    positions
  };
}
