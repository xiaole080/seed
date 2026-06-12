// monthNav.ts のユニットテスト。年跨ぎの正規化を確認する。

import { describe, it, expect } from 'vitest';
import { shiftMonth } from './monthNav';

describe('shiftMonth', () => {
  it('同年内の前後移動', () => {
    expect(shiftMonth(2026, 4, +1)).toEqual({ year: 2026, monthIndex0: 5 });
    expect(shiftMonth(2026, 4, -1)).toEqual({ year: 2026, monthIndex0: 3 });
  });

  it('12月から翌年1月へ繰り上がる', () => {
    expect(shiftMonth(2026, 11, +1)).toEqual({ year: 2027, monthIndex0: 0 });
  });

  it('1月から前年12月へ繰り下がる', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, monthIndex0: 11 });
  });

  it('複数月の移動も正規化する', () => {
    expect(shiftMonth(2026, 10, +5)).toEqual({ year: 2027, monthIndex0: 3 });
  });
});
