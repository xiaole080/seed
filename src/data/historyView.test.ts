// historyView.ts のユニットテスト。
// ラベル解決と表示用文字列の組み立て (純関数) を確認する。

import { describe, it, expect } from 'vitest';
import {
  optionLabelMap,
  formatDate,
  buildSummaryText,
  computeHiddenItems,
  buildTimelineRowView,
} from './historyView';
import type { StoredDailyRecord } from './store';
import type { AttendanceMonthlyRecord } from './types';

const NO_MISSING = {
  noRecord: false,
  skippedMood: false,
  skippedPrimaryInfluence: false,
  skippedSleep: false,
  skippedMeal: false,
  skippedExercise: false,
  skippedCondition: false,
  skippedMedication: false,
  skippedAttendance: false,
  skippedNote: false,
};

function makeRecord(
  over: Partial<StoredDailyRecord> = {}
): StoredDailyRecord {
  return {
    localRecordId: 'r1',
    date: '2026-05-02',
    mood: 4,
    primaryInfluence: [],
    missingness: NO_MISSING,
    createdAt: '2026-05-02T10:00:00.000Z',
    updatedAt: '2026-05-02T10:00:00.000Z',
    ...over,
  };
}

describe('formatDate', () => {
  it('ゼロ埋めして yyyy/MM/DD にする', () => {
    expect(formatDate('2026-05-02')).toBe('2026/05/02');
    expect(formatDate('2026-12-31')).toBe('2026/12/31');
  });
});

describe('optionLabelMap', () => {
  it('既知カテゴリは label を持つマップを返す', () => {
    const map = optionLabelMap('sleep', 'issues');
    expect(Object.keys(map).length).toBeGreaterThan(0);
    for (const v of Object.values(map)) {
      expect(typeof v.label).toBe('string');
    }
  });

  it('未知カテゴリ/セクションは空マップ', () => {
    expect(optionLabelMap('nope', 'nope')).toEqual({});
  });
});

describe('buildSummaryText', () => {
  it('記録ゼロは noRecords 文言', () => {
    expect(buildSummaryText({ recordedDays: 0, averageMood: null }, '7d')).toContain(
      'まだ記録がありません'
    );
  });

  it('通常期間は日数を含む', () => {
    const s = buildSummaryText({ recordedDays: 3, averageMood: 4 }, '7d');
    expect(s).toContain('3');
  });

  it('month は monthlyReview を使う', () => {
    const s = buildSummaryText({ recordedDays: 10, averageMood: 4 }, 'month');
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });
});

describe('computeHiddenItems', () => {
  it('OFF 項目に過去データがあれば列挙する', () => {
    const records = [
      makeRecord({ sleep: { bedtime: '23:00' } }),
      makeRecord({ date: '2026-05-03', sleep: { bedtime: '22:30' } }),
    ];
    // sleep を OFF にしている (recordIds に含めない)
    const hidden = computeHiddenItems(['meal'], records);
    const sleep = hidden.find((h) => h.id === 'sleep');
    expect(sleep).toBeDefined();
    expect(sleep?.days).toBe(2);
  });

  it('ON の項目は列挙しない', () => {
    const records = [makeRecord({ sleep: { bedtime: '23:00' } })];
    expect(computeHiddenItems(['sleep'], records)).toEqual([]);
  });
});

describe('buildTimelineRowView', () => {
  it('record が無ければ moodObj=null・空・展開不可', () => {
    const v = buildTimelineRowView(undefined, undefined, ['sleep']);
    expect(v.moodObj).toBeNull();
    expect(v.lines).toEqual([]);
    expect(v.otherTexts).toEqual([]);
    expect(v.hasNote).toBe(false);
    expect(v.hasExpandable).toBe(false);
    expect(v.attendanceLine).toBeNull();
  });

  it('note があれば hasNote / hasExpandable=true', () => {
    const v = buildTimelineRowView(
      makeRecord({ note: 'きょうのメモ' }),
      undefined,
      []
    );
    expect(v.hasNote).toBe(true);
    expect(v.hasExpandable).toBe(true);
  });

  it('primaryInfluence は本文行に要約として出る', () => {
    const v = buildTimelineRowView(
      makeRecord({ primaryInfluence: ['sleep'] }),
      undefined,
      []
    );
    expect(v.lines.some((l) => l.startsWith('影響していそうなこと:'))).toBe(true);
  });

  it('OFF 項目の otherText は折りたたみに出さない', () => {
    const v = buildTimelineRowView(
      makeRecord({ sleep: { otherText: '寝つけなかった' } }),
      undefined,
      [] // sleep は OFF
    );
    expect(v.otherTexts).toEqual([]);
  });

  it('ON 項目の otherText は折りたたみ対象になる', () => {
    const v = buildTimelineRowView(
      makeRecord({ sleep: { otherText: '寝つけなかった' } }),
      undefined,
      ['sleep']
    );
    expect(v.otherTexts).toEqual([
      { label: '睡眠', text: '寝つけなかった' },
    ]);
    expect(v.hasExpandable).toBe(true);
  });

  it('打刻があれば attendanceLine を組み立てる', () => {
    const att = {
      date: '2026-05-02',
      plannedMode: 'office',
      checkIn: '09:00',
      checkOut: '15:00',
      missingClock: false,
      edited: false,
      exportMonth: '2026-05',
    } as AttendanceMonthlyRecord;
    const v = buildTimelineRowView(makeRecord(), att, []);
    expect(v.attendanceLine).toBe('通所: 09:00 - 15:00');
  });

  it('予定ありで未打刻なら「未打刻」', () => {
    const att = {
      date: '2026-05-02',
      plannedMode: 'office',
      missingClock: true,
      edited: false,
      exportMonth: '2026-05',
    } as AttendanceMonthlyRecord;
    const v = buildTimelineRowView(makeRecord(), att, []);
    expect(v.attendanceLine).toBe('通所: 未打刻');
  });
});
