// moodLogForm.ts のユニットテスト。
// フォーム値の復元・要約・送信ペイロード組み立て (純関数) を確認する。

import { describe, it, expect } from 'vitest';
import {
  formatTargetLabel,
  restoreSelections,
  restoreOtherTexts,
  isCategoryFilled,
  summarizeCategory,
  buildSubmitPayload,
} from './moodLogForm';
import type { Category } from './moods';
import type { StoredDailyRecord } from './store';
import type { PrimaryInfluence } from './types';

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

function makeRecord(over: Partial<StoredDailyRecord> = {}): StoredDailyRecord {
  return {
    localRecordId: 'r1',
    date: '2026-05-23',
    mood: 3,
    primaryInfluence: [],
    missingness: NO_MISSING,
    createdAt: '2026-05-23T10:00:00.000Z',
    updatedAt: '2026-05-23T10:00:00.000Z',
    ...over,
  };
}

const DEMO_CAT: Category = {
  id: 'demo',
  label: 'デモ',
  icon: '🔧',
  summaryHint: 'ヒント',
  sections: [
    {
      id: 'single1',
      type: 'single',
      options: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
    },
    {
      id: 'multi1',
      type: 'multi',
      options: [
        { id: 'x', label: 'X' },
        { id: 'y', label: 'Y' },
        { id: 'z', label: 'Z' },
      ],
    },
    { id: 'time1', type: 'time' },
  ],
};

describe('formatTargetLabel', () => {
  it('M月D日(曜) を組み立てる', () => {
    // 2026-05-23 は土曜
    expect(formatTargetLabel('2026-05-23')).toBe('5月23日(土)');
  });

  it('不正な入力はそのまま返す', () => {
    expect(formatTargetLabel('garbage')).toBe('garbage');
  });
});

describe('restoreSelections / restoreOtherTexts', () => {
  it('レコードなしは空', () => {
    expect(restoreSelections(undefined)).toEqual({});
    expect(restoreOtherTexts(undefined)).toEqual({});
  });

  it('睡眠・食事を SelectionMap に戻す', () => {
    const rec = makeRecord({
      sleep: { bedtime: '23:00', sleepIssues: ['difficulty_falling_asleep'] },
      meal: {
        mealsTaken: { breakfast: true, lunch: true },
        mealStatus: 'normal',
      },
    });
    const sel = restoreSelections(rec);
    expect(sel['sleep.bedtime']).toBe('23:00');
    expect(sel['sleep.issues']).toEqual(new Set(['difficulty_falling_asleep']));
    expect(sel['meal.mealsTaken']).toEqual(new Set(['breakfast', 'lunch']));
    expect(sel['meal.mealStatus']).toBe('normal');
  });

  it('otherText を復元する', () => {
    const rec = makeRecord({ sleep: { otherText: 'ねむれず' } });
    expect(restoreOtherTexts(rec)).toEqual({ sleep: 'ねむれず' });
  });
});

describe('isCategoryFilled / summarizeCategory', () => {
  it('未入力なら filled=false・要約は空', () => {
    expect(isCategoryFilled(DEMO_CAT, {})).toBe(false);
    expect(summarizeCategory(DEMO_CAT, {})).toBe('');
  });

  it('single/multi/time をまとめて要約する', () => {
    const sel = {
      'demo.single1': 'a',
      'demo.multi1': new Set(['x', 'y']),
      'demo.time1': '08:30',
    };
    expect(isCategoryFilled(DEMO_CAT, sel)).toBe(true);
    expect(summarizeCategory(DEMO_CAT, sel)).toBe('A / X・Y / 08:30');
  });

  it('multi が 3 件以上は「先頭 ほかN」', () => {
    const sel = { 'demo.multi1': new Set(['x', 'y', 'z']) };
    expect(summarizeCategory(DEMO_CAT, sel)).toBe('X ほか2');
  });
});

describe('buildSubmitPayload', () => {
  it('空・空白の otherText は落とし、influence は配列化する', () => {
    const payload = buildSubmitPayload({
      mood: 4,
      influences: new Set<PrimaryInfluence>(['sleep', 'fatigue']),
      selections: { 'demo.single1': 'a' },
      note: 'メモ',
      influenceOtherText: '   ',
      sectionOtherTexts: { sleep: '  ', meal: 'パンを食べた' },
    });
    expect(payload.mood).toBe(4);
    expect(payload.primaryInfluence).toEqual(['sleep', 'fatigue']);
    expect(payload.influenceOtherText).toBeUndefined();
    expect(payload.sectionOtherTexts).toEqual({ meal: 'パンを食べた' });
  });

  it('100 文字を超える自由入力は切り詰める', () => {
    const long = 'あ'.repeat(150);
    const payload = buildSubmitPayload({
      mood: 3,
      influences: new Set(),
      selections: {},
      note: '',
      influenceOtherText: long,
      sectionOtherTexts: { sleep: long },
    });
    expect(payload.influenceOtherText?.length).toBe(100);
    expect(payload.sectionOtherTexts.sleep.length).toBe(100);
  });
});
