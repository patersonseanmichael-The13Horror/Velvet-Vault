function weightedSet(entries) {
  return entries.map(([symbol, weight]) => ({ symbol, weight }));
}

function repeatedReels(reelCount, entries, middleExtras = []) {
  return Array.from({ length: reelCount }, (_, index) => weightedSet(index === Math.floor(reelCount / 2) ? entries.concat(middleExtras) : entries));
}

const DEFAULT_20_LINES = [
  [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 2],
  [2, 1, 1, 1, 0], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
  [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 2, 1, 2, 0]
];

const noirPaylines = {
  id: "noir_paylines_5x3",
  layout: { reels: 5, rows: 3 },
  model: {
    type: "weightedReels",
    reels: repeatedReels(5, [
      ["MASK", 10], ["ROSE", 10], ["RING", 12], ["WINE", 14], ["DIAMOND", 8], ["KEY", 10], ["WILD", 4], ["SCAT", 3], ["COIN", 2]
    ], [["WILD", 2], ["SCAT", 1], ["COIN", 1]])
  },
  mode: "paylines",
  symbols: { wild: "WILD", scatters: ["SCAT"] },
  lineRules: {
    lines: 20,
    paylines: DEFAULT_20_LINES,
    paytable: {
      MASK: { 3: 10, 4: 30, 5: 120 },
      ROSE: { 3: 12, 4: 40, 5: 180 },
      RING: { 3: 8, 4: 20, 5: 80 },
      WINE: { 3: 6, 4: 15, 5: 50 },
      DIAMOND: { 3: 14, 4: 50, 5: 200 },
      KEY: { 3: 7, 4: 18, 5: 60 },
      WILD: { 3: 20, 4: 75, 5: 250 }
    }
  },
  features: {
    freeSpins: { id: "freespins", triggerScatterCount: 3, awardSpins: 10, retriggerSpins: 5, multiplier: 2 }
  },
  limits: { maxWinMultiplier: 5000, minBet: 50, maxBet: 5000 }
};

const neonWays = {
  id: "neon_ways_5x3",
  layout: { reels: 5, rows: 3 },
  model: {
    type: "weightedReels",
    reels: repeatedReels(5, [
      ["SAKURA", 14], ["NEON_FOX", 8], ["CIRCUIT", 12], ["KATANA", 10], ["GEM", 12], ["BYTE", 16], ["WILD", 5], ["SCAT", 3]
    ], [["WILD", 1], ["SCAT", 1]])
  },
  mode: "ways",
  symbols: { wild: "WILD", scatters: ["SCAT"] },
  waysRules: {
    minMatch: 3,
    paytable: {
      SAKURA: { 3: 5, 4: 12, 5: 30 },
      NEON_FOX: { 3: 14, 4: 40, 5: 160 },
      CIRCUIT: { 3: 8, 4: 18, 5: 60 },
      KATANA: { 3: 10, 4: 24, 5: 90 },
      GEM: { 3: 7, 4: 16, 5: 55 },
      BYTE: { 3: 6, 4: 14, 5: 48 },
      WILD: { 3: 18, 4: 60, 5: 220 }
    }
  },
  features: {
    freeSpins: { id: "wild_grid", triggerScatterCount: 3, awardSpins: 8, retriggerSpins: 4, multiplier: 2 }
  },
  limits: { maxWinMultiplier: 5000, minBet: 50, maxBet: 5000 }
};

const emberCascade = {
  id: "ember_cascade_5x3",
  layout: { reels: 5, rows: 3 },
  model: {
    type: "weightedReels",
    reels: repeatedReels(5, [
      ["EYE", 12], ["ANKH", 12], ["SCARAB", 10], ["PYRAMID", 14], ["GOLD", 8], ["CROWN", 8], ["WILD", 5], ["SCAT", 4]
    ], [["WILD", 1], ["SCAT", 1]])
  },
  mode: "cascade",
  symbols: { wild: "WILD", scatters: ["SCAT"] },
  lineRules: {
    lines: 20,
    paylines: DEFAULT_20_LINES,
    paytable: {
      EYE: { 3: 6, 4: 16, 5: 55 },
      ANKH: { 3: 6, 4: 16, 5: 55 },
      SCARAB: { 3: 8, 4: 24, 5: 90 },
      PYRAMID: { 3: 7, 4: 20, 5: 70 },
      GOLD: { 3: 12, 4: 40, 5: 160 },
      CROWN: { 3: 14, 4: 55, 5: 220 },
      WILD: { 3: 20, 4: 80, 5: 300 }
    }
  },
  cascadeRules: {
    baseMode: "paylines",
    maxSteps: 5,
    multipliers: [1, 2, 3, 5, 8]
  },
  features: {
    freeSpins: { id: "ember_falls", triggerScatterCount: 3, awardSpins: 8, retriggerSpins: 4, multiplier: 2 }
  },
  limits: { maxWinMultiplier: 5000, minBet: 50, maxBet: 5000 }
};

const royalCluster = {
  id: "royal_cluster_5x3",
  layout: { reels: 5, rows: 3 },
  model: {
    type: "probabilityTable",
    symbols: weightedSet([
      ["CROWN", 10], ["SEAL", 12], ["GEM", 16], ["TORCH", 14], ["BANNER", 18], ["WILD", 4], ["SCAT", 3]
    ])
  },
  mode: "cluster",
  symbols: { wild: "WILD", scatters: ["SCAT"] },
  clusterRules: {
    minClusterSize: 4,
    adjacency: 4,
    maxSteps: 4,
    multipliers: [1, 2, 3, 5],
    paytable: {
      CROWN: { 4: 8, 5: 16, 7: 40, 10: 120 },
      SEAL: { 4: 7, 5: 14, 7: 32, 10: 100 },
      GEM: { 4: 6, 5: 12, 7: 28, 10: 88 },
      TORCH: { 4: 6, 5: 12, 7: 26, 10: 82 },
      BANNER: { 4: 5, 5: 10, 7: 20, 10: 70 },
      WILD: { 4: 10, 5: 22, 7: 55, 10: 150 }
    }
  },
  features: {
    freeSpins: { id: "royal_burst", triggerScatterCount: 3, awardSpins: 6, retriggerSpins: 3, multiplier: 3 }
  },
  limits: { maxWinMultiplier: 5000, minBet: 50, maxBet: 5000 }
};

const SLOT_CONFIGS = {
  noir_paylines_5x3: noirPaylines,
  neon_ways_5x3: neonWays,
  ember_cascade_5x3: emberCascade,
  royal_cluster_5x3: royalCluster
};

const CONFIG_ALIASES = {
  noir_heist_5x3: "noir_paylines_5x3",
  velvet_noir: "noir_paylines_5x3",
  cyber_sakura: "neon_ways_5x3",
  neon_pharaoh: "ember_cascade_5x3",
  emerald_heist: "royal_cluster_5x3",
  crimson_crown: "noir_paylines_5x3",
  abyssal_pearls: "neon_ways_5x3",
  clockwork_vault: "ember_cascade_5x3"
};

function getSlotConfig(configId) {
  const resolved = CONFIG_ALIASES[configId] || configId;
  return SLOT_CONFIGS[resolved] || SLOT_CONFIGS.noir_paylines_5x3;
}

module.exports = {
  SLOT_CONFIGS,
  getSlotConfig
};
