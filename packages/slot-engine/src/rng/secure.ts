import { webcrypto } from "node:crypto";
import type { RNG } from "../types.js";

/**
 * Secure RNG wrapper.
 * - In Node: uses globalThis.crypto.getRandomValues (Node 19+), else throws.
 * If you need broader compatibility, polyfill with `import { webcrypto } from "crypto"`.
 */
export function createSecureRNG(): RNG {
  const cryptoObj = globalThis.crypto ?? webcrypto;
  if (!cryptoObj?.getRandomValues) {
    throw new Error("Secure RNG unavailable: globalThis.crypto.getRandomValues not found.");
  }

  return {
    nextFloat(): number {
      const buf = new Uint32Array(1);
      cryptoObj.getRandomValues(buf);
      return buf[0]! / 4294967296;
    },
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new Error("maxExclusive must be a positive integer");
      }
      const range = 0x100000000;
      const limit = range - (range % maxExclusive);
      const buf = new Uint32Array(1);
      while (true) {
        cryptoObj.getRandomValues(buf);
        const x = buf[0]!;
        if (x < limit) return x % maxExclusive;
      }
    }
  };
}
