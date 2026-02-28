export type SymbolId = string;

export type RNG = {
  nextFloat(): number;
  nextInt(maxExclusive: number): number;
};

export type SpinMode = "paylines" | "ways" | "cascade" | "cluster" | "cluster_cascade" | "avalanche";

export type ReelSet = { reels: SymbolId[][] };
export type FactoryReel =
  | { type: "strip"; strip: SymbolId[] }
  | { type: "weights"; weights: { symbols: Array<{ id: SymbolId; weight: number }> } };

export type FactoryProfile = { reels: FactoryReel[] };

export type FactoryProfiles = {
  base?: FactoryProfile;
  refill?: FactoryProfile;
  bonus?: FactoryProfile;
  freeSpins?: FactoryProfile;
};

export type Paytable = Record<SymbolId, Record<number, number>>;

export type WildRules = {
  wildSymbol: SymbolId;
  substitutesFor?: SymbolId[];
};

export type ScatterTrigger = { count: number; type: "freespins"; value: number };

export type ScatterRules = {
  scatterSymbol: SymbolId;
  paytable: Record<number, number>;
  triggers?: ScatterTrigger[];
};

export type PaylinesRules = { lines: number[][] };

export type WaysRules = {
  minCount: number;
  leftToRightOnly: boolean;
};

export type ClusterRules = {
  enabled: boolean;
  minClusterSize: number;
  adjacency: 4 | 8;
  symbols: "allPaytableSymbols" | SymbolId[];
  wildJoinsAll: boolean;
};

export type Layout = { reels: number; rows: number };
export type Bet = { stake: number; denom?: number };

export type FreeSpinsMultiplierProgression =
  | { type: "fixed"; value: number }
  | { type: "increment"; start: number; step: number; cap?: number }
  | { type: "sequence"; values: number[]; clamp: boolean };

export type CascadeMultiplierProgression =
  | { type: "fixed"; value: number }
  | { type: "increment"; start: number; step: number; cap?: number };

export type FeatureConfig = {
  freeSpins?: { enabled?: boolean; multiplierProgression?: FreeSpinsMultiplierProgression };
  bonusBuy?: { enabled?: boolean; freeSpinsCostMultiplier?: number; bonusCostMultiplier?: number };
  bonus?: {
    holdAndSpin?: {
      enabled?: boolean;
      bonusSymbol?: SymbolId;
      triggerCount?: number;
      respins?: number;
      landChance?: number;
      values?: Array<{ value: number; weight: number }>;
    };
  };
  cascade?: {
    enabled?: boolean;
    removeWinningSymbols?: boolean;
    multiplierProgression?: CascadeMultiplierProgression;
    maxSteps?: number;
  };
  avalanche?: {
    enabled?: boolean;
    stickyWild?: boolean;
    stickyWildSymbol?: SymbolId;
    multiplierProgression?: CascadeMultiplierProgression;
    maxSteps?: number;
  };
  cluster?: {
    enabled?: boolean;
    minClusterSize?: number;
    adjacency?: 4 | 8;
    symbols?: "allPaytableSymbols" | SymbolId[];
    wildJoinsAll?: boolean;
  };
  clusterCascade?: {
    enabled?: boolean;
    multiplierProgression?: CascadeMultiplierProgression;
    maxSteps?: number;
  };
  clusterSpecials?: {
    enabled?: boolean;
    bombSymbol?: SymbolId;
    bombRadius?: number;
    wildBombSymbol?: SymbolId;
    wildBombRadius?: number;
    transformSymbol?: SymbolId;
    transformRadius?: number;
    transformTo?: SymbolId;
  };
  provablyFair?: { enabled?: boolean };
};

export type MachineConfig = {
  id: string;
  version: string;
  mode: SpinMode;

  layout: Layout;
  reelSet: ReelSet;
  factoryProfiles?: FactoryProfiles;

  paylines?: PaylinesRules; // required for paylines/cascade
  ways?: WaysRules; // required for ways
  cluster?: ClusterRules; // legacy location; prefer features.cluster

  paytable: Paytable;
  wild?: WildRules;
  scatter?: ScatterRules;

  features?: FeatureConfig;

  limits?: { maxWinMultiplier?: number; maxPayout?: number };
};

/** Bonus session state: Hold & Spin */
export type HoldAndSpinState = {
  active: boolean;
  respinsRemaining: number;
  /** locked bonus values per position, null = empty */
  locked: Array<Array<number | null>>; // [reel][row] stake-multiplier values
};

export type FeatureState = {
  freeSpinsRemaining: number;
  freeSpinsConsumed: number;
  bonus?: HoldAndSpinState;
};

export type BonusBuyRequest =
  | { type: "freespins"; costMultiplier?: number }
  | { type: "bonus"; costMultiplier?: number };

export type ProvablyFairInput = {
  /** client seed provided by player */
  clientSeed: string;
  /** per-user incrementing nonce (server tracked) or supplied for replay */
  nonce: number;
  /** optional server seed hash (commit) - server returns it */
  serverSeedHash?: string;
  /** optional server seed (reveal) - for replay/verification */
  serverSeed?: string;
};

export type SpinRequest = {
  machine: MachineConfig;
  bet: Bet;

  /** deterministic testing seed (legacy) */
  seed?: string;

  requestId?: string;

  state?: FeatureState;
  bonusBuy?: BonusBuyRequest;

  /** provably fair mode: preferred in production */
  provablyFair?: ProvablyFairInput;
};

export type Grid = SymbolId[][]; // [reel][row]

export type LineWin = {
  lineIndex: number;
  symbol: SymbolId;
  count: number;
  payoutMultiplier: number;
  payout: number;
  positions: Array<{ reel: number; row: number }>;
};

export type WaysWin = {
  symbol: SymbolId;
  count: number;
  ways: number;
  payoutMultiplier: number;
  payout: number;
  positionsByReel: Array<Array<{ reel: number; row: number }>>;
};

export type ScatterWin = {
  symbol: SymbolId;
  count: number;
  payoutMultiplier: number;
  payout: number;
  positions: Array<{ reel: number; row: number }>;
};

export type ClusterWin = {
  symbol: SymbolId;
  size: number;
  payoutMultiplier: number;
  payout: number;
  positions: Array<{ reel: number; row: number }>;
};

export type SpecialEffect =
  | { type: "bomb"; center: { reel: number; row: number }; radius: number; removed: Array<{ reel: number; row: number }> }
  | { type: "wildBomb"; center: { reel: number; row: number }; radius: number; removed: Array<{ reel: number; row: number }> }
  | { type: "transform"; center: { reel: number; row: number }; radius: number; to: SymbolId; transformed: Array<{ reel: number; row: number }> };

export type ClusterCascadeStep = {
  stepIndex: number;
  grid: Grid;
  clusterWins: ClusterWin[];
  basePayout: number;
  stepMultiplier: number;
  stepPayout: number;
  removedPositions: Array<{ reel: number; row: number }>;
  effects?: SpecialEffect[];
};

export type CascadeStep = {
  stepIndex: number;
  grid: Grid;
  lineWins?: LineWin[];
  clusterWins?: ClusterWin[];
  scatterWin?: ScatterWin;
  basePayout: number;
  stepMultiplier: number;
  stepPayout: number;
  removedPositions: Array<{ reel: number; row: number }>;
};

export type BonusStep = {
  respinIndex: number;
  landed: Array<{ reel: number; row: number; valueMultiplier: number }>;
  lockedSnapshot: Array<Array<number | null>>;
};

export type FeatureEvents = {
  enteredFreeSpins?: { awarded: number };
  retriggeredFreeSpins?: { awarded: number };
  consumedFreeSpin?: boolean;

  bonusBuyActivated?: { type: "freespins" | "bonus"; awarded: number; cost: number };

  enteredBonus?: { type: "holdAndSpin"; respins: number };
  bonusEnded?: { payout: number };
};

export type SpinCost = {
  stakeCharged: boolean;
  stakeToCharge: number;
  bonusBuyCost?: number;
};

export type SpinBreakdown = {
  base: number;
  scatters: number;
  freeSpinBonus: number;
  bonus: number;
  cascades: number;
  clusters: number;
  specials: number;
};

export type SpinOutcome = {
  grid: Grid;

  lineWins?: LineWin[];
  waysWins?: WaysWin[];
  clusterWins?: ClusterWin[];
  scatterWin?: ScatterWin;

  /** If cascade mode */
  cascades?: CascadeStep[];
  clusterCascades?: ClusterCascadeStep[];
  specialEffects?: SpecialEffect[];

  /** If bonus triggered/active */
  bonus?: {
    type: "holdAndSpin";
    steps: BonusStep[];
    payout: number;
  };

  basePayout: number;

  winMultiplierApplied: number;
  totalPayout: number;
  totalPayoutMultiplier: number;

  isFreeSpin: boolean;

  cost: SpinCost;

  featureEvents?: FeatureEvents;

  breakdown?: SpinBreakdown;

  capped?: { reason: "maxWinMultiplier" | "maxPayout"; originalPayout: number };
};

export type ProvablyFairAudit = {
  enabled: boolean;
  clientSeed?: string;
  nonce?: number;
  serverSeedHash?: string;
  serverSeedReveal?: string;
};

export type AuditRecord = {
  machineId: string;
  machineVersion: string;
  configHash: string;
  seedUsed: string;
  bet: Bet;
  requestId?: string;
  timestampMs: number;

  stateIn: FeatureState;
  stateOut: FeatureState;

  bonusBuyIn?: BonusBuyRequest;

  factory?: {
    usedProfiles: string[];
    profileHashes: Record<string, string>;
  };

  provablyFair?: ProvablyFairAudit;
};

export type SpinResult = {
  audit: AuditRecord;
  outcome: SpinOutcome;
  nextState: FeatureState;
};
