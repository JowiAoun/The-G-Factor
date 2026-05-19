import { describe, expect, it } from 'vitest';
import { decodeMix, hasAnyMetadata } from './inspector';

describe('decodeMix — empty + degenerate', () => {
  it('returns isEmpty for empty strings and whitespace', () => {
    expect(decodeMix('').isEmpty).toBe(true);
    expect(decodeMix('   \n\t').isEmpty).toBe(true);
  });

  it('hasAnyMetadata is false on an empty mix', () => {
    expect(hasAnyMetadata(decodeMix(''))).toBe(false);
  });
});

describe('decodeMix — samples', () => {
  it('extracts simple sample names', () => {
    const meta = decodeMix('s("bd hh sd hh")');
    expect(meta.samples).toEqual(['bd', 'hh', 'sd']);
  });

  it('strips mini-notation operators around sample names', () => {
    const meta = decodeMix('s("bd*4 hh/2 sd! cp:3 bd@2")');
    expect(meta.samples.sort()).toEqual(['bd', 'cp', 'hh', 'sd']);
  });

  it('drops rests (~)', () => {
    const meta = decodeMix('s("bd ~ sd ~")');
    expect(meta.samples).toEqual(['bd', 'sd']);
  });

  it('handles euclid + commas inside the same s() call', () => {
    const meta = decodeMix('s("bd(3,8), hh(5,8)")');
    expect(meta.samples).toEqual(['bd', 'hh']);
    expect(meta.euclidPatterns).toEqual([
      { hits: 3, steps: 8 },
      { hits: 5, steps: 8 },
    ]);
  });

  it('returns a stable sorted, deduped list', () => {
    const meta = decodeMix('s("hh bd hh bd cp cp")');
    expect(meta.samples).toEqual(['bd', 'cp', 'hh']);
  });
});

describe('decodeMix — notes + synths', () => {
  it('extracts a note fragment and the synth that follows', () => {
    const meta = decodeMix('note("c eb g bb").s("sawtooth")');
    expect(meta.noteFragments).toEqual(['c eb g bb']);
    expect(meta.synths).toEqual(['sawtooth']);
  });

  it('deduplicates synths across multiple note() calls', () => {
    const meta = decodeMix('stack(note("c").s("sawtooth"), note("e").s("sawtooth"))');
    expect(meta.synths).toEqual(['sawtooth']);
  });
});

describe('decodeMix — tempo + FX', () => {
  it('captures slow / fast / cpm', () => {
    expect(decodeMix('s("bd*4").slow(2)').tempo).toEqual({ slow: 2 });
    expect(decodeMix('s("bd*4").fast(1.5)').tempo).toEqual({ fast: 1.5 });
    expect(decodeMix('s("bd*4").cpm(120)').tempo).toEqual({ cpm: 120 });
  });

  it('detects room / delay / lpf / gain', () => {
    const meta = decodeMix(
      'note("c").s("sawtooth").room(0.5).delay(0.3).lpf(800).gain(0.7)',
    );
    expect(meta.fx).toEqual({
      reverb: true,
      delay: true,
      filter: true,
      gain: true,
    });
  });

  it('lpf and hpf both register as filter', () => {
    expect(decodeMix('s("bd").hpf(200)').fx.filter).toBe(true);
  });
});

describe('decodeMix — layering', () => {
  it('counts stack() invocations', () => {
    expect(decodeMix('stack(s("bd"), s("hh"))').layerCount).toBe(1);
    expect(decodeMix('stack(s("a"), stack(s("b"), s("c")))').layerCount).toBe(2);
  });

  it('reports zero layers on a single-line pattern', () => {
    expect(decodeMix('s("bd*4")').layerCount).toBe(0);
  });
});

describe('hasAnyMetadata', () => {
  it('is true once any field is populated', () => {
    expect(hasAnyMetadata(decodeMix('s("bd")'))).toBe(true);
    expect(hasAnyMetadata(decodeMix('note("c").s("piano")'))).toBe(true);
    expect(hasAnyMetadata(decodeMix('s("bd").room(0.5)'))).toBe(true);
  });
});
