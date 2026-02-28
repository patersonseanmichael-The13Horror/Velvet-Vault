import type { FactoryProfile, MachineConfig, RNG, SymbolId } from "../types.js";
import { stableStringify, fnv1a32 } from "../util/hash.js";
import { ConfigError } from "../errors.js";

export type FactoryProfileName = "base" | "refill" | "bonus" | "freeSpins";

export type FactoryContext = {
  profile: FactoryProfileName;
  reelIndex: number;
  stepIndex?: number;
  isFreeSpin?: boolean;
  inBonus?: boolean;
};

function pickWeighted(rng: RNG, items: Array<{ id: SymbolId; weight: number }>): SymbolId {
  let total = 0;
  for (const it of items) total += it.weight;
  const roll = rng.nextFloat() * total;
  let acc = 0;
  for (const it of items) {
    acc += it.weight;
    if (roll < acc) return it.id;
  }
  return items[items.length - 1]!.id;
}

/**
 * Resolve which profile to use. Falls back to machine.reelSet if no factory profile exists.
 */
export function resolveFactoryProfile(machine: MachineConfig, profile: FactoryProfileName): FactoryProfile | undefined {
  return machine.factoryProfiles?.[profile];
}

export function factoryProfileHash(profile: FactoryProfile): string {
  return fnv1a32(stableStringify(profile));
}

/**
 * Sample a symbol for a given reel from a factory profile.
 * If no profile exists, fall back to machine reelSet strip.
 */
export function sampleSymbol(args: {
  machine: MachineConfig;
  rng: RNG;
  reelIndex: number;
  ctx: FactoryContext;
}): SymbolId {
  const p = resolveFactoryProfile(args.machine, args.ctx.profile);

  if (!p) {
    const strip = args.machine.reelSet.reels[args.reelIndex];
    if (!strip?.length) throw new ConfigError(`Missing reel strip at ${args.reelIndex}`);
    return strip[args.rng.nextInt(strip.length)]!;
  }

  const reel = p.reels[args.reelIndex];
  if (!reel) throw new ConfigError(`Factory profile '${args.ctx.profile}' missing reel index ${args.reelIndex}`);

  if (reel.type === "strip") {
    if (!reel.strip.length) throw new ConfigError("Factory strip is empty");
    return reel.strip[args.rng.nextInt(reel.strip.length)]!;
  }

  const syms = reel.weights.symbols;
  if (!syms.length) throw new ConfigError("Factory weights empty");
  return pickWeighted(args.rng, syms);
}
