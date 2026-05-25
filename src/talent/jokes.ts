/**
 * Joke catalogue for Buzz, the Talent Show's host. Three pools:
 *
 *   - NORMAL_JOKES rotate while the bracket is generating.
 *   - PATIENCE_JOKES kick in if generation drags past
 *     `PATIENCE_THRESHOLD_MS` with fewer than `PATIENCE_MIN_CONTESTANTS`
 *     valid contestants - Buzz acknowledges the wait without blaming
 *     the user's hardware.
 *   - REVEAL_JOKES are one-shot lines delivered as the curtains open.
 *
 * Catalogue is handwritten (no LLM calls) so generation cycles stay
 * with the contestants. Tone target: warm host, gentle Strudel /
 * music / AI puns, never punching down at the user.
 */

export const NORMAL_JOKES: readonly string[] = [
  'Welcome to the Strudel Talent Show - where every contestant is a 2-billion-parameter understudy.',
  "A polyrhythm walks into a bar. The bar is in 7. The kick lands on beat 5. Nobody knows where the downbeat is anymore.",
  'I asked Gemma why hi-hats are so busy. She said, "because they have a lot on their cycle."',
  "What did the stack say to the layer? You're on top.",
  "Did you hear about the synth that couldn't keep time? It needed therapy. And a `.slow(2)`.",
  "Our contestants are all original - by which I mean none of them existed three seconds ago.",
  'Reminder: applause is encouraged. Booing is also encouraged. We grade on volume.',
  "My agent told me hosting an AI talent show would be the future. Then she became an AI. Then she fired me.",
  "If a contestant doesn't move you tonight, please consider: maybe YOU should move closer.",
  'We tested these patterns rigorously. By "we" I mean a parser, and by "rigorously" I mean once.',
  "What's a euclidean rhythm's favourite vegetable? Beets - three over eight.",
  "I once tried to teach a kick drum to talk. All it could say was 'boom'. Devastating.",
  "Backstage is chaos. Two contestants are arguing about whose snare is louder. The answer is: yes.",
  'If you find tonight\'s variations confusing, just remember - so does Gemma.',
  'I trained for years to host this show. Years. In dog years. I am, biologically, two.',
  'The neural network warm-up is technically a kind of dance. A very slow dance. With matrices.',
  'Quick reminder for the hi-hats: please pace yourselves. We have seven more matches tonight.',
  "Tonight's show is brought to you by the letter `s` and the function `stack()`. Honestly that's most of Strudel.",
];

export const PATIENCE_JOKES: readonly string[] = [
  'They should be ready any minute now…!',
  "Backstage tells me there's been an issue with contestant 1's left shoe. Bear with us.",
  "Gemma is giving everyone last-minute notes. She's a perfectionist. We love that about her.",
  'Update from wardrobe: the kick drum refuses to wear pants. Negotiations ongoing.',
  'Contestant 3 is doing breathing exercises. Four-on-the-floor is intimidating up close.',
  'Our hi-hats have unionised. As is their right. We support them.',
  'The producer just asked me to "stall a bit". So… here we go.',
  "I'd tell you another joke, but Gemma is judging my material in real time. Tough crowd.",
  'Quick poll: who here believes in the inherent dignity of a snare drum? Show of hands.',
  'I have been told there is a hold-up. The hold-up, I have been told, is musical in nature.',
];

export const REVEAL_JOKES: readonly string[] = [
  'Without further ado…',
  'Ladies, gentlemen, and pattern-matchers - your contestants!',
  'Lights up, curtains apart - here we go!',
  'They are ready. They are SO ready. Curtains, please!',
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
