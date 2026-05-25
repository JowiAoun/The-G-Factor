/**
 * Curated palette of Strudel sound chips for the Studio sound rail.
 *
 * Drums are bare `s("name")` so they slot into existing `stack(…)` /
 * `,`-separated layers naturally. Synths carry a default `c e g` triad
 * to make actual sound on click-audition (raw oscillators are silent
 * without `note()`; sampled instruments still need a pitch source to
 * play a melodic snippet).
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
  { name: 'triangle', label: 'Tri', kind: 'synth', snippet: 'note("c e g").s("triangle")' },
  { name: 'sine', label: 'Sine', kind: 'synth', snippet: 'note("c e g").s("sine")' },
  { name: 'piano', label: 'Piano', kind: 'synth', snippet: 'note("c e g").s("piano")' },
  { name: 'pluck', label: 'Pluck', kind: 'synth', snippet: 'note("c e g").s("pluck")' },
  { name: 'jvbass', label: 'Bass', kind: 'synth', snippet: 'note("c2 eb2 g2").s("jvbass")' },
];

export const STRUDEL_SNIPPET_MIME = 'application/x-strudel-snippet';
