import type { ToonHeadOptions } from './characters';

/**
 * Single source of truth for the Gemma persona shared between the Talent
 * Show host (CastingStage) and the Studio chat partner (persona.ts). Both
 * surfaces render the same character so the AI assistant feels like one
 * recognisable identity across the app, in keeping with the hackathon
 * theme.
 */

export const GEMMA_NAME = 'Gemma';

/** Stable DiceBear seed - inputs together with `GEMMA_AVATAR_OPTIONS`
 *  produce the same SVG every render. */
export const GEMMA_AVATAR_SEED = 'gemma-the-host';

/**
 * Pinned toon-head options so Gemma's appearance is curated rather than
 * seed-hashed: long wavy blonde hair (with front coverage so the crown
 * isn't bald), open eyes and lifted brows for presenter energy, warm-red
 * open jacket.
 */
export const GEMMA_AVATAR_OPTIONS: ToonHeadOptions = {
  hairProbability: 100,
  rearHairProbability: 100,
  beardProbability: 0,
  rearHair: ['longWavy'],
  hair: ['sideComed'],
  eyes: ['wide'],
  eyebrows: ['raised'],
  clothes: ['openJacket'],
  skinColor: ['f2d3b1'],
  hairColor: ['c8a165'],
  clothesColor: ['b85c5c'],
};
