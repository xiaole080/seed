import { describe, it, expect, vi } from 'vitest';
import { loadJson, saveJson } from './storage';

describe('storage — localStorage ラッパ', () => {
  it('保存した値をそのまま読み戻せる (round-trip)', () => {
    saveJson('seed.test.obj', { a: 1, b: ['x', 'y'], c: { d: true } });
    expect(loadJson('seed.test.obj', null)).toEqual({
      a: 1,
      b: ['x', 'y'],
      c: { d: true },
    });
  });

  it('プリミティブも round-trip できる', () => {
    saveJson('seed.test.num', 7);
    saveJson('seed.test.str', 'hello');
    saveJson('seed.test.bool', false);
    expect(loadJson('seed.test.num', 0)).toBe(7);
    expect(loadJson('seed.test.str', '')).toBe('hello');
    expect(loadJson('seed.test.bool', true)).toBe(false);
  });

  it('未保存キーは fallback を返す', () => {
    expect(loadJson('seed.test.missing', 'default')).toBe('default');
  });

  it('壊れた JSON は fallback を返す (例外を投げない)', () => {
    localStorage.setItem('seed.test.broken', '{ this is not json');
    expect(loadJson('seed.test.broken', 42)).toBe(42);
  });

  it('saveJson は quota 例外を握りつぶす', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    expect(() => saveJson('seed.test.k', 'v')).not.toThrow();
    spy.mockRestore();
  });
});
