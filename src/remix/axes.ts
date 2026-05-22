export type VariationAxis = {
  id: string;
  label: string;
  directive: string;
  techniques: string[];
  exemplar: string;
};

/**
 * The eight musical territories a Talent Show bracket auditions against. Each
 * variation in a round is pre-assigned one axis (deterministically shuffled
 * per seed) and the prompt builder injects the directive + favored techniques
 * + an axis-specific micro-exemplar so Gemma's output distribution is nudged
 * toward eight distinct neighborhoods instead of one. Axes are non-orthogonal
 * by design — the point isn't a clean taxonomy, it's eight different *first
 * thoughts* for "remix this".
 */
export const VARIATION_AXES: VariationAxis[] = [
  {
    id: 'polyrhythmic',
    label: 'Polyrhythmic',
    directive:
      'Interlock two or three euclidean rhythms with different denominators so the downbeat drifts.',
    techniques: ['(n,m) euclidean', 'comma stack', 'multi-line stack()'],
    exemplar: 'stack(s("bd(3,8)"), s("hh(5,8)"), s("sd(7,16)"))',
  },
  {
    id: 'polyphonic',
    label: 'Polyphonic',
    directive:
      'Build a 3- or 4-layer `stack(...)` where each layer has a different timbre and density.',
    techniques: ['stack()', 'multiple s()/note()', 'per-layer .gain()'],
    exemplar:
      'stack(\n  s("bd*2").gain(0.9),\n  s("hh*8").gain(0.4),\n  s("~ sd ~ sd").room(0.2),\n  note("<c eb g>").s("sawtooth").slow(2)\n)',
  },
  {
    id: 'modulated',
    label: 'Modulated',
    directive:
      'Use `.every(n, x => …)`, `.sometimes(…)`, or `.jux(rev)` so the pattern audibly evolves cycle to cycle.',
    techniques: ['.every(n, fn)', '.sometimes(fn)', '.jux(rev)'],
    exemplar:
      's("bd sd hh sd").every(4, x => x.fast(2)).sometimes(x => x.rev()).jux(rev)',
  },
  {
    id: 'timbral',
    label: 'Timbral',
    directive:
      'Sculpt with `.lpf`, `.room`, `.delay`, and sample variants (`bd:3`) — the rhythm can stay simple if the tone is striking.',
    techniques: ['.lpf', '.room', '.delay', ':N sample variant'],
    exemplar: 's("bd:2 hh:1 sd:3 hh:1").lpf(900).room(0.6).delay(0.25)',
  },
  {
    id: 'harmonic',
    label: 'Harmonic',
    directive:
      'Introduce a pitched line with `note("<…>")` over a minimal drum bed, alternating chords or scale fragments.',
    techniques: ['note()', '<...> alternation', '.slow on the pitch line'],
    exemplar:
      'stack(\n  s("bd*2"),\n  note("<c3 eb3 g3 bb3>*2").s("sawtooth").slow(2).room(0.4)\n)',
  },
  {
    id: 'tempo-shifted',
    label: 'Tempo-shifted',
    directive:
      'Apply `.fast`, `.slow`, or contrasting layer speeds so the feel is half-time or double-time compared to the seed.',
    techniques: ['.fast(n)', '.slow(n)', 'per-layer speed contrast'],
    exemplar: 'stack(s("bd sd").slow(2), s("hh*8").fast(1.5))',
  },
  {
    id: 'sparse',
    label: 'Sparse',
    directive:
      'Strip down — long rests, slow cycles, only the essential elements. Aim for negative space.',
    techniques: ['~ rest', '.slow', 'minimal layer count'],
    exemplar: 's("bd ~ ~ ~ ~ ~ sd ~").slow(2).room(0.8)',
  },
  {
    id: 'dense',
    label: 'Dense',
    directive:
      'Pile it on — fast subdivisions, busy fills, multiple percussion lines pressing into each other.',
    techniques: ['*N repeat', 'stack()', 'high-rate hh*16'],
    exemplar: 'stack(s("bd(5,8)"), s("hh*16").gain(0.45), s("cp(3,8)"), s("sd*4"))',
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
