// WAYANG CLASH — a small seeded random number generator.
// Mulberry32: tiny, fast, deterministic. Every random choice in the fight
// (AI decisions, particles, autopilot) draws from one of these, so a
// screenshot scene staged from a seed is the same frame every time.

export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) {
      return min + this.next() * (max - min);
    },
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
    chance(probability) {
      return this.next() < probability;
    },
  };
}
