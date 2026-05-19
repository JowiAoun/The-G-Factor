/**
 * Rough static analysis of a Strudel mix.
 *
 * Powers the in-canvas Inspector panel: a quick read-out of which samples,
 * synths, notes, tempos, FX and stacking the current code is using. The
 * goal is "the app understood your code" — not full Strudel semantics. The
 * regexes are tolerant: a chord-string with operators inside `s("…")` is
 * matched + the operators stripped to leave the base sample names; mini-
 * notation rests (`~`) and rest-only tokens are dropped.
 */

export type EuclidPattern = { hits: number; steps: number };

export type MixMetadata = {
  isEmpty: boolean;
  samples: string[];
  synths: string[];
  noteFragments: string[];
  euclidPatterns: EuclidPattern[];
  tempo: { slow?: number; fast?: number; cpm?: number };
  fx: {
    reverb: boolean;
    delay: boolean;
    filter: boolean;
    gain: boolean;
  };
  layerCount: number;
};

const SAMPLE_RE = /s\(\s*"([^"]+)"\s*\)/g;
const NOTE_RE = /note\(\s*"([^"]+)"\s*\)\s*(?:\.s\(\s*"([^"]+)"\s*\))?/g;
const EUCLID_RE = /\((\d+)\s*,\s*(\d+)\)/g;
const SLOW_RE = /\.slow\(\s*(\d+(?:\.\d+)?)\s*\)/;
const FAST_RE = /\.fast\(\s*(\d+(?:\.\d+)?)\s*\)/;
const CPM_RE = /\.cpm\(\s*(\d+(?:\.\d+)?)\s*\)/;
const STACK_RE = /\bstack\s*\(/g;

const STRIPPABLE_OPERATORS = /[*/?!@]\d*|\([^)]+\)|<[^>]+>|\[[^\]]+\]|:\d+/g;

function extractSampleTokens(inner: string): string[] {
  // Strip operators *first* so we don't accidentally split on a comma
  // inside `(3,8)` (euclidean rhythm notation). After stripping the
  // operator runs, what's left is a whitespace/comma-separated list of
  // bare sample names.
  const cleaned = inner.replace(STRIPPABLE_OPERATORS, '').trim();
  const out: string[] = [];
  for (const raw of cleaned.split(/[\s,]+/)) {
    if (!raw || raw === '~') continue;
    // Sample names are lowercase letters + optional digits (bd, hh, sd, cp,
    // bd2, etc.). Anything else (chords, numbers, operators) is dropped.
    if (/^[a-z]+\d*$/.test(raw)) out.push(raw);
  }
  return out;
}

export function decodeMix(code: string): MixMetadata {
  const meta: MixMetadata = {
    isEmpty: !code.trim(),
    samples: [],
    synths: [],
    noteFragments: [],
    euclidPatterns: [],
    tempo: {},
    fx: { reverb: false, delay: false, filter: false, gain: false },
    layerCount: 0,
  };

  if (meta.isEmpty) return meta;

  const sampleSet = new Set<string>();
  for (const match of code.matchAll(SAMPLE_RE)) {
    for (const t of extractSampleTokens(match[1])) sampleSet.add(t);
  }
  meta.samples = [...sampleSet].sort();

  const synthSet = new Set<string>();
  for (const match of code.matchAll(NOTE_RE)) {
    meta.noteFragments.push(match[1]);
    if (match[2]) synthSet.add(match[2]);
  }
  meta.synths = [...synthSet].sort();

  for (const match of code.matchAll(EUCLID_RE)) {
    meta.euclidPatterns.push({
      hits: Number(match[1]),
      steps: Number(match[2]),
    });
  }

  const slow = code.match(SLOW_RE);
  if (slow) meta.tempo.slow = Number(slow[1]);
  const fast = code.match(FAST_RE);
  if (fast) meta.tempo.fast = Number(fast[1]);
  const cpm = code.match(CPM_RE);
  if (cpm) meta.tempo.cpm = Number(cpm[1]);

  meta.fx.reverb = /\.room\(/.test(code);
  meta.fx.delay = /\.delay\(/.test(code);
  meta.fx.filter = /\.[lh]pf\(/.test(code);
  meta.fx.gain = /\.gain\(/.test(code);

  meta.layerCount = [...code.matchAll(STACK_RE)].length;

  return meta;
}

export function hasAnyMetadata(meta: MixMetadata): boolean {
  if (meta.isEmpty) return false;
  return (
    meta.samples.length > 0 ||
    meta.synths.length > 0 ||
    meta.noteFragments.length > 0 ||
    meta.euclidPatterns.length > 0 ||
    meta.tempo.slow !== undefined ||
    meta.tempo.fast !== undefined ||
    meta.tempo.cpm !== undefined ||
    meta.fx.reverb ||
    meta.fx.delay ||
    meta.fx.filter ||
    meta.fx.gain ||
    meta.layerCount > 0
  );
}
