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

describe('buildSummaryText (history-month-nav-spec §2.6)', () => {
  const JUN_2026 = { year: 2026, monthIndex0: 5 };
  const MAY_2026 = { year: 2026, monthIndex0: 4 };

  it('今月・記録ありは monthlyReview (「今月は X日 記録できました」)', () => {
    const s = buildSummaryText(
      { recordedDays: 3, averageMood: 3.5 },
      JUN_2026,
      JUN_2026
    );
    expect(s).toContain('今月は 3日 記録できました');
    expect(s).toContain('3.5');
  });

  it('過去月・記録ありは月名つきで「今月」を含まない', () => {
    const s = buildSummaryText(
      { recordedDays: 3, averageMood: 4 },
      MAY_2026,
      JUN_2026
    );
    expect(s).toContain('2026年5月');
    expect(s).not.toContain('今月');
  });

  it('過去月・avg null は気分そろい待ちの文に分岐する', () => {
    const s = buildSummaryText(
      { recordedDays: 2, averageMood: null },
      MAY_2026,
      JUN_2026
    );
    expect(s).toContain('2026年5月は 2日 記録できました');
    expect(s).toContain('気分の記録がそろうと');
  });

  it('過去月・記録ゼロは「この月の記録はありません。」', () => {
    const s = buildSummaryText(
      { recordedDays: 0, averageMood: null },
      MAY_2026,
      JUN_2026
    );
    expect(s).toBe('この月の記録はありません。');
    // 責めない文言: 禁止語を含まない
    expect(s).not.toContain('記録できていません');
  });

  it('今月・記録ゼロは既存の noRecords 文言', () => {
    const s = buildSummaryText(
      { recordedDays: 0, averageMood: null },
      JUN_2026,
      JUN_2026
    );
    expect(s).toContain('まだ記録がありません');
  });

  // §5-3: 空月文言に禁止語が含まれない
  it('空月文言は禁止語「記録できていません」を含まない', () => {
    const past = buildSummaryText(
      { recordedDays: 0, averageMood: null },
      MAY_2026,
      JUN_2026
    );
    const current = buildSummaryText(
      { recordedDays: 0, averageMood: null },
      JUN_2026,
      JUN_2026
    );
    expect(past).not.toContain('記録できていません');
    expect(current).not.toContain('記録できていません');
  });

  // §5-2 / T3: 今月・avg null の分岐 (「気分の記録がそろうと」文言)
  it('今月・記録あり・avg null は「気分の記録がそろうと」文言', () => {
    const s = buildSummaryText(
      { recordedDays: 2, averageMood: null },
      JUN_2026,
      JUN_2026
    );
    expect(s).toContain('今月は 2日 記録できました');
    expect(s).toContain('気分の記録がそろうと');
  });

  // §5-2 / T3: 過去月・avg 整数でも正常出力
  it('過去月・記録10日・avg 整数は月名と数値を含む', () => {
    const s = buildSummaryText(
      { recordedDays: 10, averageMood: 4 },
      MAY_2026,
      JUN_2026
    );
    expect(s).toContain('2026年5月');
    expect(s).toContain('10日');
    expect(s).toContain('4');
  });

  // §5-12: 通所のみある月 (daily=0件) のサマリー → 空月文言
  it('通所のみある過去月 (daily=0) は「この月の記録はありません。」', () => {
    const s = buildSummaryText(
      { recordedDays: 0, averageMood: null },
      MAY_2026,
      JUN_2026
    );
    expect(s).toBe('この月の記録はありません。');
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
