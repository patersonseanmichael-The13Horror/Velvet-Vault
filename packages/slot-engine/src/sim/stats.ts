export type SimStats = {
  spins: number;
  totalStake: number;
  totalPayout: number;
  rtp: number;

  hitSpins: number;
  hitRate: number;

  maxWin: number;
  maxWinMultiplier: number;

  breakdown: {
    base: number;
    scatters: number;
    freeSpinBonus: number;
    bonus: number;
    cascades: number;
    clusters: number;
    specials: number;
  };
};

export function initStats(): SimStats {
  return {
    spins: 0,
    totalStake: 0,
    totalPayout: 0,
    rtp: 0,
    hitSpins: 0,
    hitRate: 0,
    maxWin: 0,
    maxWinMultiplier: 0,
    breakdown: { base: 0, scatters: 0, freeSpinBonus: 0, bonus: 0, cascades: 0, clusters: 0, specials: 0 }
  };
}

export function finalizeStats(s: SimStats): SimStats {
  const rtp = s.totalStake > 0 ? s.totalPayout / s.totalStake : 0;
  const hitRate = s.spins > 0 ? s.hitSpins / s.spins : 0;
  return { ...s, rtp, hitRate };
}

export function toCsv(stats: SimStats): string {
  const headers = [
    "spins",
    "totalStake",
    "totalPayout",
    "rtp",
    "hitSpins",
    "hitRate",
    "maxWin",
    "maxWinMultiplier",
    "breakdown_base",
    "breakdown_scatters",
    "breakdown_freeSpinBonus",
    "breakdown_bonus",
    "breakdown_cascades",
    "breakdown_clusters",
    "breakdown_specials"
  ];
  const row = [
    stats.spins,
    stats.totalStake,
    stats.totalPayout,
    stats.rtp,
    stats.hitSpins,
    stats.hitRate,
    stats.maxWin,
    stats.maxWinMultiplier,
    stats.breakdown.base,
    stats.breakdown.scatters,
    stats.breakdown.freeSpinBonus,
    stats.breakdown.bonus,
    stats.breakdown.cascades,
    stats.breakdown.clusters,
    stats.breakdown.specials
  ];
  return `${headers.join(",")}\n${row.join(",")}\n`;
}
