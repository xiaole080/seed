import { describe, it, expect } from 'vitest';
import {
  DAYS,
  MODE_LABEL,
  MODE_COLOR,
  BAND_LABEL,
  DEFAULT_SCHEDULE,
  isExceptionalCheckIn,
  isOfficeClosed,
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

describe('isOfficeClosed — Sprint 2026-05-24 / バグ① 事務所休業日判定', () => {
  // 仕様: 土曜・日曜 + 毎月最終金曜日 を休業日扱いにする。
  // 祝日特別扱いなし。dateISO はローカル日付として解釈する。
  it('土曜 (2026-05-30) は休業', () => {
    expect(isOfficeClosed('2026-05-30')).toBe(true);
  });

  it('日曜 (2026-05-31) は休業', () => {
    expect(isOfficeClosed('2026-05-31')).toBe(true);
  });

  it('毎月最終金曜日 (2026-05-29) は休業', () => {
    // 2026-05-29 は金曜。+7 日後の 2026-06-05 は別月なので「最終金曜」。
    expect(isOfficeClosed('2026-05-29')).toBe(true);
  });

  it('最終でない金曜 (2026-05-22) は営業', () => {
    // 2026-05-22 は金曜。+7 日後の 2026-05-29 も同月 → 最終ではない。
    expect(isOfficeClosed('2026-05-22')).toBe(false);
  });

  it('平日の木曜 (2026-05-28) は営業', () => {
    expect(isOfficeClosed('2026-05-28')).toBe(false);
  });

  it('12 月最終金曜 (2026-12-25) は休業', () => {
    // 2026-12-25 は金曜。+7 日後は 2027-01-01 (翌年) → 最終金曜。
    expect(isOfficeClosed('2026-12-25')).toBe(true);
  });

  it('うるう年 2024-02-29 (木) は最終金曜ではない平日 = 営業', () => {
    expect(isOfficeClosed('2024-02-29')).toBe(false);
  });

  it('うるう年 2024-02-23 (金) は 2 月最終金曜 = 休業', () => {
    // 2024-02-23 は金曜。+7 日後の 2024-03-01 は別月 → 最終金曜。
    expect(isOfficeClosed('2024-02-23')).toBe(true);
  });

  // QA 追加 (Sprint 2026-05-24): PM 検証スコープで指定された
  // 「月末が金曜のケース」「最終週に金曜が複数あるケースがないこと」を確認する。
  it('月末日 = 金曜のケース (2026-07-31) は最終金曜 = 休業', () => {
    // 2026-07-31 は金曜 (=その月最後の日)。+7 日後 2026-08-07 は翌月 → 最終金曜。
    expect(isOfficeClosed('2026-07-31')).toBe(true);
  });

  it('月末が金曜の月 (2026-07) で、その 1 週間前の金曜 (2026-07-24) は最終金曜ではない = 営業', () => {
    // 2026-07-24 は金曜。+7 後 2026-07-31 も同月 → 最終ではない。
    // 「最終週に金曜が複数」を取り違える実装でも片方が休業判定にならないことを確認。
    expect(isOfficeClosed('2026-07-24')).toBe(false);
  });

  it('5 週ある月 (2026-01) の 5 回目の金曜 (2026-01-30) が最終金曜 = 休業', () => {
    expect(isOfficeClosed('2026-01-30')).toBe(true);
  });

  it('5 週ある月 (2026-01) の 4 回目の金曜 (2026-01-23) は最終ではない = 営業', () => {
    expect(isOfficeClosed('2026-01-23')).toBe(false);
  });

  it('不正な日付文字列を渡しても例外を投げない (防御コード)', () => {
    // 'not-a-date' のような壊れた値が来ても false を返すか、少なくとも throw しない。
    // (壊れた値で休業扱いになるよりは「営業日扱い」のほうが UI が止まらない)
    expect(() => isOfficeClosed('not-a-date')).not.toThrow();
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
