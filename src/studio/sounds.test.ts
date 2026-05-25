import { describe, expect, it } from 'vitest';
import { parse } from '../strudel/parse';
import { SOUND_PALETTE } from './sounds';

describe('SOUND_PALETTE', () => {
  it('exposes exactly 17 curated chips', () => {
    expect(SOUND_PALETTE).toHaveLength(17);
  });

  it('has no duplicate names', () => {
    const names = SOUND_PALETTE.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('mixes 7 drums and 10 synths', () => {
    const drums = SOUND_PALETTE.filter((c) => c.kind === 'drum');
    const synths = SOUND_PALETTE.filter((c) => c.kind === 'synth');
    expect(drums).toHaveLength(7);
    expect(synths).toHaveLength(10);
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

  it('synth snippets reference their sound and are audible without further input', () => {
    // Raw oscillators (sawtooth/square/triangle/sine) are silent without
    // `note(...)`. Named samples like `pad`, `stab`, `tabla` are pre-pitched
    // recordings — `s("pad")` is audible on its own. The unifying invariant
    // is that the snippet names the chip's sound; the pitch source is only
    // required for the raw-oscillator group.
    const RAW_OSCILLATORS = new Set(['sawtooth', 'square', 'triangle', 'sine']);
    for (const chip of SOUND_PALETTE.filter((c) => c.kind === 'synth')) {
      expect(chip.snippet).toContain(`s("${chip.name}")`);
      if (RAW_OSCILLATORS.has(chip.name)) {
        expect(chip.snippet, `${chip.name} needs note() to make sound`).toMatch(
          /^note\(/,
        );
      }
    }
  });
});
