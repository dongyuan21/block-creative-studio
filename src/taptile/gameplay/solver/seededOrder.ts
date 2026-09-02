/** A path-derived PRNG rank. It is deterministic and independent of expansion order. */
export function seededPathRank(seed: number, path: readonly string[]): number {
  let value = (seed | 0) ^ 0x9e3779b9;
  const input = path.join('\u0000');
  for (let index = 0; index < input.length; index += 1) {
    value = Math.imul(value ^ input.charCodeAt(index), 0x45d9f3b);
    value ^= value >>> 16;
  }
  value += 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return (value ^ (value >>> 14)) >>> 0;
}
