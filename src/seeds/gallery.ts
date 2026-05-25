export type GallerySeed = {
  id: string;
  label: string;
  code: string;
  genre: string;
  difficulty: 1 | 2 | 3;
};

export const SEED_GALLERY: GallerySeed[] = [
  // Techno / Minimal / Industrial
  {
    id: 'kick',
    label: 'Minimal kick',
    code: 's("bd*4")',
    genre: 'techno',
    difficulty: 1,
  },
  {
    id: 'tech-clap',
    label: 'Techno + clap',
    code: 's("bd*4, ~ cp ~ cp")',
    genre: 'techno',
    difficulty: 1,
  },
  {
    id: 'minimal-tick',
    label: 'Minimal tick',
    code: 's("bd ~ ~ bd, ~ rim ~ rim")',
    genre: 'minimal',
    difficulty: 2,
  },
  {
    id: 'driving-techno',
    label: 'Driving techno',
    code: 'stack(s("bd*4"), s("~ ~ cp ~"), s("hh*16").gain(0.6))',
    genre: 'techno',
    difficulty: 2,
  },
  {
    id: 'industrial',
    label: 'Industrial pulse',
    code: 's("bd*2, ~ lt ~ lt").lpf(400).room(0.4)',
    genre: 'industrial',
    difficulty: 2,
  },
  {
    id: 'acid-line',
    label: 'Acid bass line',
    code: 'note("c2 c2 eb2 c2 g2 c2 eb2 g2").s("sawtooth").lpf(800).fast(2)',
    genre: 'acid',
    difficulty: 3,
  },

  // House / Deep House / Disco / Garage
  {
    id: 'groove',
    label: 'Kick + hat groove',
    code: 's("bd hh sd hh")',
    genre: 'house',
    difficulty: 1,
  },
  {
    id: 'four-floor',
    label: 'Four on the floor',
    code: 'stack(s("bd*4"), s("~ cp ~ cp"), s("hh*8"))',
    genre: 'house',
    difficulty: 1,
  },
  {
    id: 'deep-house',
    label: 'Deep house',
    code: 'stack(s("bd*4"), s("hh*8").gain(0.5), note("c2 ~ eb2 g2").s("sine"))',
    genre: 'deep-house',
    difficulty: 2,
  },
  {
    id: 'disco-shuffle',
    label: 'Disco shuffle',
    code: 'stack(s("bd*4"), s("~ cp ~ cp"), s("oh ~ hh ~"))',
    genre: 'disco',
    difficulty: 2,
  },

  // Breaks / Jungle / DnB
  {
    id: 'breakbeat',
    label: 'Breakbeat',
    code: 's("bd ~ sd cp, hh*8")',
    genre: 'breaks',
    difficulty: 2,
  },
  {
    id: 'amen-feel',
    label: 'Amen-style',
    code: 's("bd sd bd sd, hh*16").fast(1.5)',
    genre: 'jungle',
    difficulty: 2,
  },
  {
    id: 'dnb-stepper',
    label: 'DnB stepper',
    code: 's("bd ~ ~ sd, hh*8").fast(2)',
    genre: 'dnb',
    difficulty: 2,
  },
  {
    id: 'half-time-dnb',
    label: 'Half-time DnB',
    code: 's("bd ~ ~ ~, ~ ~ sd ~, hh*8")',
    genre: 'dnb',
    difficulty: 2,
  },
  {
    id: 'stack',
    label: 'Drum stack',
    code: 'stack(s("bd*2"), s("~ sd"), s("hh*8"))',
    genre: 'drum-n-bass',
    difficulty: 2,
  },

  // Trap / Hip-Hop / Lo-fi
  {
    id: 'trap-skitter',
    label: 'Trap skitter',
    code: 's("bd ~ ~ bd, ~ ~ sd ~, hh*16")',
    genre: 'trap',
    difficulty: 2,
  },
  {
    id: 'lofi-boom',
    label: 'Lo-fi boom',
    code: 's("bd ~ sd ~").slow(2).room(0.3)',
    genre: 'lofi',
    difficulty: 1,
  },
  {
    id: 'hiphop',
    label: 'Boom-bap',
    code: 's("bd ~ ~ ~, ~ ~ sd ~, hh ~ hh ~")',
    genre: 'hiphop',
    difficulty: 1,
  },
  {
    id: 'dilla-swing',
    label: 'Dilla swing',
    code: 's("bd ~ sd bd, hh*8").slow(1.1)',
    genre: 'hiphop',
    difficulty: 2,
  },

  // Melodic / Synth lines
  {
    id: 'melodic',
    label: 'Melodic loop',
    code: 'note("c e g c5").s("sawtooth").slow(2)',
    genre: 'lead',
    difficulty: 2,
  },
  {
    id: 'arpeggio',
    label: 'Arpeggio up-down',
    code: 'note("c4 e4 g4 b4 g4 e4").s("triangle").fast(2)',
    genre: 'arp',
    difficulty: 2,
  },
  {
    id: 'bass-walk',
    label: 'Bass walk',
    code: 'note("c2 e2 g2 a2").s("square").lpf(600)',
    genre: 'bass',
    difficulty: 1,
  },
  {
    id: 'chord-stab',
    label: 'Chord stabs',
    code: 'note("<[c3,e3,g3] [f3,a3,c4] [g3,b3,d4] [c3,e3,g3]>").s("sawtooth").slow(2)',
    genre: 'chords',
    difficulty: 3,
  },
  {
    id: 'dorian-lead',
    label: 'Dorian lead',
    code: 'n("0 2 3 5 7 5 3 2").scale("D:dorian").s("triangle").slow(2)',
    genre: 'lead',
    difficulty: 2,
  },
  {
    id: 'fifths-bass',
    label: 'Power fifths',
    code: 'note("c2 g2 c2 g2").s("sawtooth").lpf(500)',
    genre: 'bass',
    difficulty: 1,
  },

  // Ambient / Pad / Dub
  {
    id: 'ambient',
    label: 'Ambient pad',
    code: 'note("<c eb g bb>*2").s("sawtooth").slow(4).room(0.5)',
    genre: 'ambient',
    difficulty: 2,
  },
  {
    id: 'drone-pad',
    label: 'Drone pad',
    code: 'note("c3").s("sawtooth").slow(8).room(0.8).lpf(500)',
    genre: 'ambient',
    difficulty: 1,
  },
  {
    id: 'dub-chord',
    label: 'Dub chord',
    code: 'note("<[c3,eb3,g3] [f3,ab3,c4]>").s("sine").slow(4).room(0.6).delay(0.5)',
    genre: 'dub',
    difficulty: 3,
  },
  {
    id: 'ethereal-bells',
    label: 'Ethereal bells',
    code: 'note("c5 eb5 g5 bb5").s("triangle").slow(4).room(0.7).delay(0.4)',
    genre: 'ambient',
    difficulty: 2,
  },

  // IDM / Polyrhythmic / Glitch
  {
    id: 'polyrhythm',
    label: 'Euclidean polyrhythm',
    code: 's("bd(3,8), hh(5,8)")',
    genre: 'idm',
    difficulty: 3,
  },
  {
    id: 'euclid-stack',
    label: 'Euclid stack',
    code: 'stack(s("bd(3,8)"), s("hh(5,8)"), s("sd(2,8)"))',
    genre: 'idm',
    difficulty: 3,
  },
  {
    id: 'glitch-jux',
    label: 'Glitch jux',
    code: 's("bd ~ sd bd").jux(rev).fast(2)',
    genre: 'idm',
    difficulty: 3,
  },
  {
    id: 'cross-meter',
    label: 'Cross-meter',
    code: 's("bd*3, hh*4, sd*2").slow(2)',
    genre: 'idm',
    difficulty: 3,
  },

  // Dubstep / Footwork / Juke / Gqom
  {
    id: 'dubstep-half',
    label: 'Dubstep half-time',
    code: 's("bd ~ ~ ~, ~ ~ sd ~").slow(2).room(0.4)',
    genre: 'dubstep',
    difficulty: 2,
  },
  {
    id: 'footwork',
    label: 'Footwork roll',
    code: 's("bd*5, ~ ~ cp ~").fast(1.5)',
    genre: 'footwork',
    difficulty: 3,
  },
  {
    id: 'juke-clap',
    label: 'Juke clap',
    code: 's("bd*4, ~ cp ~ cp ~ ~").fast(1.5)',
    genre: 'juke',
    difficulty: 3,
  },
  {
    id: 'gqom-stomp',
    label: 'Gqom stomp',
    code: 's("bd ~ bd bd, ~ ~ cp ~").slow(2)',
    genre: 'gqom',
    difficulty: 2,
  },

  // Pattern transforms / FX-focused
  {
    id: 'every-rev',
    label: 'Every-4 reverse',
    code: 's("bd hh sd hh").every(4, x => x.rev())',
    genre: 'glitch',
    difficulty: 3,
  },
  {
    id: 'cat-switch',
    label: 'Cat switch',
    code: 'cat(s("bd*4"), s("bd hh sd hh"), s("bd ~ sd ~"))',
    genre: 'pattern',
    difficulty: 2,
  },
  {
    id: 'pan-pingpong',
    label: 'Pan ping-pong',
    code: 'stack(s("bd*4"), s("hh*8").pan("0 1 0 1"))',
    genre: 'minimal',
    difficulty: 2,
  },
];

/**
 * Random pick from the library. Optional `excludeId` lets callers avoid
 * a back-to-back repeat — the auto-pick path uses this so successive shows
 * don't land on the same seed.
 */
export function pickRandomSeed(excludeId?: string | null): GallerySeed {
  const pool =
    excludeId && SEED_GALLERY.length > 1
      ? SEED_GALLERY.filter((s) => s.id !== excludeId)
      : SEED_GALLERY;
  return pool[Math.floor(Math.random() * pool.length)];
}
