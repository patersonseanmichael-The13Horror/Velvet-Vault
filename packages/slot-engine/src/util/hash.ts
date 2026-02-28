/**
 * Lightweight, deterministic non-crypto hash for config fingerprinting.
 * For compliance-grade tamper resistance, replace with SHA-256 in your backend.
 */
export function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, (_k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const rec = v as Record<string, unknown>;
      return Object.keys(rec)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = rec[key];
          return acc;
        }, {});
    }
    return v;
  });
}
