import { createAvatar } from '@dicebear/core';
import { toonHead } from '@dicebear/collection';

/**
 * The five mouth poses DiceBear `toon-head` exposes. Each renders as a
 * different `<path>` in the resulting SVG; we use them as poseable frames
 * to drive the contestant's "talking", winning, and losing reactions.
 */
export type MouthState = 'smile' | 'agape' | 'laugh' | 'sad' | 'angry';

export const MOUTH_STATES: MouthState[] = [
  'smile',
  'agape',
  'laugh',
  'sad',
  'angry',
];

// Cache the rendered SVG strings — DiceBear's avatar generator does
// non-trivial work (random walk over feature options seeded by the input),
// and we re-render at 60 fps when the avatar is talking.
const cache = new Map<string, string>();

export function renderAvatar(seed: string, mouth: MouthState): string {
  const key = `${seed}|${mouth}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const svg = createAvatar(toonHead, {
    seed,
    // Forcing a singleton array pins the mouth — without this DiceBear
    // would pick one randomly from the full mouth set on every render.
    mouth: [mouth],
  }).toString();
  cache.set(key, svg);
  return svg;
}

/** Render and cache every mouth state so subsequent reads are sync no-ops. */
export function preloadAvatar(seed: string): Record<MouthState, string> {
  return MOUTH_STATES.reduce<Record<MouthState, string>>(
    (acc, m) => {
      acc[m] = renderAvatar(seed, m);
      return acc;
    },
    {} as Record<MouthState, string>,
  );
}

/**
 * FNV-1a 32-bit hash → 8-char hex string. Cheap, deterministic, and
 * comfortably wide for the 4–8 contestant identities a single show needs.
 * Used to derive DiceBear seeds from `variation_code + variation_index`,
 * so a given variation always wears the same face.
 */
export function hashSeed(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
