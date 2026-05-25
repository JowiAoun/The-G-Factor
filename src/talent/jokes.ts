/**
 * Joke catalogue for Gemma, The G Factor's host. Three pools:
 *
 *   - NORMAL_JOKES rotate while the bracket is generating.
 *   - PATIENCE_JOKES kick in if generation drags past
 *     `PATIENCE_THRESHOLD_MS` with fewer than `PATIENCE_MIN_CONTESTANTS`
 *     valid contestants - the host acknowledges the wait without blaming
 *     the user's hardware.
 *   - REVEAL_JOKES are one-shot lines delivered as the curtains open.
 *
 * Catalogue is handwritten (no LLM calls) so generation cycles stay
 * with the contestants. Tone target: warm host, gentle Strudel /
 * music / AI puns, never punching down at the user. Short lines so
 * they read at a glance and rotate often.
 */

export const NORMAL_JOKES: readonly string[] = [
  'Welcome to The G Factor. Every contestant aged three seconds.',
  'A polyrhythm walks into a bar. The bar is in seven.',
  'Why are hi-hats so busy? A lot on their cycle.',
  "What did the stack say to the layer? You're on top.",
  'The synth needs therapy. Also `.slow(2)`.',
  "All contestants are original. By 'original' I mean born five seconds ago.",
  'Applause encouraged. Booing also encouraged. We grade on volume.',
  'My agent said AI was the future. Then she became AI. Then she fired me.',
  "If a contestant doesn't move you, consider moving closer.",
  "We tested every pattern. Once. By 'we' I mean a parser.",
  "What's a euclidean rhythm's favourite vegetable? Beets. Three over eight.",
  "I taught a kick drum to talk. All it said was 'boom'.",
  'Backstage drama: two contestants arguing whose snare is louder. Yes.',
  'If the variations confuse you, take heart. They confuse Gemma too.',
  'I trained for years to host this. Years. In dog years.',
  'The neural network warm-up is technically dancing. With matrices.',
  'Hi-hats: pace yourselves. Seven more matches tonight.',
  "Tonight's show: brought to you by `stack()` and the letter `s`.",
];

export const PATIENCE_JOKES: readonly string[] = [
  'They should be ready any minute now.',
  "Backstage: contestant 1's left shoe situation. Bear with us.",
  'Gemma is giving last-minute notes. Perfectionist. We love her.',
  'Wardrobe report: the kick drum refuses to wear pants.',
  'Contestant 3 is doing breathing exercises. Four-on-the-floor intimidates.',
  'The hi-hats have unionised. As is their right.',
  'The producer told me to stall. So here we go.',
  "I'd tell another joke but Gemma is judging me live. Tough crowd.",
  'Quick poll: who believes in the dignity of a snare drum?',
  "There is a hold-up. It is, I'm told, musical in nature.",
];

export const REVEAL_JOKES: readonly string[] = [
  'Without further ado, the contestants!',
  'Ladies, gentlemen, and pattern-matchers: your contestants!',
  'Lights up. Curtains apart. Here we go.',
  'They are ready. SO ready. Curtains, please.',
];

export const PATIENCE_THRESHOLD_MS = 60_000;
export const PATIENCE_MIN_CONTESTANTS = 2;

const MIN_DURATION_MS = 3500;
const MAX_DURATION_MS = 8500;
const MS_PER_CHAR = 65;

/**
 * How long a joke should stay on screen - scales with length so short
 * lines don't linger and long lines have time to read, clamped to a
 * sane window.
 */
export function durationForJoke(text: string): number {
  const raw = text.length * MS_PER_CHAR;
  return Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, raw));
}

/**
 * Picks a random entry from `pool` that isn't already in `used`. When
 * every entry is used, resets the set so the pool can cycle again -
 * but never picks the immediately-previous joke twice in a row.
 *
 * Mutates `used` in place: callers can pass a single ref across many
 * calls and the function maintains the no-repeat-until-exhausted
 * invariant on their behalf.
 */
export function pickFromPool(
  pool: readonly string[],
  used: Set<string>,
): string {
  if (pool.length === 0) throw new Error('jokes: empty pool');

  let available = pool.filter((j) => !used.has(j));
  if (available.length === 0) {
    // Pool exhausted - reset, but exclude the last-shown joke so we
    // don't pick the same one twice back to back. Set iteration order
    // is insertion order in modern JS, so the last entry is the most
    // recent pick.
    const lastShown = Array.from(used).pop();
    used.clear();
    available =
      lastShown && pool.length > 1
        ? pool.filter((j) => j !== lastShown)
        : pool.slice();
  }

  const choice = available[Math.floor(Math.random() * available.length)];
  used.add(choice);
  return choice;
}
