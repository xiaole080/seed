import type { EggSpeciesId, EggSpeciesPalette, EggTraitOption } from './types';

export const BIRD_SPECIES: EggSpeciesPalette[] = [
  {
    id: 'chicken',
    label: 'にわとり',
    sub: 'やさしい黄色',
    shell: '#FBF7EE',
    shellShadow: '#E6DFCB',
    speckle: null,
    body: '#F6CF5A',
    bodyDark: '#E0AE2E',
    cheek: '#F5B5B0',
    beak: '#F08A3C',
    foot: '#F08A3C',
  },
  {
    id: 'robin',
    label: 'こまどり',
    sub: 'みずいろの卵',
    shell: '#BCD9DA',
    shellShadow: '#8FB6B7',
    speckle: null,
    body: '#8B6B4A',
    bodyDark: '#5C4630',
    belly: '#E89A5A',
    cheek: '#F2A988',
    beak: '#E0A14E',
    foot: '#9C7A55',
  },
  {
    id: 'quail',
    label: 'うずら',
    sub: 'まだらもよう',
    shell: '#E8D5A8',
    shellShadow: '#C9B07E',
    speckle: '#6B4A2A',
    body: '#C9A574',
    bodyDark: '#7A5A38',
    stripe: '#5C4022',
    cheek: '#E8A78A',
    beak: '#D69658',
    foot: '#A87E4E',
  },
];

export function getSpecies(id: EggSpeciesId | string | undefined): EggSpeciesPalette {
  return BIRD_SPECIES.find((s) => s.id === id) ?? BIRD_SPECIES[0];
}

export const EGG_SPECIES_OPTIONS: { id: EggSpeciesId; label: string; sub: string }[] = [
  { id: 'chicken', label: 'にわとり', sub: 'やさしい黄色の子' },
  { id: 'robin',   label: 'こまどり', sub: 'みずいろの卵から' },
  { id: 'quail',   label: 'うずら',   sub: 'まだら模様の卵から' },
];

export const EGG_TRAITS: EggTraitOption[] = [
  { id: 'calm',    label: 'おだやか',   icon: '🌿', sub: 'のんびり屋さん' },
  { id: 'curious', label: 'こうきしん', icon: '✨', sub: '探検が好き' },
  { id: 'bright', label: 'あかるい',    icon: '☀️', sub: 'いつも前向き' },
  { id: 'gentle', label: 'おもいやり',  icon: '🌙', sub: 'やさしい心' },
];
