import { describe, expect, it } from 'vitest';
import {
  chooseWinner,
  createBracket,
  currentMatch,
  isResolved,
  type Contestant,
} from './bracket';

function mkContestants(n: number, opts: { dnf?: number[] } = {}): Contestant[] {
  const dnf = new Set(opts.dnf ?? []);
  return Array.from({ length: n }, (_, i) => ({
    id: `c-${i}`,
    label: `Contestant ${i}`,
    code: `s("bd ${i}")`,
    explanation: `variation ${i}`,
    avatarSeed: `seed-${i}`,
    status: dnf.has(i) ? 'dnf' : 'valid',
  }));
}

describe('bracket — 4 contestants', () => {
  it('produces 3 matches in the right shape', () => {
    const s = createBracket(mkContestants(4));
    expect(s.matches.length).toBe(3);
    expect(s.matches[0].round).toBe(1);
    expect(s.matches[1].round).toBe(1);
    expect(s.matches[2].round).toBe(2);
    expect(s.matches[0].a?.id).toBe('c-0');
    expect(s.matches[0].b?.id).toBe('c-1');
    expect(s.matches[1].a?.id).toBe('c-2');
    expect(s.matches[1].b?.id).toBe('c-3');
    expect(s.matches[2].a).toBeNull();
    expect(s.matches[2].b).toBeNull();
    expect(s.cursor).toBe(0);
    expect(s.champion).toBeNull();
  });

  it('propagates winners through to a champion', () => {
    let s = createBracket(mkContestants(4));
    s = chooseWinner(s, 'r1-m1', 'c-0');
    expect(s.matches[2].a?.id).toBe('c-0');
    expect(s.cursor).toBe(1);
    expect(s.champion).toBeNull();

    s = chooseWinner(s, 'r1-m2', 'c-3');
    expect(s.matches[2].b?.id).toBe('c-3');
    expect(s.cursor).toBe(2);
    expect(currentMatch(s)?.id).toBe('r2-m1');

    s = chooseWinner(s, 'r2-m1', 'c-3');
    expect(s.champion?.id).toBe('c-3');
    expect(isResolved(s)).toBe(true);
    expect(currentMatch(s)).toBeNull();
  });

  it('is idempotent when resolving an already-resolved match', () => {
    let s = createBracket(mkContestants(4));
    s = chooseWinner(s, 'r1-m1', 'c-0');
    const again = chooseWinner(s, 'r1-m1', 'c-1');
    expect(again).toBe(s); // exact same object reference, no mutation
  });

  it('rejects unknown match ids and unknown winners', () => {
    let s = createBracket(mkContestants(4));
    expect(chooseWinner(s, 'r9-m9', 'c-0')).toBe(s);
    s = createBracket(mkContestants(4));
    expect(chooseWinner(s, 'r1-m1', 'c-7')).toBe(s);
  });
});

describe('bracket — 8 contestants', () => {
  it('produces 7 matches across 3 rounds', () => {
    const s = createBracket(mkContestants(8));
    expect(s.matches.length).toBe(7);
    const byRound = s.matches.reduce<Record<number, number>>((acc, m) => {
      acc[m.round] = (acc[m.round] ?? 0) + 1;
      return acc;
    }, {});
    expect(byRound).toEqual({ 1: 4, 2: 2, 3: 1 });
  });

  it('crowns the champion after seven resolutions', () => {
    let s = createBracket(mkContestants(8));
    // Pick the lower-indexed contestant in every match.
    while (!isResolved(s)) {
      const m = currentMatch(s)!;
      s = chooseWinner(s, m.id, m.a!.id);
    }
    expect(s.champion?.id).toBe('c-0');
  });
});

describe('bracket — DNF handling', () => {
  it('auto-advances the opponent when one contestant is DNF', () => {
    const s = createBracket(mkContestants(4, { dnf: [1] }));
    // c-1 was DNF in r1-m1 vs c-0 → c-0 should be pre-resolved.
    expect(s.matches[0].winnerId).toBe('c-0');
    expect(s.matches[2].a?.id).toBe('c-0');
    // r1-m2 still needs the user's input.
    expect(s.cursor).toBe(1);
    expect(currentMatch(s)?.id).toBe('r1-m2');
  });

  it('still resolves a match when both contestants are DNF', () => {
    const s = createBracket(mkContestants(4, { dnf: [0, 1] }));
    expect(s.matches[0].winnerId).toBe('c-0');
    expect(s.cursor).toBe(1);
  });
});

describe('bracket — guards', () => {
  it('throws on non-power-of-two sizes', () => {
    expect(() => createBracket(mkContestants(3))).toThrow();
    expect(() => createBracket(mkContestants(6))).toThrow();
  });

  it('accepts only 2/4/8/16 etc.', () => {
    expect(() => createBracket(mkContestants(2))).not.toThrow();
    expect(() => createBracket(mkContestants(4))).not.toThrow();
    expect(() => createBracket(mkContestants(8))).not.toThrow();
  });
});
