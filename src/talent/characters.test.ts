import { describe, expect, it } from 'vitest';
import {
  CHARACTERS,
  getCharacterById,
  pickCharactersForBracket,
} from './characters';

describe('CHARACTERS roster', () => {
  it('has exactly 20 entries', () => {
    expect(CHARACTERS.length).toBe(20);
  });

  it('has unique ids', () => {
    const ids = CHARACTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every character has a non-empty name and tagline', () => {
    for (const c of CHARACTERS) {
      expect(c.name.trim().length, c.id).toBeGreaterThan(0);
      expect(c.tagline.trim().length, c.id).toBeGreaterThan(0);
    }
  });

  it('long-rear-hair characters also pin a front hair style (no bald crown)', () => {
    // rearHair only draws the back/sides flowing down - without a `hair`
    // style covering the top of the head, the character renders bald on
    // top. Any new long-haired character must also pick a front style
    // (`sideComed` for full coverage or `bun` for a topknot).
    for (const c of CHARACTERS) {
      const hasLongHair =
        (c.avatarOptions.rearHairProbability ?? 0) > 0 &&
        Array.isArray(c.avatarOptions.rearHair) &&
        c.avatarOptions.rearHair.length > 0;
      if (!hasLongHair) continue;
      const hasFrontHair =
        (c.avatarOptions.hairProbability ?? 0) > 0 &&
        Array.isArray(c.avatarOptions.hair) &&
        c.avatarOptions.hair.length > 0;
      expect(
        hasFrontHair,
        `${c.id} has long rear hair but no front hair - would render bald on top`,
      ).toBe(true);
    }
  });

  it('uses open-eye styles (happy/wide) for the majority of characters', () => {
    // `bow`, `humble`, and the left half of `wink` render as closed
    // curved lines without sclera or pupils. They're useful as occasional
    // personality accents but should not dominate - too many makes the
    // whole roster look asleep.
    const CLOSED_EYES = new Set(['bow', 'humble', 'wink']);
    const closedCount = CHARACTERS.filter((c) =>
      (c.avatarOptions.eyes ?? []).some((e) => CLOSED_EYES.has(e)),
    ).length;
    expect(closedCount, `${closedCount}/20 characters have closed-style eyes`).toBeLessThanOrEqual(
      6,
    );
  });

  it('no character combines long rear hair with a beard', () => {
    // The whole point of curating the roster: long-haired femme-presenting
    // characters never roll a beard. If a future edit accidentally creates
    // such a combo, this test catches it before it ships.
    for (const c of CHARACTERS) {
      const hasLongHair =
        (c.avatarOptions.rearHairProbability ?? 0) > 0 &&
        Array.isArray(c.avatarOptions.rearHair) &&
        c.avatarOptions.rearHair.length > 0;
      const hasBeard = (c.avatarOptions.beardProbability ?? 0) > 0;
      expect(
        hasLongHair && hasBeard,
        `${c.id} has long rear hair AND a beard`,
      ).toBe(false);
    }
  });

  it('every character pins enough options to render deterministically', () => {
    // Body and head only have one option each so they're auto-deterministic;
    // mouth is overridden per-render. Everything else (eyes, eyebrows,
    // clothes, colors, and whichever hair group applies) must be pinned.
    for (const c of CHARACTERS) {
      const o = c.avatarOptions;
      expect(o.eyes, c.id).toBeTruthy();
      expect(o.eyebrows, c.id).toBeTruthy();
      expect(o.clothes, c.id).toBeTruthy();
      expect(o.skinColor, c.id).toBeTruthy();
      expect(o.hairColor, c.id).toBeTruthy();
      expect(o.clothesColor, c.id).toBeTruthy();
    }
  });
});

describe('getCharacterById', () => {
  it('returns the character for a known id', () => {
    expect(getCharacterById('mira')?.name).toBe('Mira');
  });

  it('returns undefined for an unknown id', () => {
    expect(getCharacterById('not-a-character')).toBeUndefined();
  });
});

describe('pickCharactersForBracket', () => {
  it('returns the requested count', () => {
    expect(pickCharactersForBracket('s("bd*4")', 4).length).toBe(4);
    expect(pickCharactersForBracket('s("bd*4")', 8).length).toBe(8);
  });

  it('clamps when count exceeds the roster size', () => {
    expect(pickCharactersForBracket('s("bd*4")', 99).length).toBe(20);
    expect(pickCharactersForBracket('s("bd*4")', 0).length).toBe(0);
  });

  it('returns characters from the roster (no duplicates within a lineup)', () => {
    const lineup = pickCharactersForBracket('s("bd hh sd hh")', 8);
    const ids = lineup.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(CHARACTERS.find((c) => c.id === id)).toBeTruthy();
    }
  });

  it('is deterministic for the same seed', () => {
    const a = pickCharactersForBracket('s("bd hh sd hh")', 4).map((c) => c.id);
    const b = pickCharactersForBracket('s("bd hh sd hh")', 4).map((c) => c.id);
    expect(a).toEqual(b);
  });

  it('produces different lineups across distinct seeds', () => {
    const a = pickCharactersForBracket('s("bd*4")', 4).map((c) => c.id);
    const b = pickCharactersForBracket('s("hh*16")', 4).map((c) => c.id);
    expect(a).not.toEqual(b);
  });
});
