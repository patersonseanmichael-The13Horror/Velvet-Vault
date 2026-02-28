export type SimStats = {
  spins: number;
  totalStake: number;
  totalPayout: number;
  rtp: number;

  hitSpins: number;
  hitRate: number;

  maxWin: number;
  maxWinMultiplier: number;
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
    maxWinMultiplier: 0
  };
}

export function finalizeStats(s: SimStats): SimStats {
  const rtp = s.totalStake > 0 ? s.totalPayout / s.totalStake : 0;
  const hitRate = s.spins > 0 ? s.hitSpins / s.spins : 0;
  return { ...s, rtp, hitRate };
}
