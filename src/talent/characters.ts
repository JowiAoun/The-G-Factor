/**
 * Pre-curated roster of 20 contestant characters.
 *
 * Each character is a stable identity (name + tagline + pinned DiceBear
 * options) that the Talent Show assigns to bracket slots. Pinning every
 * toon-head option per character prevents weird combinations the random
 * seed otherwise produces (e.g. a long-haired character rolling a full
 * beard) and lets the user recognise the same face across shows.
 *
 * The 20 are hand-picked to span hair styles, skin tones, hair colors,
 * clothing, and presentation. No avatar carries simultaneously long rear
 * hair AND a beard — the test in characters.test.ts enforces this.
 */

/**
 * Mirror of `@dicebear/toon-head`'s Options schema. Inlined because that
 * package is a transitive dependency of `@dicebear/collection` and pnpm's
 * strict resolution doesn't surface it for direct import; adding it as a
 * dev-dep just to import a 20-line type would be heavier than the type
 * itself. Update both this and the runtime if the upstream schema ever
 * adds a new feature group.
 */
export type ToonHeadOptions = {
  rearHair?: ('longStraight' | 'longWavy' | 'shoulderHigh' | 'neckHigh')[];
  rearHairProbability?: number;
  body?: ('body')[];
  head?: ('head')[];
  clothes?: ('turtleNeck' | 'openJacket' | 'dress' | 'shirt' | 'tShirt')[];
  mouth?: ('laugh' | 'angry' | 'agape' | 'smile' | 'sad')[];
  beard?: ('moustacheTwirl' | 'fullBeard' | 'chin' | 'chinMoustache' | 'longBeard')[];
  beardProbability?: number;
  eyes?: ('happy' | 'wide' | 'bow' | 'humble' | 'wink')[];
  eyebrows?: ('raised' | 'angry' | 'happy' | 'sad' | 'neutral')[];
  hair?: ('sideComed' | 'undercut' | 'spiky' | 'bun')[];
  hairProbability?: number;
  skinColor?: string[];
  hairColor?: string[];
  clothesColor?: string[];
};

export type Character = {
  /** Stable id used as the DiceBear seed and as the persisted win key. */
  id: string;
  /** Display name shown on the contestant card and in the winners' wall. */
  name: string;
  /** One-line musical-personality tagline shown under the name. */
  tagline: string;
  /** Pinned toon-head options. Mouth is overridden per-frame by the renderer. */
  avatarOptions: ToonHeadOptions;
};

// FNV-1a 32-bit + LCG, identical to the seeded shuffle in axes.ts. Inlined
// rather than imported so the talent module stays self-contained.
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
 * Long rear hair + bun-up front lock (no front hair flop).
 * Used for several feminine-presenting characters.
 */
const longHairBase = {
  hairProbability: 0,
  rearHairProbability: 100,
  beardProbability: 0,
} as const;

/** Short hair, no beard, no long rear hair. */
const shortNoBeard = {
  hairProbability: 100,
  rearHairProbability: 0,
  beardProbability: 0,
} as const;

/** Short hair, full beard. */
const shortWithBeard = {
  hairProbability: 100,
  rearHairProbability: 0,
  beardProbability: 100,
} as const;

export const CHARACTERS: Character[] = [
  {
    id: 'mira',
    name: 'Mira',
    tagline: 'Beat-driven; never overproduces.',
    avatarOptions: {
      ...longHairBase,
      rearHair: ['longStraight'],
      eyes: ['humble'],
      eyebrows: ['neutral'],
      clothes: ['dress'],
      skinColor: ['c68863'],
      hairColor: ['1a1a1a'],
      clothesColor: ['6a3e91'],
    },
  },
  {
    id: 'jaylen',
    name: 'Jaylen Hart',
    tagline: 'Flips drums until they break.',
    avatarOptions: {
      ...shortWithBeard,
      hair: ['undercut'],
      beard: ['fullBeard'],
      eyes: ['wide'],
      eyebrows: ['raised'],
      clothes: ['tShirt'],
      skinColor: ['5c3211'],
      hairColor: ['1a1a1a'],
      clothesColor: ['c79c3a'],
    },
  },
  {
    id: 'kai',
    name: 'Kai',
    tagline: 'Minimalist. One idea, repeated.',
    avatarOptions: {
      ...shortNoBeard,
      hair: ['bun'],
      eyes: ['happy'],
      eyebrows: ['happy'],
      clothes: ['turtleNeck'],
      skinColor: ['f2d3b1'],
      hairColor: ['1a1a1a'],
      clothesColor: ['3a3a3a'],
    },
  },
  {
    id: 'zara',
    name: 'Zara',
    tagline: 'Hooks first, math second.',
    avatarOptions: {
      ...longHairBase,
      rearHair: ['longWavy'],
      eyes: ['bow'],
      eyebrows: ['happy'],
      clothes: ['shirt'],
      skinColor: ['e2a378'],
      hairColor: ['8b3a1f'],
      clothesColor: ['b85c5c'],
    },
  },
  {
    id: 'aldo',
    name: 'Aldo',
    tagline: 'Lives for the low-pass sweep.',
    avatarOptions: {
      ...shortNoBeard,
      hair: ['sideComed'],
      eyes: ['humble'],
      eyebrows: ['neutral'],
      clothes: ['openJacket'],
      skinColor: ['f2d3b1'],
      hairColor: ['6f4e37'],
      clothesColor: ['2a5cba'],
    },
  },
  {
    id: 'priya',
    name: 'Priya',
    tagline: 'Polyrhythms are her second language.',
    avatarOptions: {
      ...longHairBase,
      rearHair: ['longStraight'],
      eyes: ['wink'],
      eyebrows: ['raised'],
      clothes: ['dress'],
      skinColor: ['c68863'],
      hairColor: ['1a1a1a'],
      clothesColor: ['4a7c3a'],
    },
  },
  {
    id: 'theo',
    name: 'Theo',
    tagline: 'Edits everything down to the bone.',
    avatarOptions: {
      ...shortWithBeard,
      hair: ['spiky'],
      beard: ['chin'],
      eyes: ['humble'],
      eyebrows: ['neutral'],
      clothes: ['tShirt'],
      skinColor: ['f2d3b1'],
      hairColor: ['1a1a1a'],
      clothesColor: ['3a3a3a'],
    },
  },
  {
    id: 'nadia',
    name: 'Nadia',
    tagline: 'Believes in the power of a bridge.',
    avatarOptions: {
      ...longHairBase,
      rearHair: ['shoulderHigh'],
      eyes: ['happy'],
      eyebrows: ['happy'],
      clothes: ['turtleNeck'],
      skinColor: ['f2d3b1'],
      hairColor: ['c8a165'],
      clothesColor: ['7a9b8b'],
    },
  },
  {
    id: 'felix',
    name: 'Felix',
    tagline: 'Moustache twirler, breakbeat purist.',
    avatarOptions: {
      ...shortWithBeard,
      hair: ['sideComed'],
      beard: ['moustacheTwirl'],
      eyes: ['wide'],
      eyebrows: ['raised'],
      clothes: ['shirt'],
      skinColor: ['f2d3b1'],
      hairColor: ['c8a165'],
      clothesColor: ['c79c3a'],
    },
  },
  {
    id: 'yuki',
    name: 'Yuki',
    tagline: 'Negative space is the instrument.',
    avatarOptions: {
      ...longHairBase,
      rearHair: ['neckHigh'],
      eyes: ['humble'],
      eyebrows: ['neutral'],
      clothes: ['openJacket'],
      skinColor: ['f2d3b1'],
      hairColor: ['1a1a1a'],
      clothesColor: ['3a3a3a'],
    },
  },
  {
    id: 'marcus',
    name: 'Marcus',
    tagline: 'Subs in his eyes, sub-bass in his soul.',
    avatarOptions: {
      ...shortWithBeard,
      hair: ['undercut'],
      beard: ['fullBeard'],
      eyes: ['humble'],
      eyebrows: ['neutral'],
      clothes: ['shirt'],
      skinColor: ['c68863'],
      hairColor: ['4c2d20'],
      clothesColor: ['2a5cba'],
    },
  },
  {
    id: 'lila',
    name: 'Lila',
    tagline: 'Catches melodies like fireflies.',
    avatarOptions: {
      ...longHairBase,
      rearHair: ['longWavy'],
      eyes: ['happy'],
      eyebrows: ['happy'],
      clothes: ['dress'],
      skinColor: ['e2a378'],
      hairColor: ['6f4e37'],
      clothesColor: ['e2a3a3'],
    },
  },
  {
    id: 'ravi',
    name: 'Ravi',
    tagline: 'Tabla rhythms run his brain.',
    avatarOptions: {
      ...shortWithBeard,
      hair: ['sideComed'],
      beard: ['chinMoustache'],
      eyes: ['wide'],
      eyebrows: ['raised'],
      clothes: ['openJacket'],
      skinColor: ['8d5524'],
      hairColor: ['1a1a1a'],
      clothesColor: ['4a7c3a'],
    },
  },
  {
    id: 'sage',
    name: 'Sage',
    tagline: 'Reverb is a lifestyle choice.',
    avatarOptions: {
      ...shortNoBeard,
      hair: ['bun'],
      eyes: ['humble'],
      eyebrows: ['neutral'],
      clothes: ['turtleNeck'],
      skinColor: ['f2d3b1'],
      hairColor: ['7d7d7d'],
      clothesColor: ['7a9b8b'],
    },
  },
  {
    id: 'niko',
    name: 'Niko',
    tagline: 'Lives at 140 BPM exactly.',
    avatarOptions: {
      ...shortNoBeard,
      hair: ['spiky'],
      eyes: ['wide'],
      eyebrows: ['angry'],
      clothes: ['tShirt'],
      skinColor: ['e2a378'],
      hairColor: ['6f4e37'],
      clothesColor: ['3a3a3a'],
    },
  },
  {
    id: 'anika',
    name: 'Anika',
    tagline: 'Counts in 7 like it’s natural.',
    avatarOptions: {
      ...longHairBase,
      rearHair: ['longStraight'],
      eyes: ['wink'],
      eyebrows: ['happy'],
      clothes: ['shirt'],
      skinColor: ['8d5524'],
      hairColor: ['1a1a1a'],
      clothesColor: ['c79c3a'],
    },
  },
  {
    id: 'bram',
    name: 'Bram',
    tagline: 'Believes every drop deserves a fakeout.',
    avatarOptions: {
      ...shortWithBeard,
      hair: ['undercut'],
      beard: ['fullBeard'],
      eyes: ['happy'],
      eyebrows: ['happy'],
      clothes: ['openJacket'],
      skinColor: ['f2d3b1'],
      hairColor: ['c8a165'],
      clothesColor: ['b85c5c'],
    },
  },
  {
    id: 'esra',
    name: 'Esra',
    tagline: 'Microhouse but make it warm.',
    avatarOptions: {
      ...longHairBase,
      rearHair: ['shoulderHigh'],
      eyes: ['humble'],
      eyebrows: ['neutral'],
      clothes: ['dress'],
      skinColor: ['e2a378'],
      hairColor: ['1a1a1a'],
      clothesColor: ['6a3e91'],
    },
  },
  {
    id: 'diego',
    name: 'Diego',
    tagline: 'Latin percussion, glitch attitude.',
    avatarOptions: {
      ...shortWithBeard,
      hair: ['sideComed'],
      beard: ['chin'],
      eyes: ['wide'],
      eyebrows: ['raised'],
      clothes: ['tShirt'],
      skinColor: ['c68863'],
      hairColor: ['4c2d20'],
      clothesColor: ['4a7c3a'],
    },
  },
  {
    id: 'sloane',
    name: 'Sloane',
    tagline: 'Cold synths, warmer melodies.',
    avatarOptions: {
      ...longHairBase,
      rearHair: ['longStraight'],
      eyes: ['bow'],
      eyebrows: ['neutral'],
      clothes: ['turtleNeck'],
      skinColor: ['f2d3b1'],
      hairColor: ['c8a165'],
      clothesColor: ['3a3a3a'],
    },
  },
];

/**
 * Deterministic seed-keyed Fisher–Yates pick of `count` unique characters
 * from the roster. Same seed always returns the same lineup so a bracket
 * restart shows the same faces in the same slots.
 */
export function pickCharactersForBracket(
  seedCode: string,
  count: number,
): Character[] {
  const arr = CHARACTERS.slice();
  const rand = makeLcg(fnv1a(`characters|${seedCode}`));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand() % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const take = Math.max(0, Math.min(count, arr.length));
  return arr.slice(0, take);
}

/** Look up a character by id (e.g. when resolving a persisted champion). */
export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
