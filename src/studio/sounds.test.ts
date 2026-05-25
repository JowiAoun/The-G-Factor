import { describe, expect, it } from 'vitest';
import { parse } from '../strudel/parse';
import { SOUND_PALETTE } from './sounds';

describe('SOUND_PALETTE', () => {
  it('exposes exactly 18 curated chips', () => {
    expect(SOUND_PALETTE).toHaveLength(18);
  });

  it('has no duplicate names', () => {
    const names = SOUND_PALETTE.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('mixes 10 drums and 8 synths', () => {
    const drums = SOUND_PALETTE.filter((c) => c.kind === 'drum');
    const synths = SOUND_PALETTE.filter((c) => c.kind === 'synth');
    expect(drums).toHaveLength(10);
    expect(synths).toHaveLength(8);
  });

  it('every chip carries a non-empty label and snippet', () => {
    for (const chip of SOUND_PALETTE) {
      expect(chip.label.trim().length).toBeGreaterThan(0);
      expect(chip.snippet.trim().length).toBeGreaterThan(0);
    }
  });

  it('every snippet is syntactically valid JS (passes acorn firewall)', async () => {
    for (const chip of SOUND_PALETTE) {
      const result = await parse(chip.snippet);
      const detail = result.valid ? '' : `: ${result.error}`;
      expect(result.valid, `snippet for ${chip.name} did not parse${detail}`).toBe(
        true,
      );
    }
  });

  it('drum snippets play the sample 4x per cycle for audible audition', () => {
    // `*4` makes every chip reliably audible AND matches the canonical
    // "four on the floor" idiom from the system prompt. The `:N` suffix
    // is allowed - `oh` and `rim` need a non-default sample variant
    // because the index-0 file in those folders is silent/empty in the
    // loaded dirt-samples bundle.
    for (const chip of SOUND_PALETTE.filter((c) => c.kind === 'drum')) {
      expect(chip.snippet, `${chip.name} snippet`).toMatch(
        new RegExp(`^s\\("${chip.name}(?::\\d+)?\\*4"\\)$`),
      );
    }
  });

  it('every synth snippet drives its sound from note() so click-audition is audible', () => {
    // After the banlist purge (no more pad/stab/tabla) every surviving synth
    // chip - including the sampled piano/pluck/jvbass - is wired up with an
    // explicit `note(...)` pitch source. Raw oscillators (triangle/sine) need
    // it for sound; sampled instruments need it for a melodic snippet.
    for (const chip of SOUND_PALETTE.filter((c) => c.kind === 'synth')) {
      expect(chip.snippet).toContain(`s("${chip.name}")`);
      expect(chip.snippet, `${chip.name} needs note() to make a melodic snippet`).toMatch(
        /^note\(/,
      );
    }
  });

  it('does not expose any of the banned timbres', () => {
    // Regression fence - sawtooth/square sound too electric, and pad/stab/
    // tabla were flagged as unpleasant during audit. Removing them from the
    // palette is the user-facing half of the banlist; the AI-prompt half
    // lives in src/model/prompts.ts.
    const BANNED = ['sawtooth', 'square', 'pad', 'stab', 'tabla', 'tabla2'];
    const names = SOUND_PALETTE.map((c) => c.name);
    for (const name of BANNED) {
      expect(names, `${name} must not appear in SOUND_PALETTE`).not.toContain(name);
    }
  });
});
