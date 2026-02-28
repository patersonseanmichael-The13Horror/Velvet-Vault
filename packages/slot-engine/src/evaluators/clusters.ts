import type { ClusterWin, Grid, MachineConfig, SymbolId } from "../types.js";

type Pos = { reel: number; row: number };

function neighbors(pos: Pos, reels: number, rows: number, adjacency: 4 | 8): Pos[] {
  const deltas4 = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 }
  ];
  const deltas8 = [
    ...deltas4,
    { dr: -1, dc: -1 },
    { dr: -1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: 1, dc: 1 }
  ];
  const deltas = adjacency === 8 ? deltas8 : deltas4;

  const out: Pos[] = [];
  for (const d of deltas) {
    const nr = pos.row + d.dr;
    const nc = pos.reel + d.dc;
    if (nc >= 0 && nc < reels && nr >= 0 && nr < rows) out.push({ reel: nc, row: nr });
  }
  return out;
}

export function evalClusters(grid: Grid, config: MachineConfig, stake: number): ClusterWin[] {
  const rules = config.features?.cluster ?? config.cluster;
  if (!rules?.enabled) return [];

  const { reels, rows } = config.layout;
  const adjacency = (rules.adjacency ?? 4) as 4 | 8;
  const minSize = rules.minClusterSize ?? 5;

  const wild = config.wild?.wildSymbol;
  const wildJoinsAll = rules.wildJoinsAll ?? false;

  const allowedSymbols = (() => {
    if (rules.symbols === "allPaytableSymbols" || rules.symbols == null) {
      return new Set(Object.keys(config.paytable));
    }
    return new Set(rules.symbols);
  })();

  const visited: boolean[][] = Array.from({ length: reels }, () => Array.from({ length: rows }, () => false));

  const wins: ClusterWin[] = [];

  function symbolAt(p: Pos): SymbolId {
    return grid[p.reel]![p.row]!;
  }

  for (let reel = 0; reel < reels; reel++) {
    for (let row = 0; row < rows; row++) {
      if (visited[reel]![row]) continue;
      const start: Pos = { reel, row };
      const startSym = symbolAt(start);

      if (!allowedSymbols.has(startSym) && !(wildJoinsAll && wild && startSym === wild)) {
        visited[reel]![row] = true;
        continue;
      }

      const stack: Pos[] = [start];
      const cluster: Pos[] = [];
      visited[reel]![row] = true;

      while (stack.length) {
        const p = stack.pop()!;
        cluster.push(p);

        for (const n of neighbors(p, reels, rows, adjacency)) {
          if (visited[n.reel]![n.row]) continue;
          const ns = symbolAt(n);

          const ok = wildJoinsAll
            ? (allowedSymbols.has(ns) || (wild && ns === wild))
            : ns === startSym;

          if (!ok) continue;

          if (!wildJoinsAll && !allowedSymbols.has(startSym)) continue;

          visited[n.reel]![n.row] = true;
          stack.push(n);
        }
      }

      let payoutSymbol: SymbolId = startSym;
      if (wildJoinsAll) {
        const counts = new Map<SymbolId, number>();
        for (const p of cluster) {
          const s = symbolAt(p);
          if (wild && s === wild) continue;
          if (!allowedSymbols.has(s)) continue;
          counts.set(s, (counts.get(s) ?? 0) + 1);
        }
        let bestSym: SymbolId | null = null;
        let bestCt = 0;
        for (const [s, ct] of counts.entries()) {
          if (ct > bestCt) {
            bestCt = ct;
            bestSym = s;
          }
        }
        payoutSymbol = bestSym ?? (wild ?? startSym);
      }

      if (!allowedSymbols.has(payoutSymbol)) continue;

      const size = cluster.length;
      if (size < minSize) continue;

      const payoutMultiplier = config.paytable[payoutSymbol]?.[size] ?? 0;
      if (payoutMultiplier <= 0) continue;

      const payout = Math.floor(stake * payoutMultiplier);

      wins.push({
        symbol: payoutSymbol,
        size,
        payoutMultiplier,
        payout,
        positions: cluster
      });
    }
  }

  return wins;
}
