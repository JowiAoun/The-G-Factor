/**
 * Curated palette of Strudel sound chips for the Studio sound rail.
 *
 * Drums use `s("name*4")` rather than a bare `s("name")` for two reasons:
 *   1. Audition - a single trigger per cycle is barely perceptible for
 *      high-frequency percussion. Four triggers per cycle is reliably
 *      audible across all sounds.
 *   2. Drop default - `s("bd*4")` matches the canonical-idiom "four on the
 *      floor" kick pattern from the system prompt (`prompts.ts` idiom #1),
 *      so the dropped chip immediately makes useful music.
 *
 * `oh` (open hat) and `rim` (rim) are deliberately NOT included - the
 * loaded `github:tidalcycles/dirt-samples` bundle ships those folders
 * empty in our build, so even `*4` of `oh:N` produces no audio. Use the
 * toms (lt/mt/ht) for accents and `hh:N` variants if you need a tick.
 *
 * Synths carry a default `c e g` triad to drive the sample with a pitch
 * source (raw oscillators are silent without `note()`; sampled instruments
 * need it to make a melodic snippet).
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
  { name: 'bd', label: 'Kick', kind: 'drum', snippet: 's("bd*4")' },
  { name: 'sd', label: 'Snare', kind: 'drum', snippet: 's("sd*4")' },
  { name: 'hh', label: 'Hi-hat', kind: 'drum', snippet: 's("hh*4")' },
  { name: 'cp', label: 'Clap', kind: 'drum', snippet: 's("cp*4")' },
  { name: 'cb', label: 'Cowbell', kind: 'drum', snippet: 's("cb*4")' },
  { name: 'lt', label: 'Low tom', kind: 'drum', snippet: 's("lt*4")' },
  { name: 'mt', label: 'Mid tom', kind: 'drum', snippet: 's("mt*4")' },
  { name: 'ht', label: 'High tom', kind: 'drum', snippet: 's("ht*4")' },
  { name: 'triangle', label: 'Tri', kind: 'synth', snippet: 'note("c e g").s("triangle")' },
  { name: 'sine', label: 'Sine', kind: 'synth', snippet: 'note("c e g").s("sine")' },
  { name: 'piano', label: 'Piano', kind: 'synth', snippet: 'note("c e g").s("piano")' },
  { name: 'pluck', label: 'Pluck', kind: 'synth', snippet: 'note("c e g").s("pluck")' },
  { name: 'jvbass', label: 'Bass', kind: 'synth', snippet: 'note("c2 eb2 g2").s("jvbass")' },
  { name: 'arpy', label: 'Arpy', kind: 'synth', snippet: 'note("c e g c5").s("arpy")' },
  { name: 'sax', label: 'Sax', kind: 'synth', snippet: 'note("c e g").s("sax")' },
];

export const STRUDEL_SNIPPET_MIME = 'application/x-strudel-snippet';
