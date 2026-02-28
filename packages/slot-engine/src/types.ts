export type SymbolId = string;

export type RNG = {
  /** returns float in [0, 1) */
  nextFloat(): number;
  /** returns int in [0, maxExclusive) */
  nextInt(maxExclusive: number): number;
};

export type SpinMode = "paylines";

export type ReelSet = {
  /**
   * For 5x3 classic: reels length = 5; each reel array is a "strip" of symbol ids.
   * We sample a stop index then take consecutive `rows` symbols (wrapping).
   */
  reels: SymbolId[][];
};

export type Paytable = Record<SymbolId, Record<number, number>>;

export type WildRules = {
  wildSymbol: SymbolId;
  /**
   * symbols that wild can substitute for. Default: all except scatters and wild itself.
   */
  substitutesFor?: SymbolId[];
};

export type ScatterRules = {
  scatterSymbol: SymbolId;
  /** pay-anywhere payout multipliers by count */
  paytable: Record<number, number>;
  /** optional: if you want to treat scatter as also feature trigger (not implemented here) */
  triggers?: {
    count: number;
    type: "freespins";
    value: number;
  };
};

export type PaylinesRules = {
  /**
   * Lines are arrays of row indices (0..rows-1) for each reel.
   * Example 5 reels: [1,1,1,1,1] = middle line.
   */
  lines: number[][];
};

export type Layout = { reels: number; rows: number };

export type Bet = {
  /**
   * total bet per spin in smallest currency unit (e.g., cents) OR in credits,
   * depending on your wallet. Engine treats it as integer stake units.
   */
  stake: number;
  /**
   * optional denomination multiplier. If your stake is in "credits", denom converts to money.
   * The engine only uses stake for payouts; denom is metadata for audit/UI.
   */
  denom?: number;
};

export type MachineConfig = {
  id: string;
  version: string;
  mode: SpinMode;

  layout: Layout;

  reelSet: ReelSet;

  paylines: PaylinesRules;

  paytable: Paytable;

  wild?: WildRules;

  scatter?: ScatterRules;

  limits?: {
    maxWinMultiplier?: number;
    maxPayout?: number;
  };
};

export type SpinRequest = {
  machine: MachineConfig;
  bet: Bet;
  /** for deterministic tests/replays. If omitted, use secure RNG. */
  seed?: string;
  /** optional requestId for tracing */
  requestId?: string;
};

export type Grid = SymbolId[][];

export type LineWin = {
  lineIndex: number;
  symbol: SymbolId;
  count: number;
  payoutMultiplier: number;
  payout: number;
  positions: Array<{ reel: number; row: number }>;
};

export type ScatterWin = {
  symbol: SymbolId;
  count: number;
  payoutMultiplier: number;
  payout: number;
  positions: Array<{ reel: number; row: number }>;
};

export type SpinOutcome = {
  grid: Grid;
  lineWins: LineWin[];
  scatterWin?: ScatterWin;
  totalPayout: number;
  totalPayoutMultiplier: number;
  capped?: {
    reason: "maxWinMultiplier" | "maxPayout";
    originalPayout: number;
  };
};

export type AuditRecord = {
  machineId: string;
  machineVersion: string;
  configHash: string;
  seedUsed: string;
  bet: Bet;
  requestId?: string;
  timestampMs: number;
};

export type SpinResult = {
  audit: AuditRecord;
  outcome: SpinOutcome;
};
