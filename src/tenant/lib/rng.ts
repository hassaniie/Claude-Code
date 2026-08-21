/**
 * Deterministic PRNG. The whole NASTP world is generated from fixed seeds so it
 * looks identical on every reload — tenant names, meter IDs, org contacts and
 * historical readings stay stable across a session. Only the live tick in
 * `data/live.ts` uses Math.random, and only for the small values that a real
 * socket would push.
 */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

export const pick = <T,>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

export const int = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

export const float = (rng: Rng, min: number, max: number) => rng() * (max - min) + min;

export const chance = (rng: Rng, p: number) => rng() < p;

/** Box–Muller, clamped — used for consumption noise and confidence-like values. */
export function gaussian(rng: Rng, mean: number, sd: number, min?: number, max?: number) {
  const u = 1 - rng();
  const v = rng();
  let n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd + mean;
  if (min !== undefined) n = Math.max(min, n);
  if (max !== undefined) n = Math.min(max, n);
  return n;
}

export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pull `n` distinct items from a pool. */
export function sample<T>(rng: Rng, arr: readonly T[], n: number): T[] {
  return shuffle(rng, arr).slice(0, Math.min(n, arr.length));
}
