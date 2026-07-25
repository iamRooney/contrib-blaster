/**
 * Deterministic PRNG (mulberry32). Given the same seed, produces the same
 * sequence every time — important because this engine renders in CI and we
 * want a given user's animation to be reproducible run-to-run, not flicker
 * between visually different outputs on every commit.
 *
 * Seed from something stable per-render, e.g. the GitHub login + the ISO
 * date of the most recent contribution day, so a re-run for the same user
 * on the same day produces an identical animation (useful for caching/diffing
 * in CI, and just less surprising for users watching their own README).
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max]. */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Picks a random element from a non-empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("SeededRandom.pick called with an empty array");
    }
    const idx = this.nextInt(0, items.length - 1);
    // Non-null assertion is safe: idx is always within bounds given the
    // length check above and nextInt's inclusive [0, length-1] range.
    return items[idx] as T;
  }
}

/** Hashes a string seed (e.g. "octocat:2026-07-23") into a 32-bit int. */
export function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}
