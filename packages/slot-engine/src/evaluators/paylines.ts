import type { Grid, LineWin, MachineConfig, SymbolId } from "../types.js";
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

function getLinePositions(line: number[], reels: number): Array<{ reel: number; row: number }> {
  if (line.length !== reels) {
    throw new ConfigError(`payline length ${line.length} != reels ${reels}`);
  }
  return line.map((row, reel) => ({ reel, row }));
}

/**
 * Paylines: evaluate left-to-right.
 * Rules:
 * - scatter does NOT participate in paylines (pay-anywhere only)
 * - wild substitutes for allowed symbols
 * - We choose the best paying "base symbol" for each line.
 */
export function evalPaylines(grid: Grid, config: MachineConfig, stake: number): LineWin[] {
  const { reels, rows } = config.layout;
  const scatter = config.scatter?.scatterSymbol;
  const wild = config.wild?.wildSymbol;

  const wildSubs = config.wild?.substitutesFor
    ? new Set(config.wild.substitutesFor)
    : defaultSubstitutesFor(config);

  const lineWins: LineWin[] = [];

  for (let i = 0; i < config.paylines.lines.length; i++) {
    const line = config.paylines.lines[i]!;
    const pos = getLinePositions(line, reels);

    for (const p of pos) {
      if (p.row < 0 || p.row >= rows) {
        throw new ConfigError(`payline ${i} has row ${p.row} outside [0, ${rows - 1}]`);
      }
    }

    const symbolsOnLine: SymbolId[] = pos.map((p) => grid[p.reel]![p.row]!);

    const candidates = new Set<SymbolId>();
    for (const s of symbolsOnLine) {
      if (s === scatter) continue;
      if (wild && s === wild) continue;
      if (config.paytable[s]) candidates.add(s);
    }

    if (candidates.size === 0 && wild) {
      for (const s of wildSubs) candidates.add(s);
    }

    let best: LineWin | undefined;

    for (const base of candidates) {
      let count = 0;
      const winPos: Array<{ reel: number; row: number }> = [];
      for (let r = 0; r < reels; r++) {
        const sym = symbolsOnLine[r]!;
        const isWild = wild && sym === wild;
        const matches = sym === base || (isWild && wildSubs.has(base));

        const isScatter = scatter && sym === scatter;

        if (isScatter) break;
        if (!matches) break;

        count++;
        winPos.push(pos[r]!);
      }

      if (count < 3) continue;

      const payoutMultiplier = config.paytable[base]?.[count] ?? 0;
      if (payoutMultiplier <= 0) continue;

      const payout = Math.floor(stake * payoutMultiplier);

      const candidate: LineWin = {
        lineIndex: i,
        symbol: base,
        count,
        payoutMultiplier,
        payout,
        positions: winPos
      };

      if (!best || candidate.payout > best.payout) best = candidate;
    }

    if (best) lineWins.push(best);
  }

  return lineWins;
}
