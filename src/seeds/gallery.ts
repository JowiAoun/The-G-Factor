export type GallerySeed = {
  id: string;
  label: string;
  code: string;
  genre: string;
  difficulty: 1 | 2 | 3;
};

export const SEED_GALLERY: GallerySeed[] = [
  {
    id: 'kick',
    label: 'Minimal kick',
    code: 's("bd*4")',
    genre: 'techno',
    difficulty: 1,
  },
  {
    id: 'groove',
    label: 'Kick + hat groove',
    code: 's("bd hh sd hh")',
    genre: 'house',
    difficulty: 1,
  },
  {
    id: 'melodic',
    label: 'Melodic loop',
    code: 'note("c e g c5").s("sawtooth").slow(2)',
    genre: 'lead',
    difficulty: 2,
  },
  {
    id: 'polyrhythm',
    label: 'Euclidean polyrhythm',
    code: 's("bd(3,8), hh(5,8)")',
    genre: 'idm',
    difficulty: 3,
  },
  {
    id: 'ambient',
    label: 'Ambient pad',
    code: 'note("<c eb g bb>*2").s("sawtooth").slow(4).room(0.5)',
    genre: 'ambient',
    difficulty: 2,
  },
  {
    id: 'breakbeat',
    label: 'Breakbeat',
    code: 's("bd ~ sd cp, hh*8")',
    genre: 'breaks',
    difficulty: 2,
  },
  {
    id: 'stack',
    label: 'Drum stack',
    code: 'stack(s("bd*2"), s("~ sd"), s("hh*8"))',
    genre: 'drum-n-bass',
    difficulty: 2,
  },
];
