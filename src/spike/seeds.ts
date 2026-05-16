export type Seed = {
  id: string;
  label: string;
  code: string;
};

export const SPIKE_SEEDS: Seed[] = [
  { id: 'kick', label: 'Minimal kick', code: 's("bd*4")' },
  { id: 'groove', label: 'Kick + hat groove', code: 's("bd hh sd hh")' },
  {
    id: 'melodic',
    label: 'Melodic synth loop',
    code: 'note("c e g c5").s("sawtooth").slow(2)',
  },
  { id: 'polyrhythm', label: 'Euclidean polyrhythm', code: 's("bd(3,8), hh(5,8)")' },
  {
    id: 'ambient',
    label: 'Ambient pad',
    code: 'note("<c eb g bb>*2").s("sawtooth").slow(4).room(0.5)',
  },
];
