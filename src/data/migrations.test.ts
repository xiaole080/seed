// migrations.ts のユニットテスト。
//
// 4 ケース最低限:
//   1. 初回起動 (何もない) → 0.1.0 がセットされる
//   2. 旧データありで version なし → 0.0.0 扱いから 0.1.0 へ移行、既存データが残る
//   3. 既に 0.1.0 → 何もしない
//   4. 未来の 9.9.9 → 落ちずに警告のみ
//
// targetDateType の補完については 0.1.0 マイグレで `date` がマイグレ実行日との
// 差で `today` / `yesterday` になることを確認する。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  SCHEMA_VERSION_KEY,
  getStoredSchemaVersion,
  runMigrations,
  setStoredSchemaVersion,
} from './migrations';

const DAILY_KEY = 'seed.daily.v1';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 23, 10, 0, 0)); // 2026-05-23
});

afterEach(() => {
  vi.useRealTimers();
});

describe('migrations — 初期状態', () => {
  it('schemaVersion が未設定なら getStoredSchemaVersion は "0.0.0"', () => {
    expect(getStoredSchemaVersion()).toBe('0.0.0');
  });

  it('setStoredSchemaVersion で保存できる', () => {
    setStoredSchemaVersion('0.1.0');
    expect(localStorage.getItem(SCHEMA_VERSION_KEY)).toBe('"0.1.0"');
    expect(getStoredSchemaVersion()).toBe('0.1.0');
  });
});

describe('migrations.runMigrations — 各バージョン', () => {
  it('初回起動 (何もなし) → 0.1.0 がセットされる', () => {
    runMigrations();
    expect(getStoredSchemaVersion()).toBe(CURRENT_SCHEMA_VERSION);
    expect(CURRENT_SCHEMA_VERSION).toBe('0.1.0');
  });

  it('旧データありで version なし → 0.1.0 へ移行し既存データが残る', () => {
    // 0.0.0 時代に書き込まれていた DailyRecord (targetDateType なし)
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        '2026-05-23': {
          localRecordId: 'r1',
          date: '2026-05-23',
          mood: 4,
          primaryInfluence: [],
          note: 'これは消えてはいけない',
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
          createdAt: '2026-05-23T00:00:00.000Z',
          updatedAt: '2026-05-23T00:00:00.000Z',
        },
        '2026-05-22': {
          localRecordId: 'r2',
          date: '2026-05-22',
          mood: 3,
          primaryInfluence: [],
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
            skippedNote: true,
          },
          createdAt: '2026-05-22T00:00:00.000Z',
          updatedAt: '2026-05-22T00:00:00.000Z',
        },
        '2026-05-10': {
          localRecordId: 'r3',
          date: '2026-05-10',
          mood: 2,
          primaryInfluence: [],
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
            skippedNote: true,
          },
          createdAt: '2026-05-10T00:00:00.000Z',
          updatedAt: '2026-05-10T00:00:00.000Z',
        },
      }),
    );

    runMigrations();

    expect(getStoredSchemaVersion()).toBe('0.1.0');
    const raw = JSON.parse(localStorage.getItem(DAILY_KEY) ?? '{}');
    // 既存データは残っている
    expect(raw['2026-05-23'].note).toBe('これは消えてはいけない');
    expect(raw['2026-05-23'].mood).toBe(4);
    // 今日との差で targetDateType が補完されている
    expect(raw['2026-05-23'].targetDateType).toBe('today');
    expect(raw['2026-05-22'].targetDateType).toBe('yesterday');
    // 2日以上前は未確定 → 補完しない (後方互換)
    expect(raw['2026-05-10'].targetDateType).toBeUndefined();
  });

  it('既に 0.1.0 → 何もしない (DailyRecord に手を加えない)', () => {
    setStoredSchemaVersion('0.1.0');
    // targetDateType が既に "today" でセットされている記録は、再実行で書き換えられない
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        '2026-05-23': {
          localRecordId: 'r1',
          date: '2026-05-23',
          mood: 4,
          primaryInfluence: [],
          targetDateType: 'today',
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
            skippedNote: true,
          },
          createdAt: '2026-05-23T00:00:00.000Z',
          updatedAt: '2026-05-23T00:00:00.000Z',
        },
      }),
    );
    const before = localStorage.getItem(DAILY_KEY);

    runMigrations();

    expect(getStoredSchemaVersion()).toBe('0.1.0');
    expect(localStorage.getItem(DAILY_KEY)).toBe(before);
  });

  it('未来の 9.9.9 → 落ちずに警告のみで終わる (version を勝手に書き換えない)', () => {
    setStoredSchemaVersion('9.9.9');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => runMigrations()).not.toThrow();

    // version はそのまま (ダウングレードしない)
    expect(getStoredSchemaVersion()).toBe('9.9.9');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
