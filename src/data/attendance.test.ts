import { describe, it, expect } from 'vitest';
import {
  DAYS,
  MODE_LABEL,
  MODE_COLOR,
  BAND_LABEL,
  DEFAULT_SCHEDULE,
  isExceptionalCheckIn,
} from './attendance';
import { scheduleSlotFor } from './store';
import type { AttendanceMonthlyRecord } from './types';

describe('attendance 定数', () => {
  it('DAYS は月曜始まりの 7 曜日', () => {
    expect(DAYS).toEqual(['月', '火', '水', '木', '金', '土', '日']);
  });

  it('MODE_LABEL は通所/在宅/休み', () => {
    expect(MODE_LABEL.office).toBe('通所');
    expect(MODE_LABEL.home).toBe('在宅');
    expect(MODE_LABEL.off).toBe('休み');
  });

  it('MODE_COLOR は全モード分の配色を持つ', () => {
    for (const mode of ['office', 'home', 'off'] as const) {
      expect(MODE_COLOR[mode].bg).toBeTruthy();
      expect(MODE_COLOR[mode].fg).toBeTruthy();
    }
  });

  it('BAND_LABEL は一日/午前/午後', () => {
    expect(BAND_LABEL.full).toBe('一日');
    expect(BAND_LABEL.am).toBe('午前のみ');
    expect(BAND_LABEL.pm).toBe('午後のみ');
  });
});

describe('DEFAULT_SCHEDULE', () => {
  it('月〜日の 7 日分が揃っている', () => {
    for (let i = 0; i < 7; i++) {
      expect(DEFAULT_SCHEDULE[i]).toBeDefined();
      expect(DEFAULT_SCHEDULE[i].mode).toBeTruthy();
      expect(DEFAULT_SCHEDULE[i].band).toBeTruthy();
    }
  });

  it('土日 (index 5/6) は休み', () => {
    expect(DEFAULT_SCHEDULE[5].mode).toBe('off');
    expect(DEFAULT_SCHEDULE[6].mode).toBe('off');
  });
});

describe('scheduleSlotFor — DEFAULT_SCHEDULE の各曜日', () => {
  // 2026 年 5 月 25 日(月) を起点に月〜日まで7日分を網羅する。
  // DAYS = ['月','火','水','木','金','土','日'] → 0=月..6=日 の並び。
  const cases: Array<{ date: string; idx: number; label: string }> = [
    { date: '2026-05-25', idx: 0, label: '月' },
    { date: '2026-05-26', idx: 1, label: '火' },
    { date: '2026-05-27', idx: 2, label: '水' },
    { date: '2026-05-28', idx: 3, label: '木' },
    { date: '2026-05-29', idx: 4, label: '金' },
    { date: '2026-05-30', idx: 5, label: '土' },
    { date: '2026-05-31', idx: 6, label: '日' },
  ];
  for (const { date, idx, label } of cases) {
    it(`${label} (${date}) は DEFAULT_SCHEDULE[${idx}] を返す`, () => {
      const slot = scheduleSlotFor(date, DEFAULT_SCHEDULE);
      expect(slot).toEqual(DEFAULT_SCHEDULE[idx]);
    });
  }

  it('日曜は mode=off と判定される', () => {
    // 仕様 §2-3 の代表ケース。土日は休み判定が崩れない。
    const slot = scheduleSlotFor('2026-05-31', DEFAULT_SCHEDULE);
    expect(slot?.mode).toBe('off');
  });
});

describe('isExceptionalCheckIn (T8)', () => {
  const base: AttendanceMonthlyRecord = {
    localAttendanceId: 'att_2026-05-30',
    date: '2026-05-30',
    weekday: 'Sat',
    plannedMode: 'off',
    plannedBand: 'full',
    missingClock: false,
    edited: false,
    exportMonth: '2026-05',
  };

  it('plannedMode=off + actualMode=office は true', () => {
    expect(isExceptionalCheckIn({ ...base, actualMode: 'office' })).toBe(true);
  });

  it('plannedMode=off で actualMode 未設定なら false (打刻していないお休み)', () => {
    expect(isExceptionalCheckIn(base)).toBe(false);
  });

  it('plannedMode=office (休みでない日) は actualMode があっても false', () => {
    expect(
      isExceptionalCheckIn({
        ...base,
        plannedMode: 'office',
        actualMode: 'office',
      }),
    ).toBe(false);
  });
});
