import type { Grid, MachineConfig, RNG, SymbolId } from "../types.js";
import { sampleSymbol } from "../factory/symbolFactory.js";
import { ConfigError } from "../errors.js";

export function validateReelSet(config: MachineConfig): void {
  const { reels, rows } = config.layout;
  if (config.reelSet.reels.length !== reels) {
    throw new ConfigError(`reelSet.reels length ${config.reelSet.reels.length} != layout.reels ${reels}`);
  }
  for (let i = 0; i < reels; i++) {
    const strip = config.reelSet.reels[i]!;
    if (strip.length < rows) {
      throw new ConfigError(`reel ${i} strip length ${strip.length} < layout.rows ${rows}`);
    }
  }
}

export function sampleGrid(config: MachineConfig, rng: RNG): Grid {
  validateReelSet(config);

  const { reels, rows } = config.layout;
  const grid: SymbolId[][] = [];

  const hasBaseFactory = Boolean(config.factoryProfiles?.base);

  if (hasBaseFactory) {
    for (let r = 0; r < reels; r++) {
      const col: SymbolId[] = [];
      for (let row = 0; row < rows; row++) {
        col.push(
          sampleSymbol({
            machine: config,
            rng,
            reelIndex: r,
            ctx: { profile: "base", reelIndex: r }
          })
        );
      }
      grid.push(col);
    }
    return grid;
  }

  for (let r = 0; r < reels; r++) {
    const strip = config.reelSet.reels[r]!;
    const stop = rng.nextInt(strip.length);
    const col: SymbolId[] = [];
    for (let row = 0; row < rows; row++) {
      col.push(strip[(stop + row) % strip.length]!);
    }
    grid.push(col);
  }

  return grid;
}
