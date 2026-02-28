import { z } from "zod";

const SymbolId = z.string().min(1);

const ReelSet = z.object({
  reels: z.array(z.array(SymbolId).min(1)).min(1)
});

const WeightedSymbols = z.object({
  symbols: z.array(z.object({ id: SymbolId, weight: z.number().positive() })).min(1)
});

const FactoryReel = z.discriminatedUnion("type", [
  z.object({ type: z.literal("strip"), strip: z.array(SymbolId).min(1) }),
  z.object({ type: z.literal("weights"), weights: WeightedSymbols })
]);

const FactoryProfile = z.object({
  reels: z.array(FactoryReel).min(1)
});

const FactoryProfiles = z.object({
  base: FactoryProfile.optional(),
  refill: FactoryProfile.optional(),
  bonus: FactoryProfile.optional(),
  freeSpins: FactoryProfile.optional()
});

const Paytable = z.record(SymbolId, z.record(z.coerce.number().int().positive(), z.coerce.number().nonnegative()));

const WildRules = z.object({
  wildSymbol: SymbolId,
  substitutesFor: z.array(SymbolId).optional()
});

const ScatterTrigger = z.object({
  count: z.number().int().positive(),
  type: z.literal("freespins"),
  value: z.number().int().positive()
});

const ScatterRules = z.object({
  scatterSymbol: SymbolId,
  paytable: z.record(z.coerce.number().int().positive(), z.coerce.number().nonnegative()),
  triggers: z.array(ScatterTrigger).optional()
});

const PaylinesRules = z.object({
  lines: z.array(z.array(z.number().int().nonnegative()).min(1)).min(1)
});

const WaysRules = z.object({
  minCount: z.number().int().min(2).default(3),
  leftToRightOnly: z.boolean().default(true)
});

const ClusterRules = z.object({
  enabled: z.boolean().default(true),
  /** minimum cluster size to pay */
  minClusterSize: z.number().int().positive().default(5),
  adjacency: z.union([z.literal(4), z.literal(8)]).default(4),
  /**
   * which symbols participate in clusters:
   * - "allPaytableSymbols" default
   * - or explicitly list symbols
   */
  symbols: z
    .union([z.literal("allPaytableSymbols"), z.array(SymbolId).min(1)])
    .default("allPaytableSymbols"),
  /** if true: wild joins any cluster (treats wild as matching neighbor); default false */
  wildJoinsAll: z.boolean().default(false)
});

const ClusterSpecialsRules = z.object({
  enabled: z.boolean().default(true),

  bombSymbol: SymbolId.default("X"),
  bombRadius: z.number().int().min(1).max(3).default(1),

  wildBombSymbol: SymbolId.default("WX"),
  wildBombRadius: z.number().int().min(1).max(3).default(2),

  transformSymbol: SymbolId.default("T"),
  transformRadius: z.number().int().min(1).max(3).default(1),
  transformTo: SymbolId.default("A")
});

const FreeSpinsMultiplierProgression = z.discriminatedUnion("type", [
  z.object({ type: z.literal("fixed"), value: z.number().positive().default(1) }),
  z.object({
    type: z.literal("increment"),
    start: z.number().positive().default(1),
    step: z.number().positive().default(1),
    cap: z.number().positive().optional()
  }),
  z.object({
    type: z.literal("sequence"),
    values: z.array(z.number().positive()).min(1),
    clamp: z.boolean().default(true)
  })
]);

const FreeSpinsFeature = z.object({
  enabled: z.boolean().default(true),
  multiplierProgression: FreeSpinsMultiplierProgression.optional()
});

const BonusBuyRules = z.object({
  enabled: z.boolean().default(false),
  freeSpinsCostMultiplier: z.number().positive().default(50),
  bonusCostMultiplier: z.number().positive().default(80)
});

/** HOLD & SPIN bonus config (server-authoritative) */
const HoldAndSpinBonus = z.object({
  enabled: z.boolean().default(true),
  bonusSymbol: SymbolId.default("B"),
  triggerCount: z.number().int().positive().default(6),
  respins: z.number().int().positive().default(3),
  /** probability [0..1] per empty cell per respin that a bonus symbol lands */
  landChance: z.number().min(0).max(1).default(0.15),
  /** bonus symbol values in stake-multipliers (e.g. 1..20) with weights */
  values: z.array(z.object({ value: z.number().positive(), weight: z.number().positive() })).min(1)
});

const BonusFeature = z.object({
  holdAndSpin: HoldAndSpinBonus.optional()
});

const CascadeMultiplierProgression = z.discriminatedUnion("type", [
  z.object({ type: z.literal("fixed"), value: z.number().positive().default(1) }),
  z.object({
    type: z.literal("increment"),
    start: z.number().positive().default(1),
    step: z.number().positive().default(1),
    cap: z.number().positive().optional()
  })
]);

const CascadeRules = z.object({
  enabled: z.boolean().default(true),
  /** remove symbols involved in any line win, then drop+refill */
  removeWinningSymbols: z.boolean().default(true),
  /** optional multiplier progression per cascade step (step 0 = first eval) */
  multiplierProgression: CascadeMultiplierProgression.optional(),
  /** safety max loop to avoid infinite */
  maxSteps: z.number().int().positive().default(50)
});

const ClusterCascadeRules = z.object({
  enabled: z.boolean().default(true),
  multiplierProgression: CascadeMultiplierProgression.optional(),
  maxSteps: z.number().int().positive().default(50)
});

const AvalancheRules = z.object({
  enabled: z.boolean().default(true),
  stickyWild: z.boolean().default(true),
  stickyWildSymbol: SymbolId.default("W"),
  multiplierProgression: CascadeMultiplierProgression.optional(),
  maxSteps: z.number().int().positive().default(50)
});

const ProvablyFairRules = z.object({
  enabled: z.boolean().default(true)
});

export const MachineConfigSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),

  mode: z.union([z.literal("paylines"), z.literal("ways"), z.literal("cascade"), z.literal("cluster"), z.literal("cluster_cascade"), z.literal("avalanche")]),

  layout: z.object({
    reels: z.number().int().positive(),
    rows: z.number().int().positive()
  }),

  reelSet: ReelSet,
  factoryProfiles: FactoryProfiles.optional(),

  paylines: PaylinesRules.optional(),
  ways: WaysRules.optional(),
  cluster: ClusterRules.optional(),

  paytable: Paytable,
  wild: WildRules.optional(),
  scatter: ScatterRules.optional(),

  features: z
    .object({
      freeSpins: FreeSpinsFeature.optional(),
      bonusBuy: BonusBuyRules.optional(),
      bonus: BonusFeature.optional(),
      cascade: CascadeRules.optional(),
      avalanche: AvalancheRules.optional(),
      cluster: ClusterRules.optional(),
      clusterCascade: ClusterCascadeRules.optional(),
      clusterSpecials: ClusterSpecialsRules.optional(),
      provablyFair: ProvablyFairRules.optional()
    })
    .optional(),

  limits: z
    .object({
      maxWinMultiplier: z.number().positive().optional(),
      maxPayout: z.number().int().positive().optional()
    })
    .optional()
});

export type MachineConfigFromSchema = z.infer<typeof MachineConfigSchema>;
