import { describe, expect, it } from 'vitest';
import {
  NORMAL_JOKES,
  PATIENCE_JOKES,
  REVEAL_JOKES,
  PATIENCE_THRESHOLD_MS,
  PATIENCE_MIN_CONTESTANTS,
  durationForJoke,
  pickFromPool,
} from './jokes';

const MIN_CHARS = 10;
const MAX_CHARS = 280;
const MIN_DURATION_MS = 3500;
const MAX_DURATION_MS = 8500;

describe('joke catalogue size', () => {
  it('NORMAL_JOKES has at least 15 entries', () => {
    expect(NORMAL_JOKES.length).toBeGreaterThanOrEqual(15);
  });
  it('PATIENCE_JOKES has at least 8 entries', () => {
    expect(PATIENCE_JOKES.length).toBeGreaterThanOrEqual(8);
  });
  it('REVEAL_JOKES has at least 3 entries', () => {
    expect(REVEAL_JOKES.length).toBeGreaterThanOrEqual(3);
  });
});

describe('joke catalogue uniqueness', () => {
  it('no duplicates within NORMAL_JOKES', () => {
    expect(new Set(NORMAL_JOKES).size).toBe(NORMAL_JOKES.length);
  });
  it('no duplicates within PATIENCE_JOKES', () => {
    expect(new Set(PATIENCE_JOKES).size).toBe(PATIENCE_JOKES.length);
  });
  it('no duplicates within REVEAL_JOKES', () => {
    expect(new Set(REVEAL_JOKES).size).toBe(REVEAL_JOKES.length);
  });
  it('no overlap across pools', () => {
    const all = [...NORMAL_JOKES, ...PATIENCE_JOKES, ...REVEAL_JOKES];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('joke length bounds', () => {
  const all = [...NORMAL_JOKES, ...PATIENCE_JOKES, ...REVEAL_JOKES];
  it.each(all)('joke length is within [%i, %i] chars: %j', (joke) => {
    expect(joke.length).toBeGreaterThanOrEqual(MIN_CHARS);
    expect(joke.length).toBeLessThanOrEqual(MAX_CHARS);
  });
});

describe('PATIENCE constants', () => {
  it('threshold is 60 seconds', () => {
    expect(PATIENCE_THRESHOLD_MS).toBe(60_000);
  });
  it('min contestants is 2', () => {
    expect(PATIENCE_MIN_CONTESTANTS).toBe(2);
  });
});

describe('durationForJoke', () => {
  it('clamps short text to MIN_DURATION_MS', () => {
    expect(durationForJoke('hi')).toBe(MIN_DURATION_MS);
  });
  it('clamps very long text to MAX_DURATION_MS', () => {
    expect(durationForJoke('x'.repeat(500))).toBe(MAX_DURATION_MS);
  });
  it('scales mid-length text inside the window', () => {
    const d = durationForJoke('x'.repeat(80)); // ~5200ms raw
    expect(d).toBeGreaterThanOrEqual(MIN_DURATION_MS);
    expect(d).toBeLessThanOrEqual(MAX_DURATION_MS);
  });
  it.each([...NORMAL_JOKES, ...PATIENCE_JOKES, ...REVEAL_JOKES])(
    'every catalogued joke lands inside the duration window: %j',
    (joke) => {
      const d = durationForJoke(joke);
      expect(d).toBeGreaterThanOrEqual(MIN_DURATION_MS);
      expect(d).toBeLessThanOrEqual(MAX_DURATION_MS);
    },
  );
});

describe('pickFromPool', () => {
  it('returns an entry from the pool', () => {
    const used = new Set<string>();
    const pick = pickFromPool(NORMAL_JOKES, used);
    expect(NORMAL_JOKES).toContain(pick);
  });
  it('marks the picked joke as used', () => {
    const used = new Set<string>();
    const pick = pickFromPool(NORMAL_JOKES, used);
    expect(used.has(pick)).toBe(true);
  });
  it('does not pick the same joke twice consecutively (pool size > 1)', () => {
    const used = new Set<string>();
    const first = pickFromPool(NORMAL_JOKES, used);
    const second = pickFromPool(NORMAL_JOKES, used);
    expect(second).not.toBe(first);
  });
  it('cycles through the whole pool before repeating any joke', () => {
    const used = new Set<string>();
    const seen = new Set<string>();
    for (let i = 0; i < NORMAL_JOKES.length; i++) {
      seen.add(pickFromPool(NORMAL_JOKES, used));
    }
    expect(seen.size).toBe(NORMAL_JOKES.length);
  });
  it('resets cleanly after exhaustion without picking the just-shown joke', () => {
    const used = new Set<string>();
    // Use a tiny synthetic pool so we exhaust in two picks.
    const tiny = ['A', 'B', 'C'] as const;
    const a = pickFromPool(tiny, used);
    const b = pickFromPool(tiny, used);
    const c = pickFromPool(tiny, used);
    // Exhaust complete; next pick must not equal `c`.
    const next = pickFromPool(tiny, used);
    expect(next).not.toBe(c);
    expect(tiny).toContain(next);
    // Sanity: a, b, c covered the pool.
    expect(new Set([a, b, c]).size).toBe(3);
  });
  it('throws on empty pool', () => {
    expect(() => pickFromPool([], new Set())).toThrow();
  });
});
