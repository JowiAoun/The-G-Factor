import { describe, expect, it } from 'vitest';
import { parse } from '../strudel/parse';
import { VARIATION_AXES, pickAxesForBracket } from './axes';

describe('VARIATION_AXES catalogue', () => {
  it('has exactly 8 entries', () => {
    expect(VARIATION_AXES.length).toBe(8);
  });

  it('has unique ids', () => {
    const ids = VARIATION_AXES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has non-empty directive and techniques for every axis', () => {
    for (const axis of VARIATION_AXES) {
      expect(axis.directive.length, axis.id).toBeGreaterThan(20);
      expect(axis.techniques.length, axis.id).toBeGreaterThan(0);
      expect(axis.label.length, axis.id).toBeGreaterThan(0);
    }
  });

  it('has a non-empty timbre and timbreNote for every axis', () => {
    for (const axis of VARIATION_AXES) {
      expect(axis.timbre.trim().length, axis.id).toBeGreaterThan(0);
      expect(axis.timbreNote.trim().length, axis.id).toBeGreaterThan(0);
    }
  });

  it('spans at least 6 distinct timbre families (regression fence)', () => {
    // The whole point of the timbre rewrite: contestants in a bracket should
    // span the sonic space, not all default to sawtooth. If a future edit
    // collapses two axes onto the same family, that's fine, but collapsing
    // most of them isn't — re-diversify before merging.
    const families = new Set(VARIATION_AXES.map((a) => a.timbre));
    expect(families.size).toBeGreaterThanOrEqual(6);
  });

  it.each(VARIATION_AXES)('exemplar for $id passes the parser firewall', async (axis) => {
    const r = await parse(axis.exemplar);
    const err = r.valid ? '' : `: ${r.error}`;
    expect(r.valid, `exemplar for ${axis.id} did not parse${err}`).toBe(true);
  });
});

describe('pickAxesForBracket', () => {
  it('returns the requested count', () => {
    expect(pickAxesForBracket('s("bd*4")', 4).length).toBe(4);
    expect(pickAxesForBracket('s("bd*4")', 8).length).toBe(8);
  });

  it('clamps when count exceeds catalogue size', () => {
    expect(pickAxesForBracket('s("bd*4")', 99).length).toBe(8);
    expect(pickAxesForBracket('s("bd*4")', 0).length).toBe(0);
  });

  it('returns axes from the catalogue (no duplicates within a lineup)', () => {
    const lineup = pickAxesForBracket('s("bd hh sd hh")', 8);
    const ids = lineup.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(VARIATION_AXES.find((a) => a.id === id)).toBeTruthy();
    }
  });

  it('is deterministic for the same seed', () => {
    const a = pickAxesForBracket('s("bd hh sd hh")', 4).map((x) => x.id);
    const b = pickAxesForBracket('s("bd hh sd hh")', 4).map((x) => x.id);
    expect(a).toEqual(b);
  });

  it('produces different lineups across distinct seeds', () => {
    // Hand-checked: these two seeds hash to distinct LCG states and yield
    // distinct shuffles. If you change the hash function and this flakes,
    // pick a new pair where the orderings genuinely diverge.
    const a = pickAxesForBracket('s("bd*4")', 8).map((x) => x.id);
    const b = pickAxesForBracket('s("hh*16")', 8).map((x) => x.id);
    expect(a).not.toEqual(b);
  });
});
