// monthNav.ts のユニットテスト。年跨ぎの正規化と月範囲・最古月の算出を確認する。

import { describe, it, expect } from 'vitest';
import {
  shiftMonth,
  monthRange,
  formatYearMonth,
  ymFromISO,
  compareYearMonth,
  oldestRecordMonth,
} from './monthNav';

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

describe('monthRange', () => {
  it('2026年6月は 1日〜30日', () => {
    expect(monthRange({ year: 2026, monthIndex0: 5 })).toEqual({
      start: '2026-06-01',
      end: '2026-06-30',
    });
  });

  it('31日の月は末日が 31', () => {
    expect(monthRange({ year: 2026, monthIndex0: 4 })).toEqual({
      start: '2026-05-01',
      end: '2026-05-31',
    });
  });

  it('うるう年の2月は 29日まで', () => {
    expect(monthRange({ year: 2024, monthIndex0: 1 })).toEqual({
      start: '2024-02-01',
      end: '2024-02-29',
    });
  });

  it('平年の2月は 28日まで', () => {
    expect(monthRange({ year: 2026, monthIndex0: 1 })).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });
});

describe('formatYearMonth', () => {
  it('「YYYY年M月」形式 (ゼロ埋めしない)', () => {
    expect(formatYearMonth({ year: 2026, monthIndex0: 5 })).toBe('2026年6月');
    expect(formatYearMonth({ year: 2025, monthIndex0: 11 })).toBe(
      '2025年12月'
    );
    expect(formatYearMonth({ year: 2026, monthIndex0: 0 })).toBe('2026年1月');
  });
});

describe('ymFromISO', () => {
  it('ISO 日付から YearMonth を取り出す', () => {
    expect(ymFromISO('2026-06-12')).toEqual({ year: 2026, monthIndex0: 5 });
    expect(ymFromISO('2025-01-01')).toEqual({ year: 2025, monthIndex0: 0 });
  });
});

describe('compareYearMonth', () => {
  it('前後関係を符号で返す', () => {
    const a = { year: 2026, monthIndex0: 5 };
    const b = { year: 2025, monthIndex0: 11 };
    expect(compareYearMonth(a, b)).toBeGreaterThan(0);
    expect(compareYearMonth(b, a)).toBeLessThan(0);
    expect(compareYearMonth(a, { year: 2026, monthIndex0: 5 })).toBe(0);
  });

  it('同年内は月で比較する', () => {
    expect(
      compareYearMonth(
        { year: 2026, monthIndex0: 2 },
        { year: 2026, monthIndex0: 4 }
      )
    ).toBeLessThan(0);
  });
});

describe('oldestRecordMonth', () => {
  it('最小日付の属する月を返す', () => {
    expect(
      oldestRecordMonth(['2026-03-05', '2025-11-20', '2026-06-01'])
    ).toEqual({ year: 2025, monthIndex0: 10 });
  });

  it('空配列なら null', () => {
    expect(oldestRecordMonth([])).toBeNull();
  });

  it('1件だけならその月', () => {
    expect(oldestRecordMonth(['2026-06-12'])).toEqual({
      year: 2026,
      monthIndex0: 5,
    });
  });

  // §5-2: 同月内に複数日ある場合も最古月判定が正しい
  it('同月内の複数日付は同じ YearMonth を返す', () => {
    expect(
      oldestRecordMonth(['2026-05-01', '2026-05-10', '2026-05-31'])
    ).toEqual({ year: 2026, monthIndex0: 4 });
  });

  // §5-8: 月末日数の違い — 30日の月 (2026年4月)
  it('monthRange: 30日の月 (2026年4月) は end が 30日', () => {
    expect(monthRange({ year: 2026, monthIndex0: 3 })).toEqual({
      start: '2026-04-01',
      end: '2026-04-30',
    });
  });

  // §5-6: 年跨ぎ — compareYearMonth で年をまたいだ比較が正しい
  it('compareYearMonth: 年跨ぎの場合 a={2026,0} > b={2025,11}', () => {
    expect(
      compareYearMonth({ year: 2026, monthIndex0: 0 }, { year: 2025, monthIndex0: 11 })
    ).toBeGreaterThan(0);
  });
});
