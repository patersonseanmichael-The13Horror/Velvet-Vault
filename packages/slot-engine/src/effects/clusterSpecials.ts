import type { Grid, MachineConfig, SpecialEffect, SymbolId } from "../types.js";

type Pos = { reel: number; row: number };

function inBounds(p: Pos, reels: number, rows: number): boolean {
  return p.reel >= 0 && p.reel < reels && p.row >= 0 && p.row < rows;
}

function radiusPositions(center: Pos, radius: number, reels: number, rows: number): Pos[] {
  const out: Pos[] = [];
  for (let dc = -radius; dc <= radius; dc++) {
    for (let dr = -radius; dr <= radius; dr++) {
      const p = { reel: center.reel + dc, row: center.row + dr };
      if (inBounds(p, reels, rows)) out.push(p);
    }
  }
  return out;
}

/**
 * Applies special effects based on symbols present in removed cluster positions.
 * Returns extra removals + transform operations.
 */
export function computeClusterSpecialEffects(args: {
  grid: Grid;
  machine: MachineConfig;
  removed: Pos[];
  markRemoved: (p: Pos) => void;
  setSymbol: (p: Pos, sym: SymbolId) => void;
}): { effects: SpecialEffect[] } {
  const cfg = args.machine.features?.clusterSpecials;
  if (!cfg?.enabled) return { effects: [] };

  const { reels, rows } = args.machine.layout;

  const bomb = cfg.bombSymbol ?? "X";
  const bombR = cfg.bombRadius ?? 1;

  const wildBomb = cfg.wildBombSymbol ?? "WX";
  const wildBombR = cfg.wildBombRadius ?? 2;

  const trans = cfg.transformSymbol ?? "T";
  const transR = cfg.transformRadius ?? 1;
  const transTo = cfg.transformTo ?? "A";

  const removedSet = new Set(args.removed.map((p) => `${p.reel}:${p.row}`));
  const effects: SpecialEffect[] = [];

  for (const p of args.removed) {
    const sym = args.grid[p.reel]![p.row]!;

    if (sym === bomb) {
      const area = radiusPositions(p, bombR, reels, rows);
      const extra: Pos[] = [];
      for (const q of area) {
        const k = `${q.reel}:${q.row}`;
        if (!removedSet.has(k)) {
          removedSet.add(k);
          args.markRemoved(q);
          extra.push(q);
        }
      }
      effects.push({ type: "bomb", center: p, radius: bombR, removed: extra });
    } else if (sym === wildBomb) {
      const area = radiusPositions(p, wildBombR, reels, rows);
      const extra: Pos[] = [];
      for (const q of area) {
        const k = `${q.reel}:${q.row}`;
        if (!removedSet.has(k)) {
          removedSet.add(k);
          args.markRemoved(q);
          extra.push(q);
        }
      }
      effects.push({ type: "wildBomb", center: p, radius: wildBombR, removed: extra });
    } else if (sym === trans) {
      const area = radiusPositions(p, transR, reels, rows);
      const changed: Pos[] = [];
      for (const q of area) {
        if (removedSet.has(`${q.reel}:${q.row}`)) continue;
        args.setSymbol(q, transTo);
        changed.push(q);
      }
      effects.push({ type: "transform", center: p, radius: transR, to: transTo, transformed: changed });
    }
  }

  return { effects };
}
