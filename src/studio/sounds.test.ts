import { describe, expect, it } from 'vitest';
import { parse } from '../strudel/parse';
import { SOUND_PALETTE } from './sounds';

describe('SOUND_PALETTE', () => {
  it('exposes exactly 12 curated chips', () => {
    expect(SOUND_PALETTE).toHaveLength(12);
  });

  it('has no duplicate names', () => {
    const names = SOUND_PALETTE.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('mixes 7 drums and 5 synths', () => {
    const drums = SOUND_PALETTE.filter((c) => c.kind === 'drum');
    const synths = SOUND_PALETTE.filter((c) => c.kind === 'synth');
    expect(drums).toHaveLength(7);
    expect(synths).toHaveLength(5);
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

  it('drum snippets are bare s("name") calls', () => {
    for (const chip of SOUND_PALETTE.filter((c) => c.kind === 'drum')) {
      expect(chip.snippet).toBe(`s("${chip.name}")`);
    }
  });

  it('synth snippets include a note() pitch source', () => {
    for (const chip of SOUND_PALETTE.filter((c) => c.kind === 'synth')) {
      expect(chip.snippet).toMatch(/^note\(/);
      expect(chip.snippet).toContain(`s("${chip.name}")`);
    }
  });
});
