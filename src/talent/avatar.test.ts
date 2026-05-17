import { describe, expect, it } from 'vitest';
import { hashSeed, renderAvatar, MOUTH_STATES } from './avatar';
import { SEED_GALLERY } from '../seeds/gallery';

describe('hashSeed', () => {
  it('is deterministic for the same input', () => {
    expect(hashSeed('hello')).toBe(hashSeed('hello'));
    expect(hashSeed('s("bd hh sd hh")')).toBe(hashSeed('s("bd hh sd hh")'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
    expect(hashSeed('s("bd*4")')).not.toBe(hashSeed('s("bd*8")'));
  });

  it('produces distinct hashes for all seven gallery seeds', () => {
    const hashes = SEED_GALLERY.map((s) => hashSeed(s.code));
    expect(new Set(hashes).size).toBe(SEED_GALLERY.length);
  });

  it('returns an 8-char hex string', () => {
    expect(hashSeed('anything')).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('renderAvatar', () => {
  it('returns an SVG document string', () => {
    const svg = renderAvatar('abc', 'smile');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('caches by (seed, mouth) so repeat calls are referentially equal', () => {
    const a = renderAvatar('cache-test', 'agape');
    const b = renderAvatar('cache-test', 'agape');
    expect(a).toBe(b);
  });

  it('produces a different SVG for each mouth state of the same seed', () => {
    const svgs = MOUTH_STATES.map((m) => renderAvatar('mouth-test', m));
    expect(new Set(svgs).size).toBe(MOUTH_STATES.length);
  });

  it('produces a different SVG for different seeds, same mouth', () => {
    const a = renderAvatar('seed-a', 'smile');
    const b = renderAvatar('seed-b', 'smile');
    expect(a).not.toBe(b);
  });
});
