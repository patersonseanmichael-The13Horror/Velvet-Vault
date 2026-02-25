export const DEFAULT_PAYLINES = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0]
];

const clonePaylines = () => DEFAULT_PAYLINES.map((line) => [...line]);

const cfg = (machine) => ({
  ...machine,
  paylines: clonePaylines()
});

export const MACHINE_CONFIGS = [
  cfg({
    id: "machine-01",
    name: "Velvet Neon",
    themeClass: "machine-01",
    description: "High-polish red/green floor classic with frequent line hits.",
    symbols: ["VV", "7", "BAR", "DIA", "CROWN", "HEART", "WILD", "JACK"],
    weights: { VV: 20, "7": 18, BAR: 17, DIA: 14, CROWN: 11, HEART: 13, WILD: 5, JACK: 2 },
    paytable: {
      VV: { 3: 2, 4: 6, 5: 16 },
      "7": { 3: 3, 4: 8, 5: 20 },
      BAR: { 3: 3, 4: 9, 5: 24 },
      DIA: { 3: 4, 4: 11, 5: 28 },
      CROWN: { 3: 5, 4: 13, 5: 32 },
      HEART: { 3: 4, 4: 10, 5: 25 },
      WILD: { 3: 8, 4: 24, 5: 70 },
      JACK: { 3: 12, 4: 42, 5: 160 }
    },
    bet: { min: 100, max: 5000, step: 50, default: 300 },
    volatility: { hitRate: 0.38, nearMissChance: 0.14, jackpotChance: 0.004, payoutMultMin: 1.8, payoutMultMax: 26 },
    soundPreset: { spinHz: 430, winHz: 740, bigWinHz: 960 }
  }),
  cfg({
    id: "machine-02",
    name: "Crimson Cathedral",
    themeClass: "machine-02",
    description: "Dark velvet reels with ritual symbols and bigger peaks.",
    symbols: ["ROSE", "MASK", "LACE", "RING", "RUNE", "CANDLE", "WILD", "JACK"],
    weights: { ROSE: 22, MASK: 18, LACE: 17, RING: 13, RUNE: 10, CANDLE: 11, WILD: 6, JACK: 3 },
    paytable: {
      ROSE: { 3: 2, 4: 6, 5: 15 },
      MASK: { 3: 3, 4: 8, 5: 19 },
      LACE: { 3: 3, 4: 9, 5: 22 },
      RING: { 3: 4, 4: 11, 5: 27 },
      RUNE: { 3: 5, 4: 13, 5: 30 },
      CANDLE: { 3: 5, 4: 14, 5: 34 },
      WILD: { 3: 9, 4: 26, 5: 76 },
      JACK: { 3: 14, 4: 48, 5: 180 }
    },
    bet: { min: 150, max: 6000, step: 50, default: 350 },
    volatility: { hitRate: 0.33, nearMissChance: 0.18, jackpotChance: 0.005, payoutMultMin: 2, payoutMultMax: 32 },
    soundPreset: { spinHz: 380, winHz: 690, bigWinHz: 900 }
  }),
  cfg({
    id: "machine-03",
    name: "Emerald Mirage",
    themeClass: "machine-03",
    description: "Heat-wave desert machine with fast spins and medium variance.",
    symbols: ["PALM", "SUN", "SAND", "COBRA", "OASIS", "SCARAB", "WILD", "JACK"],
    weights: { PALM: 24, SUN: 19, SAND: 18, COBRA: 12, OASIS: 11, SCARAB: 9, WILD: 5, JACK: 2 },
    paytable: {
      PALM: { 3: 2, 4: 5, 5: 14 },
      SUN: { 3: 2, 4: 7, 5: 18 },
      SAND: { 3: 3, 4: 8, 5: 20 },
      COBRA: { 3: 4, 4: 10, 5: 24 },
      OASIS: { 3: 5, 4: 12, 5: 29 },
      SCARAB: { 3: 6, 4: 14, 5: 36 },
      WILD: { 3: 8, 4: 24, 5: 72 },
      JACK: { 3: 12, 4: 40, 5: 155 }
    },
    bet: { min: 100, max: 4500, step: 50, default: 250 },
    volatility: { hitRate: 0.36, nearMissChance: 0.11, jackpotChance: 0.0035, payoutMultMin: 1.5, payoutMultMax: 24 },
    soundPreset: { spinHz: 470, winHz: 760, bigWinHz: 980 }
  }),
  cfg({
    id: "machine-04",
    name: "Midnight Chrome",
    themeClass: "machine-04",
    description: "Industrial cyber reels tuned for low hit, high pressure payouts.",
    symbols: ["X", "NITRO", "GEAR", "NOVA", "CORE", "SPARK", "WILD", "JACK"],
    weights: { X: 18, NITRO: 16, GEAR: 14, NOVA: 12, CORE: 11, SPARK: 10, WILD: 7, JACK: 3 },
    paytable: {
      X: { 3: 3, 4: 8, 5: 20 },
      NITRO: { 3: 4, 4: 10, 5: 24 },
      GEAR: { 3: 4, 4: 11, 5: 28 },
      NOVA: { 3: 5, 4: 13, 5: 33 },
      CORE: { 3: 6, 4: 16, 5: 40 },
      SPARK: { 3: 7, 4: 19, 5: 48 },
      WILD: { 3: 10, 4: 30, 5: 90 },
      JACK: { 3: 18, 4: 62, 5: 230 }
    },
    bet: { min: 200, max: 7000, step: 100, default: 500 },
    volatility: { hitRate: 0.27, nearMissChance: 0.2, jackpotChance: 0.006, payoutMultMin: 2.5, payoutMultMax: 46 },
    soundPreset: { spinHz: 340, winHz: 620, bigWinHz: 840 }
  }),
  cfg({
    id: "machine-05",
    name: "Golden Syndicate",
    vip: true,
    themeClass: "machine-05",
    description: "High-limit board with elegant odds and rare top-end bursts.",
    symbols: ["ACE", "KING", "QUEEN", "CHIP", "GOLD", "CASH", "WILD", "JACK"],
    weights: { ACE: 20, KING: 18, QUEEN: 16, CHIP: 13, GOLD: 11, CASH: 9, WILD: 6, JACK: 3 },
    paytable: {
      ACE: { 3: 3, 4: 8, 5: 22 },
      KING: { 3: 4, 4: 10, 5: 26 },
      QUEEN: { 3: 4, 4: 11, 5: 29 },
      CHIP: { 3: 5, 4: 14, 5: 35 },
      GOLD: { 3: 6, 4: 18, 5: 44 },
      CASH: { 3: 8, 4: 22, 5: 52 },
      WILD: { 3: 11, 4: 32, 5: 98 },
      JACK: { 3: 20, 4: 70, 5: 260 }
    },
    bet: { min: 250, max: 10000, step: 100, default: 600 },
    volatility: { hitRate: 0.25, nearMissChance: 0.22, jackpotChance: 0.007, payoutMultMin: 3, payoutMultMax: 55 },
    soundPreset: { spinHz: 320, winHz: 590, bigWinHz: 820 }
  }),
  cfg({
    id: "machine-06",
    name: "Neon Koi",
    themeClass: "machine-06",
    description: "Fluid reels with soft volatility and steady medium wins.",
    symbols: ["KOI", "WAVE", "LANTN", "BLOSSM", "MOON", "PEARL", "WILD", "JACK"],
    weights: { KOI: 25, WAVE: 19, LANTN: 16, BLOSSM: 14, MOON: 11, PEARL: 9, WILD: 4, JACK: 2 },
    paytable: {
      KOI: { 3: 2, 4: 5, 5: 13 },
      WAVE: { 3: 2, 4: 6, 5: 16 },
      LANTN: { 3: 3, 4: 8, 5: 20 },
      BLOSSM: { 3: 4, 4: 10, 5: 24 },
      MOON: { 3: 5, 4: 12, 5: 28 },
      PEARL: { 3: 6, 4: 15, 5: 34 },
      WILD: { 3: 8, 4: 23, 5: 68 },
      JACK: { 3: 12, 4: 40, 5: 150 }
    },
    bet: { min: 100, max: 5000, step: 50, default: 250 },
    volatility: { hitRate: 0.37, nearMissChance: 0.1, jackpotChance: 0.003, payoutMultMin: 1.4, payoutMultMax: 22 },
    soundPreset: { spinHz: 500, winHz: 780, bigWinHz: 1020 }
  }),
  cfg({
    id: "machine-07",
    name: "Arc Light",
    vip: true,
    themeClass: "machine-07",
    description: "Electric sci-fi machine tuned for swingy outcomes.",
    symbols: ["ATOM", "ION", "LASER", "GRID", "PULSE", "QUARK", "WILD", "JACK"],
    weights: { ATOM: 19, ION: 16, LASER: 15, GRID: 13, PULSE: 11, QUARK: 10, WILD: 6, JACK: 2 },
    paytable: {
      ATOM: { 3: 3, 4: 8, 5: 21 },
      ION: { 3: 4, 4: 10, 5: 25 },
      LASER: { 3: 4, 4: 12, 5: 30 },
      GRID: { 3: 5, 4: 14, 5: 35 },
      PULSE: { 3: 6, 4: 17, 5: 42 },
      QUARK: { 3: 8, 4: 22, 5: 54 },
      WILD: { 3: 11, 4: 31, 5: 92 },
      JACK: { 3: 18, 4: 64, 5: 240 }
    },
    bet: { min: 200, max: 9000, step: 100, default: 500 },
    volatility: { hitRate: 0.29, nearMissChance: 0.19, jackpotChance: 0.0065, payoutMultMin: 2.6, payoutMultMax: 50 },
    soundPreset: { spinHz: 360, winHz: 640, bigWinHz: 870 }
  }),
  cfg({
    id: "machine-08",
    name: "Vintage Velvet",
    themeClass: "machine-08",
    description: "Retro fruit board with old-school pacing and warm lights.",
    symbols: ["CHRY", "BELL", "HORSE", "LEMON", "PLUM", "MELON", "WILD", "JACK"],
    weights: { CHRY: 24, BELL: 18, HORSE: 16, LEMON: 14, PLUM: 12, MELON: 10, WILD: 4, JACK: 2 },
    paytable: {
      CHRY: { 3: 2, 4: 5, 5: 14 },
      BELL: { 3: 3, 4: 7, 5: 18 },
      HORSE: { 3: 3, 4: 9, 5: 22 },
      LEMON: { 3: 4, 4: 11, 5: 26 },
      PLUM: { 3: 5, 4: 13, 5: 30 },
      MELON: { 3: 6, 4: 16, 5: 38 },
      WILD: { 3: 8, 4: 24, 5: 72 },
      JACK: { 3: 14, 4: 46, 5: 170 }
    },
    bet: { min: 100, max: 4500, step: 50, default: 250 },
    volatility: { hitRate: 0.35, nearMissChance: 0.13, jackpotChance: 0.004, payoutMultMin: 1.7, payoutMultMax: 27 },
    soundPreset: { spinHz: 460, winHz: 730, bigWinHz: 940 }
  }),
  cfg({
    id: "machine-09",
    name: "Obsidian Oracle",
    vip: true,
    themeClass: "machine-09",
    description: "Occult machine with sparse hits and heavy spike potential.",
    symbols: ["EYE", "SKULL", "ORB", "TAROT", "SIGIL", "RAVEN", "WILD", "JACK"],
    weights: { EYE: 18, SKULL: 16, ORB: 14, TAROT: 12, SIGIL: 11, RAVEN: 9, WILD: 7, JACK: 3 },
    paytable: {
      EYE: { 3: 3, 4: 9, 5: 22 },
      SKULL: { 3: 4, 4: 11, 5: 27 },
      ORB: { 3: 5, 4: 13, 5: 32 },
      TAROT: { 3: 6, 4: 16, 5: 40 },
      SIGIL: { 3: 7, 4: 20, 5: 50 },
      RAVEN: { 3: 9, 4: 26, 5: 64 },
      WILD: { 3: 12, 4: 36, 5: 108 },
      JACK: { 3: 22, 4: 78, 5: 280 }
    },
    bet: { min: 250, max: 10000, step: 100, default: 700 },
    volatility: { hitRate: 0.22, nearMissChance: 0.24, jackpotChance: 0.008, payoutMultMin: 3.2, payoutMultMax: 62 },
    soundPreset: { spinHz: 300, winHz: 560, bigWinHz: 780 }
  }),
  cfg({
    id: "machine-10",
    name: "Starlight Heist",
    vip: true,
    themeClass: "machine-10",
    description: "High-energy finale machine with dramatic near-misses.",
    symbols: ["STAR", "SAFE", "GEM", "DRONE", "LASER", "MAP", "WILD", "JACK"],
    weights: { STAR: 19, SAFE: 17, GEM: 15, DRONE: 13, LASER: 11, MAP: 10, WILD: 6, JACK: 3 },
    paytable: {
      STAR: { 3: 3, 4: 8, 5: 21 },
      SAFE: { 3: 4, 4: 10, 5: 25 },
      GEM: { 3: 5, 4: 12, 5: 30 },
      DRONE: { 3: 6, 4: 15, 5: 38 },
      LASER: { 3: 7, 4: 18, 5: 45 },
      MAP: { 3: 8, 4: 22, 5: 56 },
      WILD: { 3: 11, 4: 33, 5: 100 },
      JACK: { 3: 20, 4: 72, 5: 260 }
    },
    bet: { min: 200, max: 8500, step: 100, default: 600 },
    volatility: { hitRate: 0.28, nearMissChance: 0.21, jackpotChance: 0.007, payoutMultMin: 2.8, payoutMultMax: 54 },
    soundPreset: { spinHz: 345, winHz: 610, bigWinHz: 860 }
  })
];

export function getMachineConfig(id) {
  return MACHINE_CONFIGS.find((m) => m.id === id) || MACHINE_CONFIGS[0];
}
