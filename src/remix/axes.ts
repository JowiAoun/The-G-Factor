export type VariationAxis = {
  id: string;
  label: string;
  directive: string;
  techniques: string[];
  exemplar: string;
  /** Timbre family the axis nudges Gemma toward - used both inside the prompt
   * (via `timbreNote`) and by the orchestrator to forbid duplicate families
   * across slots in a bracket. */
  timbre: string;
  /** One-line direction spliced into the prompt under the axis directive. */
  timbreNote: string;
};

/**
 * The eight musical territories a Talent Show bracket auditions against. Each
 * variation in a round is pre-assigned one axis (deterministically shuffled
 * per seed) and the prompt builder injects the directive + favored techniques
 * + an axis-specific micro-exemplar so Gemma's output distribution is nudged
 * toward eight distinct neighborhoods instead of one. Axes are non-orthogonal
 * by design - the point isn't a clean taxonomy, it's eight different *first
 * thoughts* for "remix this".
 *
 * Each axis also commits to a distinct `timbre` family (drum-variant, pad,
 * percpitch, bass, keys, pluck, texture, lead). Since pickAxesForBracket()
 * returns up to 8 unique axes per seed, every contestant in a bracket lands
 * on a different timbre family - no more sawtooth-on-sawtooth-on-sawtooth.
 */
export const VARIATION_AXES: VariationAxis[] = [
  {
    id: 'polyrhythmic',
    label: 'Polyrhythmic',
    directive:
      'Interlock two or three euclidean rhythms with different denominators so the downbeat drifts.',
    techniques: ['(n,m) euclidean', 'comma stack', 'multi-line stack()', ':N sample variant'],
    timbre: 'drum-variant',
    timbreNote:
      'Stay percussive - use the `:N` sample-index trick (`bd:2`, `hh:5`, `sd:3`) so each layer has a slightly different drum character.',
    exemplar: 'stack(s("bd:2(3,8)"), s("hh:5(5,8)"), s("sd:3(7,16)"))',
  },
  {
    id: 'polyphonic',
    label: 'Polyphonic',
    directive:
      'Build a 3- or 4-layer `stack(...)` where each layer has a different timbre and density.',
    techniques: ['stack()', 'multiple s()/note()', 'per-layer .gain()', 'named samples'],
    timbre: 'pad',
    timbreNote:
      'Make the pitched layer a pad - `s("pad").slow(N)` or a triangle/sine line with `.room()`. Avoid sawtooth here.',
    exemplar:
      'stack(\n  s("bd*2").gain(0.9),\n  s("hh*8").gain(0.4),\n  s("~ sd ~ sd").room(0.2),\n  s("pad").slow(4).gain(0.6)\n)',
  },
  {
    id: 'modulated',
    label: 'Modulated',
    directive:
      'Use `.every(n, x => …)`, `.sometimes(…)`, or `.jux(rev)` so the pattern audibly evolves cycle to cycle.',
    techniques: ['.every(n, fn)', '.sometimes(fn)', '.jux(rev)', 'pitched percussion'],
    timbre: 'percpitch',
    timbreNote:
      'Reach for pitched percussion - `s("tabla")`, `s("tabla2")`, or `note(...).s("arpy")` - and let `.every`/`.sometimes` re-cut it.',
    exemplar:
      'stack(s("bd sd"), s("tabla*4").every(4, x => x.fast(2)).sometimes(x => x.rev()).jux(rev))',
  },
  {
    id: 'timbral',
    label: 'Timbral',
    directive:
      'Sculpt with `.lpf`, `.room`, `.delay`, and sample variants (`bd:3`) - the rhythm can stay simple if the tone is striking.',
    techniques: ['.lpf', '.room', '.delay', ':N sample variant', 'filter modulation'],
    timbre: 'bass',
    timbreNote:
      'Make a bass the centerpiece - `note(...).s("jvbass")` or `note(...).s("bass")` - and modulate `.lpf` with `sine.range(...)`.',
    exemplar:
      'note("c2 eb2 g2 c2").s("jvbass").lpf(sine.range(200, 1800).slow(8)).room(0.4)',
  },
  {
    id: 'harmonic',
    label: 'Harmonic',
    directive:
      'Introduce a pitched line with `note("<…>")` over a minimal drum bed, alternating chords or scale fragments.',
    techniques: ['note()', '<...> alternation', '.slow on the pitch line', 'keys'],
    timbre: 'keys',
    timbreNote:
      'Make the pitched layer a piano: `note("<…>").s("piano")`. Save sawtooth for acid-genre seeds only.',
    exemplar:
      'stack(\n  s("bd*2"),\n  note("<c3 eb3 g3 bb3>*2").s("piano").slow(2).room(0.4)\n)',
  },
  {
    id: 'tempo-shifted',
    label: 'Tempo-shifted',
    directive:
      'Apply `.fast`, `.slow`, or contrasting layer speeds so the feel is half-time or double-time compared to the seed.',
    techniques: ['.fast(n)', '.slow(n)', 'per-layer speed contrast', 'plucked melody'],
    timbre: 'pluck',
    timbreNote:
      'Pair the speed contrast with a plucked melody - `note(...).s("pluck")` or `s("sitar")` - over half-time drums.',
    exemplar:
      'stack(s("bd sd").slow(2), s("hh*8").fast(1.5), note("c4 e4 g4 b4").s("pluck"))',
  },
  {
    id: 'sparse',
    label: 'Sparse',
    directive:
      'Strip down - long rests, slow cycles, only the essential elements. Aim for negative space.',
    techniques: ['~ rest', '.slow', 'minimal layer count', 'texture samples'],
    timbre: 'texture',
    timbreNote:
      'Reach for ambient texture samples - `s("wind")`, `s("space")`, or `s("noise").lpf(...)` - sitting under one sparse drum.',
    exemplar: 'stack(s("bd ~ ~ ~ ~ ~ sd ~").slow(2), s("wind").slow(8).room(0.8).gain(0.5))',
  },
  {
    id: 'dense',
    label: 'Dense',
    directive:
      'Pile it on - fast subdivisions, busy fills, multiple percussion lines pressing into each other.',
    techniques: ['*N repeat', 'stack()', 'high-rate hh*16', 'square-wave lead'],
    timbre: 'lead',
    timbreNote:
      'Push a square-wave lead on top - `note(...).s("square").fast(2)` - so the busy drums sit beneath a melodic line.',
    exemplar:
      'stack(s("bd(5,8)"), s("hh*16").gain(0.45), s("cp(3,8)"), note("c4 eb4 g4 bb4").s("square").fast(2))',
  },
];

// FNV-1a 32-bit. Stable per seedCode, no external deps. Used as the LCG seed.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function makeLcg(seed: number): () => number {
  let state = (seed || 1) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
}

/**
 * Deterministic, seed-keyed Fisher-Yates over `VARIATION_AXES`. Same input
 * always produces the same ordering; different inputs (in practice) produce
 * different orderings. Same `seedCode` → same lineup makes bracket runs
 * reproducible during a session; different seeds give fresh lineups so the
 * Talent Show stays surprising across the gallery.
 */
export function pickAxesForBracket(
  seedCode: string,
  count: number,
): VariationAxis[] {
  const arr = VARIATION_AXES.slice();
  const rand = makeLcg(fnv1a(seedCode));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand() % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const take = Math.max(0, Math.min(count, arr.length));
  return arr.slice(0, take);
}
