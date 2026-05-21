/**
 * Curated palette of Strudel sound chips for the Studio sound rail.
 *
 * Drums are bare `s("name")` so they slot into existing `stack(…)` /
 * `,`-separated layers naturally. Synths carry a default `c e g` triad
 * because a bare `s("sawtooth")` is silent without `note()` — the chip
 * needs to make actual sound on click-audition.
 *
 * Names map 1:1 to Strudel's default dirt-samples bank (prebaked in
 * `src/strudel/engine.ts:init`), so no extra sample loading is needed.
 */

export type SoundChip = {
  /** Strudel sample/synth name (matches the bank). */
  name: string;
  /** Short display label shown on the chip. */
  label: string;
  /** Category drives chip styling and a small mental sort. */
  kind: 'drum' | 'synth';
  /** Literal text inserted into the editor on drop, and played on click. */
  snippet: string;
};

export const SOUND_PALETTE: SoundChip[] = [
  { name: 'bd', label: 'Kick', kind: 'drum', snippet: 's("bd")' },
  { name: 'sd', label: 'Snare', kind: 'drum', snippet: 's("sd")' },
  { name: 'hh', label: 'Hi-hat', kind: 'drum', snippet: 's("hh")' },
  { name: 'oh', label: 'Open hat', kind: 'drum', snippet: 's("oh")' },
  { name: 'cp', label: 'Clap', kind: 'drum', snippet: 's("cp")' },
  { name: 'rim', label: 'Rim', kind: 'drum', snippet: 's("rim")' },
  { name: 'cb', label: 'Cowbell', kind: 'drum', snippet: 's("cb")' },
  { name: 'sawtooth', label: 'Saw', kind: 'synth', snippet: 'note("c e g").s("sawtooth")' },
  { name: 'square', label: 'Square', kind: 'synth', snippet: 'note("c e g").s("square")' },
  { name: 'triangle', label: 'Tri', kind: 'synth', snippet: 'note("c e g").s("triangle")' },
  { name: 'sine', label: 'Sine', kind: 'synth', snippet: 'note("c e g").s("sine")' },
  { name: 'piano', label: 'Piano', kind: 'synth', snippet: 'note("c e g").s("piano")' },
];

export const STRUDEL_SNIPPET_MIME = 'application/x-strudel-snippet';
