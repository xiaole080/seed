// appState.ts のユニットテスト。
// UI に依存しない補助関数 (正規化・時刻差・日付オフセット・選択変換) を確認する。

import { describe, it, expect } from 'vitest';
import {
  selectionsToPlain,
  diffMinutes,
  isoDaysOffset,
  normalizeRegion,
} from './appState';

describe('selectionsToPlain', () => {
  it('Set は配列化し、文字列・null はそのまま', () => {
    const out = selectionsToPlain({
      a: new Set(['x', 'y']),
      b: 'single',
      c: null,
    });
    expect(out).toEqual({ a: ['x', 'y'], b: 'single', c: null });
  });
});

describe('diffMinutes', () => {
  it('時刻差を分で返す', () => {
    expect(diffMinutes('09:00', '15:30')).toBe(390);
  });

  it('数値化できない入力は undefined', () => {
    expect(diffMinutes('xx', '15:00')).toBeUndefined();
    expect(diffMinutes('09:00', 'bad')).toBeUndefined();
  });
});

describe('isoDaysOffset', () => {
  it('YYYY-MM-DD 形式で返す', () => {
    expect(isoDaysOffset(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('-1 は 0 のちょうど前日になる', () => {
    const today = isoDaysOffset(0);
    const yesterday = isoDaysOffset(-1);
    const dT = new Date(today + 'T00:00:00');
    const dY = new Date(yesterday + 'T00:00:00');
    expect((dT.getTime() - dY.getTime()) / 86_400_000).toBe(1);
  });
});

describe('normalizeRegion', () => {
  it('既知の文字列 RegionId は preset に正規化', () => {
    expect(normalizeRegion('osaka')).toEqual({
      kind: 'preset',
      presetId: 'osaka',
    });
  });

  it('未知の文字列は tokyo にフォールバック', () => {
    expect(normalizeRegion('atlantis')).toEqual({
      kind: 'preset',
      presetId: 'tokyo',
    });
  });

  it('custom は緯度経度を丸めて保持する', () => {
    const out = normalizeRegion({
      kind: 'custom',
      name: 'どこか',
      lat: 35.123456,
      lon: 139.987654,
    });
    expect(out.kind).toBe('custom');
    if (out.kind === 'custom') {
      expect(out.name).toBe('どこか');
      // roundCoord で小数2位に丸まる
      expect(out.lat).toBeCloseTo(35.12, 5);
      expect(out.lon).toBeCloseTo(139.99, 5);
    }
  });

  it('壊れたオブジェクトは tokyo にフォールバック', () => {
    expect(normalizeRegion({ kind: 'custom', name: 'x' })).toEqual({
      kind: 'preset',
      presetId: 'tokyo',
    });
    expect(normalizeRegion(null)).toEqual({ kind: 'preset', presetId: 'tokyo' });
  });
});
