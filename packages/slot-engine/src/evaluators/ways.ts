import type { Grid, MachineConfig, SymbolId, WaysWin } from "../types.js";
import { ConfigError } from "../errors.js";

function defaultSubstitutesFor(config: MachineConfig): Set<SymbolId> {
  const set = new Set<SymbolId>();
  const scatter = config.scatter?.scatterSymbol;
  const wild = config.wild?.wildSymbol;

  for (const sym of Object.keys(config.paytable)) {
    if (sym === scatter) continue;
    if (sym === wild) continue;
    set.add(sym);
  }
  return set;
}

/**
 * Ways: left-to-right.
 * - Count how many consecutive reels match the base symbol (allowing wild).
 * - Ways = product of counts of matching positions per reel across that span.
 * - Payout = stake * paytable[base][count] * ways
 */
export function evalWays(grid: Grid, config: MachineConfig, stake: number): WaysWin[] {
  const { reels, rows } = config.layout;
  const rules = config.ways;
  if (!rules) throw new ConfigError("config.ways is required for mode=ways");
  if (grid.length !== reels) throw new ConfigError("grid reels mismatch");

  const scatter = config.scatter?.scatterSymbol;
  const wild = config.wild?.wildSymbol;

  const wildSubs = config.wild?.substitutesFor
    ? new Set(config.wild.substitutesFor)
    : defaultSubstitutesFor(config);

  // determine candidates from first reel (non-scatter)
  const candidates = new Set<SymbolId>();
  for (let row = 0; row < rows; row++) {
    const s = grid[0]![row]!;
    if (scatter && s === scatter) continue;
    if (wild && s === wild) {
      // wild in first reel can represent any substitutable symbol
      for (const base of wildSubs) candidates.add(base);
    } else if (config.paytable[s]) {
      candidates.add(s);
    }
  }

  const wins: WaysWin[] = [];
  for (const base of candidates) {
    const matchingPositionsByReel: Array<Array<{ reel: number; row: number }>> = [];

    let count = 0;
    for (let reel = 0; reel < reels; reel++) {
      const col = grid[reel]!;
      const matches: Array<{ reel: number; row: number }> = [];

      for (let row = 0; row < rows; row++) {
        const s = col[row]!;
        if (scatter && s === scatter) continue;

        const isWild = wild && s === wild;
        const ok = s === base || (isWild && wildSubs.has(base));
        if (ok) matches.push({ reel, row });
      }

      if (matches.length === 0) break;

      matchingPositionsByReel.push(matches);
      count++;
    }

    if (count < rules.minCount) continue;

    const payoutMultiplier = config.paytable[base]?.[count] ?? 0;
    if (payoutMultiplier <= 0) continue;

    // compute number of ways across the consecutive reels
    let ways = 1;
    for (let i = 0; i < count; i++) ways *= matchingPositionsByReel[i]!.length;

    const payout = Math.floor(stake * payoutMultiplier * ways);

    wins.push({
      symbol: base,
      count,
      ways,
      payoutMultiplier,
      payout,
      positionsByReel: matchingPositionsByReel.slice(0, count)
    });
  }

  // If multiple wins exist, you can keep them all (common) or cap to best.
  // We'll keep all wins; wallet can sum.
  return wins;
}
