import { z } from "zod";

const SymbolId = z.string().min(1);

const ReelSet = z.object({
  reels: z.array(z.array(SymbolId).min(1)).min(1)
});

const Paytable = z.record(SymbolId, z.record(z.coerce.number().int().positive(), z.coerce.number().nonnegative()));

const WildRules = z.object({
  wildSymbol: SymbolId,
  substitutesFor: z.array(SymbolId).optional()
});

const ScatterRules = z.object({
  scatterSymbol: SymbolId,
  paytable: z.record(z.coerce.number().int().positive(), z.coerce.number().nonnegative()),
  triggers: z
    .object({
      count: z.number().int().positive(),
      type: z.literal("freespins"),
      value: z.number().int().positive()
    })
    .optional()
});

const PaylinesRules = z.object({
  lines: z.array(z.array(z.number().int().nonnegative()).min(1)).min(1)
});

export const MachineConfigSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  mode: z.literal("paylines"),
  layout: z.object({
    reels: z.number().int().positive(),
    rows: z.number().int().positive()
  }),
  reelSet: ReelSet,
  paylines: PaylinesRules,
  paytable: Paytable,
  wild: WildRules.optional(),
  scatter: ScatterRules.optional(),
  limits: z
    .object({
      maxWinMultiplier: z.number().positive().optional(),
      maxPayout: z.number().int().positive().optional()
    })
    .optional()
});

export type MachineConfigFromSchema = z.infer<typeof MachineConfigSchema>;
