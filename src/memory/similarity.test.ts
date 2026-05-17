import { describe, expect, it } from 'vitest';
import { bigrams, jaccard, similarity } from './similarity';

describe('bigrams', () => {
  it('builds the set of overlapping 2-grams', () => {
    expect(bigrams('abcd')).toEqual(new Set(['ab', 'bc', 'cd']));
  });

  it('lowercases and strips whitespace', () => {
    expect(bigrams('AB cd')).toEqual(bigrams('abcd'));
  });

  it('handles single-char input', () => {
    expect(bigrams('a').size).toBe(0);
  });
});

describe('jaccard', () => {
  it('returns 1 for identical sets', () => {
    expect(jaccard(new Set(['ab', 'cd']), new Set(['ab', 'cd']))).toBe(1);
  });

  it('returns 0 for fully disjoint sets', () => {
    expect(jaccard(new Set(['ab']), new Set(['cd']))).toBe(0);
  });

  it('returns 1 for two empty sets (degenerate case)', () => {
    expect(jaccard(new Set(), new Set())).toBe(1);
  });

  it('computes intersection / union for partial overlap', () => {
    // {ab, bc, cd} ∩ {bc, cd, de} = {bc, cd}; union = 4 → 0.5
    const a = new Set(['ab', 'bc', 'cd']);
    const b = new Set(['bc', 'cd', 'de']);
    expect(jaccard(a, b)).toBeCloseTo(0.5, 5);
  });
});

describe('similarity (Phase 2 retrieval correctness)', () => {
  // The Phase 2 verification asks: ranks structurally-similar seeds above
  // unrelated ones. These cases lock that ordering.

  it('ranks two euclidean-shaped seeds above an unrelated ambient pad', () => {
    const target = 's("bd(3,8), hh(5,8)")';
    const similar = 's("cp(3,8), hh(7,8)")';
    const unrelated = 'note("<c eb g bb>*2").s("sawtooth").slow(4).room(0.5)';
    expect(similarity(target, similar)).toBeGreaterThan(similarity(target, unrelated));
  });

  it('ranks two `.slow()` melodic loops above a kick-only pattern', () => {
    const target = 'note("c e g c5").s("sawtooth").slow(2)';
    const similar = 'note("d f a d5").s("sawtooth").slow(4)';
    const unrelated = 's("bd*4")';
    expect(similarity(target, similar)).toBeGreaterThan(similarity(target, unrelated));
  });

  it('ranks two stacks above a single-line groove', () => {
    const target = 'stack(s("bd*2"), s("~ sd"), s("hh*8"))';
    const similar = 'stack(s("bd*4"), s("~ cp"), s("hh*16"))';
    const unrelated = 's("bd hh sd hh")';
    expect(similarity(target, similar)).toBeGreaterThan(similarity(target, unrelated));
  });

  it('treats whitespace differences as noise (case + spacing invariance)', () => {
    expect(similarity('s("bd hh")', 'S( "BD  HH" )')).toBeCloseTo(1, 5);
  });
});
