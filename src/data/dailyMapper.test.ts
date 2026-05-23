import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildDailyRecord, type BuildDailyArgs } from './dailyMapper';
import type { StoredDailyRecord } from './store';

const ALL_CATEGORIES = ['sleep', 'meal', 'exercise', 'condition', 'meds'];

function args(over: Partial<BuildDailyArgs> = {}): BuildDailyArgs {
  return {
    mood: 3,
    primaryInfluence: ['sleep'],
    selections: {},
    note: '',
    enabledCategoryIds: ALL_CATEGORIES,
    date: '2026-05-23',
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 23, 10, 30, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('buildDailyRecord — 最小入力', () => {
  it('気分のみ: 詳細セクションは undefined', () => {
    const rec = buildDailyRecord(args());
    expect(rec.mood).toBe(3);
    expect(rec.sleep).toBeUndefined();
    expect(rec.meal).toBeUndefined();
    expect(rec.exercise).toBeUndefined();
    expect(rec.condition).toBeUndefined();
    expect(rec.medication).toBeUndefined();
  });

  it('有効カテゴリを未入力なら missingness の skipped が立つ', () => {
    const rec = buildDailyRecord(args());
    expect(rec.missingness.skippedSleep).toBe(true);
    expect(rec.missingness.skippedMeal).toBe(true);
    expect(rec.missingness.skippedExercise).toBe(true);
    expect(rec.missingness.skippedCondition).toBe(true);
    expect(rec.missingness.skippedMedication).toBe(true);
  });

  it('mood は必須なので skippedMood は常に false', () => {
    expect(buildDailyRecord(args()).missingness.skippedMood).toBe(false);
  });

  it('primaryInfluence 未選択なら skippedPrimaryInfluence が立つ', () => {
    expect(
      buildDailyRecord(args({ primaryInfluence: [] })).missingness
        .skippedPrimaryInfluence,
    ).toBe(true);
    expect(
      buildDailyRecord(args({ primaryInfluence: ['sleep'] })).missingness
        .skippedPrimaryInfluence,
    ).toBe(false);
  });
});

describe('buildDailyRecord — 詳細セクション展開', () => {
  it('sleep: いずれかのキーがあれば sleep を組み立てる', () => {
    const rec = buildDailyRecord(
      args({
        selections: {
          'sleep.bedtime': '23:00',
          'sleep.wakeTime': '07:00',
          'sleep.nightAwakenings': 'once',
          'sleep.issues': ['bad_dreams', 'daytime_sleepiness'],
        },
      }),
    );
    expect(rec.sleep).toEqual({
      bedtime: '23:00',
      wakeTime: '07:00',
      nightAwakenings: 'once',
      sleepIssues: ['bad_dreams', 'daytime_sleepiness'],
    });
    expect(rec.missingness.skippedSleep).toBe(false);
  });

  it('sleep: 空配列の issues だけでは sleep を作らない', () => {
    const rec = buildDailyRecord(args({ selections: { 'sleep.issues': [] } }));
    expect(rec.sleep).toBeUndefined();
    expect(rec.missingness.skippedSleep).toBe(true);
  });

  it('meal: mealsTaken 配列を bool マップに変換する', () => {
    const rec = buildDailyRecord(
      args({
        selections: {
          'meal.mealsTaken': ['breakfast', 'dinner'],
          'meal.mealStatus': 'less',
        },
      }),
    );
    expect(rec.meal?.mealsTaken).toEqual({
      breakfast: true,
      lunch: false,
      dinner: true,
      snack: false,
      hydration: false,
    });
    expect(rec.meal?.mealStatus).toBe('less');
  });

  it('exercise / condition / medication を組み立てる', () => {
    const rec = buildDailyRecord(
      args({
        selections: {
          'exercise.activityFlags': ['walk', 'stretch'],
          'condition.conditionFlags': ['none'],
          'meds.medicationStatus': 'as_planned',
        },
      }),
    );
    expect(rec.exercise?.activityFlags).toEqual(['walk', 'stretch']);
    expect(rec.condition?.conditionFlags).toEqual(['none']);
    expect(rec.medication?.medicationStatus).toBe('as_planned');
  });
});

describe('buildDailyRecord — note と enabledCategory ゲート', () => {
  it('note: 内容があれば保持し skippedNote は false', () => {
    const rec = buildDailyRecord(args({ note: '朝、散歩できた' }));
    expect(rec.note).toBe('朝、散歩できた');
    expect(rec.missingness.skippedNote).toBe(false);
  });

  it('note: 空白のみは undefined にし skippedNote を立てる', () => {
    const rec = buildDailyRecord(args({ note: '   ' }));
    expect(rec.note).toBeUndefined();
    expect(rec.missingness.skippedNote).toBe(true);
  });

  it('無効カテゴリは未入力でも skipped を立てない', () => {
    // sleep だけ有効。meal/exercise などは無効
    const rec = buildDailyRecord(args({ enabledCategoryIds: ['sleep'] }));
    expect(rec.missingness.skippedSleep).toBe(true);
    expect(rec.missingness.skippedMeal).toBe(false);
    expect(rec.missingness.skippedExercise).toBe(false);
    expect(rec.missingness.skippedMedication).toBe(false);
  });
});

describe('buildDailyRecord — previous の引き継ぎ', () => {
  it('既存レコードがあれば createdAt と localRecordId を保持する', () => {
    const previous: StoredDailyRecord = {
      localRecordId: 'original-id',
      date: '2026-05-23',
      mood: 2,
      primaryInfluence: [],
      missingness: buildDailyRecord(args()).missingness,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    };
    const rec = buildDailyRecord(args({ mood: 5, previous }));
    expect(rec.localRecordId).toBe('original-id');
    expect(rec.createdAt).toBe('2026-05-01T00:00:00.000Z');
    expect(rec.mood).toBe(5);
    expect(rec.updatedAt).toBe(new Date(2026, 4, 23, 10, 30, 0).toISOString());
  });

  it('previous が無ければ createdAt は現在時刻', () => {
    const rec = buildDailyRecord(args());
    expect(rec.createdAt).toBe(new Date(2026, 4, 23, 10, 30, 0).toISOString());
  });
});

describe('buildDailyRecord — 修正保存時の note 温存 (M4)', () => {
  // 既存 note を持つ previous を用意
  const previousWithNote: StoredDailyRecord = {
    localRecordId: 'r_2026-05-22',
    date: '2026-05-22',
    mood: 3,
    primaryInfluence: [],
    note: '昨日の自由記述',
    missingness: {
      noRecord: false,
      skippedMood: false,
      skippedPrimaryInfluence: true,
      skippedSleep: true,
      skippedMeal: true,
      skippedExercise: true,
      skippedCondition: true,
      skippedMedication: true,
      skippedAttendance: false,
      skippedNote: false,
    },
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T00:00:00.000Z',
  };

  it('args.note が undefined (フォームから渡されない) なら previous.note を温存する', () => {
    const rec = buildDailyRecord(
      args({ date: '2026-05-22', note: undefined, previous: previousWithNote }),
    );
    expect(rec.note).toBe('昨日の自由記述');
    expect(rec.missingness.skippedNote).toBe(false);
  });

  it('args.note が空文字 (明示クリア) なら previous.note を削除する', () => {
    const rec = buildDailyRecord(
      args({ date: '2026-05-22', note: '', previous: previousWithNote }),
    );
    expect(rec.note).toBeUndefined();
    expect(rec.missingness.skippedNote).toBe(true);
  });

  it('args.note が空白のみ (明示クリア相当) なら previous.note を削除する', () => {
    const rec = buildDailyRecord(
      args({ date: '2026-05-22', note: '   ', previous: previousWithNote }),
    );
    expect(rec.note).toBeUndefined();
    expect(rec.missingness.skippedNote).toBe(true);
  });

  it('args.note に新しい値があれば上書きする', () => {
    const rec = buildDailyRecord(
      args({
        date: '2026-05-22',
        note: '新しい自由記述',
        previous: previousWithNote,
      }),
    );
    expect(rec.note).toBe('新しい自由記述');
    expect(rec.missingness.skippedNote).toBe(false);
  });

  it('previous が存在しない場合、args.note が undefined なら最終 note も undefined', () => {
    const rec = buildDailyRecord(args({ note: undefined }));
    expect(rec.note).toBeUndefined();
    expect(rec.missingness.skippedNote).toBe(true);
  });
});

describe('buildDailyRecord — targetDateType (schemaVersion 0.1.0)', () => {
  it('引数の targetDateType を保存する', () => {
    const today = buildDailyRecord(args({ targetDateType: 'today' }));
    expect(today.targetDateType).toBe('today');
    const yesterday = buildDailyRecord(args({ targetDateType: 'yesterday' }));
    expect(yesterday.targetDateType).toBe('yesterday');
  });

  it('引数が未指定なら previous の targetDateType を温存する', () => {
    const previous: StoredDailyRecord = {
      localRecordId: 'r_prev',
      date: '2026-05-22',
      mood: 3,
      primaryInfluence: [],
      missingness: buildDailyRecord(args()).missingness,
      createdAt: '2026-05-22T00:00:00.000Z',
      updatedAt: '2026-05-22T00:00:00.000Z',
      targetDateType: 'yesterday',
    };
    const rec = buildDailyRecord(args({ date: '2026-05-22', previous }));
    expect(rec.targetDateType).toBe('yesterday');
  });

  it('引数が previous を上書きする', () => {
    const previous: StoredDailyRecord = {
      localRecordId: 'r_prev',
      date: '2026-05-22',
      mood: 3,
      primaryInfluence: [],
      missingness: buildDailyRecord(args()).missingness,
      createdAt: '2026-05-22T00:00:00.000Z',
      updatedAt: '2026-05-22T00:00:00.000Z',
      targetDateType: 'yesterday',
    };
    const rec = buildDailyRecord(
      args({ date: '2026-05-22', previous, targetDateType: 'today' }),
    );
    expect(rec.targetDateType).toBe('today');
  });
});

describe('buildDailyRecord — OFF カテゴリの previous 温存 (T5 §8.5)', () => {
  // 仕様: じぶん画面で項目を OFF にしても、過去日に既にあるデータを消さない。
  // OFF カテゴリは UI で触れない → buildDailyRecord は previous の値を残す。

  const previous: StoredDailyRecord = {
    localRecordId: 'r_2026-05-22',
    date: '2026-05-22',
    mood: 4,
    primaryInfluence: ['sleep'],
    meal: {
      mealStatus: 'normal',
      mealsTaken: { breakfast: true, lunch: true, dinner: true },
      causes: [],
    },
    sleep: { bedtime: '23:00', wakeTime: '07:00' },
    exercise: { activityFlags: ['walk'] },
    condition: { conditionFlags: ['none'] },
    medication: { medicationStatus: 'as_planned' },
    missingness: {
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
    },
    createdAt: '2026-05-22T20:00:00.000Z',
    updatedAt: '2026-05-22T20:00:00.000Z',
  };

  it('meal を OFF にして保存しても、previous.meal が温存される', () => {
    const rec = buildDailyRecord(
      args({
        date: '2026-05-22',
        // meal は無効化されている
        enabledCategoryIds: ['sleep', 'exercise', 'condition', 'meds'],
        // UI では meal を触らない → selections に meal.* なし
        selections: {
          'sleep.bedtime': '22:30',
        },
        previous,
      }),
    );
    // OFF にした meal は previous の値が残っている
    expect(rec.meal).toBeDefined();
    expect(rec.meal?.mealStatus).toBe('normal');
    expect(rec.meal?.mealsTaken.breakfast).toBe(true);
    // sleep は今回入力で上書き済み (= previous.sleep の bedtime 23:00 ではない)
    expect(rec.sleep?.bedtime).toBe('22:30');
    // OFF にしたカテゴリは missingness を立てない
    expect(rec.missingness.skippedMeal).toBe(false);
  });

  it('全カテゴリ OFF で気分だけ保存しても、previous の詳細は全部残る', () => {
    const rec = buildDailyRecord(
      args({
        date: '2026-05-22',
        enabledCategoryIds: [],
        selections: {},
        previous,
      }),
    );
    expect(rec.sleep).toEqual(previous.sleep);
    expect(rec.meal).toEqual(previous.meal);
    expect(rec.exercise).toEqual(previous.exercise);
    expect(rec.condition).toEqual(previous.condition);
    expect(rec.medication).toEqual(previous.medication);
    // OFF カテゴリは missingness に skipped を立てない
    expect(rec.missingness.skippedMeal).toBe(false);
    expect(rec.missingness.skippedSleep).toBe(false);
  });

  it('ON のカテゴリは UI で触らなければ undefined (skipped) になる', () => {
    // previous があっても、ON のカテゴリは今回触らないなら明示的に skipped 扱い。
    const rec = buildDailyRecord(
      args({
        date: '2026-05-22',
        // sleep だけ ON。previous.sleep は存在するが、selections に sleep.* なし
        enabledCategoryIds: ['sleep'],
        selections: {},
        previous,
      }),
    );
    // ON で未入力 → undefined (previous で上書きしない)
    expect(rec.sleep).toBeUndefined();
    expect(rec.missingness.skippedSleep).toBe(true);
    // OFF の meal は previous 温存
    expect(rec.meal).toEqual(previous.meal);
  });
});
