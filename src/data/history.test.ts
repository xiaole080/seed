import { describe, it, expect } from 'vitest';
import { HISTORY_14, SLEEP_VALUE, MEDS_VALUE } from './history';

describe('HISTORY_14 (モック履歴)', () => {
  it('14 日分ある', () => {
    expect(HISTORY_14).toHaveLength(14);
  });

  it('dayOffset は 13 (最古) → 0 (今日) の順', () => {
    expect(HISTORY_14[0].dayOffset).toBe(13);
    expect(HISTORY_14[13].dayOffset).toBe(0);
  });

  it('mood はすべて 1〜5 の範囲', () => {
    for (const h of HISTORY_14) {
      expect(h.mood).toBeGreaterThanOrEqual(1);
      expect(h.mood).toBeLessThanOrEqual(5);
    }
  });

  it('attended は 0 か 1', () => {
    for (const h of HISTORY_14) {
      expect([0, 1]).toContain(h.attended);
    }
  });
});

describe('数値マップ', () => {
  it('SLEEP_VALUE は睡眠状態を数値化する', () => {
    expect(SLEEP_VALUE.good).toBe(4);
    expect(SLEEP_VALUE.bad).toBe(1);
  });

  it('MEDS_VALUE は服薬状態を数値化する', () => {
    expect(MEDS_VALUE.all).toBe(3);
    expect(MEDS_VALUE.none).toBe(0);
  });
});
