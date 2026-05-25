import { createAvatar } from '@dicebear/core';
import { toonHead } from '@dicebear/collection';
import type { ToonHeadOptions } from './characters';

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

/**
 * Stable cache-key fragment for the pinned-options object. Sorting + JSON
 * keeps two callers passing the same options (e.g. a character's preset)
 * sharing a cache entry rather than re-rendering each call.
 */
function optionsKey(options?: Partial<ToonHeadOptions>): string {
  if (!options) return '';
  const keys = Object.keys(options).sort();
  return JSON.stringify(keys.map((k) => [k, (options as Record<string, unknown>)[k]]));
}

export function renderAvatar(
  seed: string,
  mouth: MouthState,
  /** Pinned toon-head feature options (a character preset). Mouth is always
   *  overridden so the lip-sync layer stays free. Omit for the legacy
   *  seed-only path used by Buzz the host and Bleep the producer. */
  options?: Partial<ToonHeadOptions>,
): string {
  const key = `${seed}|${mouth}|${optionsKey(options)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const svg = createAvatar(toonHead, {
    seed,
    ...(options ?? {}),
    // Mouth must come AFTER the spread so a character preset can't pin it
    // — the runtime lip-sync owns this dimension.
    mouth: [mouth],
  }).toString();
  cache.set(key, svg);
  return svg;
}

/** Render and cache every mouth state so subsequent reads are sync no-ops. */
export function preloadAvatar(
  seed: string,
  options?: Partial<ToonHeadOptions>,
): Record<MouthState, string> {
  return MOUTH_STATES.reduce<Record<MouthState, string>>(
    (acc, m) => {
      acc[m] = renderAvatar(seed, m, options);
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
