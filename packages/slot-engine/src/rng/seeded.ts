import type { RNG } from "../types.js";

/**
 * Deterministic PRNG: Mulberry32 seeded by 32-bit hash of seed string.
 * Suitable for testing/replay; do NOT use as your sole source of entropy in production.
 */
function xmur3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRNG(seed: string): RNG {
  const seed32 = xmur3(seed);
  const next = mulberry32(seed32);

  return {
    nextFloat(): number {
      return next();
    },
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new Error("maxExclusive must be a positive integer");
      }
      return Math.floor(next() * maxExclusive);
    }
  };
}
