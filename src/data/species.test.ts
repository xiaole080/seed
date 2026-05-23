import { describe, it, expect } from 'vitest';
import {
  BIRD_SPECIES,
  getSpecies,
  EGG_SPECIES_OPTIONS,
  EGG_TRAITS,
} from './species';

describe('BIRD_SPECIES', () => {
  it('3 種 (にわとり/こまどり/うずら)', () => {
    expect(BIRD_SPECIES.map((s) => s.id)).toEqual(['chicken', 'robin', 'quail']);
  });
});

describe('getSpecies', () => {
  it('既知の id はその種を返す', () => {
    expect(getSpecies('robin').id).toBe('robin');
    expect(getSpecies('quail').label).toBe('うずら');
  });

  it('未知の id は先頭種 (chicken) にフォールバックする', () => {
    expect(getSpecies('does-not-exist').id).toBe('chicken');
  });

  it('undefined もフォールバックする', () => {
    expect(getSpecies(undefined).id).toBe('chicken');
  });
});

describe('卵カスタマイズ用データ', () => {
  it('EGG_SPECIES_OPTIONS は 3 種', () => {
    expect(EGG_SPECIES_OPTIONS).toHaveLength(3);
  });

  it('EGG_TRAITS は 4 性格', () => {
    expect(EGG_TRAITS).toHaveLength(4);
    expect(EGG_TRAITS.map((t) => t.id)).toEqual([
      'calm',
      'curious',
      'bright',
      'gentle',
    ]);
  });
});
