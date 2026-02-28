import { createHash, randomBytes } from "node:crypto";
import type { RNG } from "../types.js";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function sha256Bytes(input: string): Uint8Array<ArrayBufferLike> {
  return createHash("sha256").update(input, "utf8").digest();
}

export function createServerSeed(): string {
  return randomBytes(32).toString("hex");
}

export function commitServerSeed(serverSeed: string): string {
  return sha256Hex(serverSeed);
}

/**
 * Provably fair RNG:
 * random block = SHA256(serverSeed + ":" + clientSeed + ":" + nonce + ":" + counter)
 * We consume 4 bytes at a time for uint32.
 */
export function createProvablyFairRNG(args: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}): RNG & { serverSeedHash: string } {
  const serverSeedHash = commitServerSeed(args.serverSeed);
  let counter = 0;

  let buf: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
  let idx = 0;

  function refill(): void {
    const input = `${args.serverSeed}:${args.clientSeed}:${args.nonce}:${counter}`;
    buf = sha256Bytes(input);
    idx = 0;
    counter++;
  }

  function nextUint32(): number {
    if (idx + 4 > buf.length) refill();
    const a = buf[idx++]!;
    const b = buf[idx++]!;
    const c = buf[idx++]!;
    const d = buf[idx++]!;
    // big-endian
    return (((a << 24) | (b << 16) | (c << 8) | d) >>> 0);
  }

  // initial fill
  refill();

  return {
    serverSeedHash,
    nextFloat(): number {
      return nextUint32() / 4294967296;
    },
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new Error("maxExclusive must be a positive integer");
      }
      // rejection sampling to reduce modulo bias
      const range = 0x100000000;
      const limit = range - (range % maxExclusive);
      while (true) {
        const x = nextUint32();
        if (x < limit) return x % maxExclusive;
      }
    }
  };
}
