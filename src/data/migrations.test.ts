// migrations.ts のユニットテスト。
//
// 旧スプリント: 0.0.0 → 0.1.0 で targetDateType を補完する。
// 今スプリント (2026-05-24): 0.1.0 → 0.2.0 で
//   - ConsentState.weatherApiConsent を 'notAsked' で補い
//   - consentVersion を 'v1.1' に書き換える (再同意画面は出さない静かな移行)。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  SCHEMA_VERSION_KEY,
  getStoredSchemaVersion,
  runMigrations,
  setStoredSchemaVersion,
} from './migrations';
import type { ConsentState } from './types';

const DAILY_KEY = 'seed.daily.v1';
const CONSENT_KEY = 'seed.consent.v1';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 24, 10, 0, 0)); // 2026-05-24
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
  it('CURRENT_SCHEMA_VERSION は 0.3.0', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe('0.3.0');
  });

  it('初回起動 (何もなし) → 0.3.0 がセットされる', () => {
    runMigrations();
    expect(getStoredSchemaVersion()).toBe('0.3.0');
  });

  it('0.0.0 → 0.3.0 通過: 既存 daily の targetDateType が補完される', () => {
    const d = new Date(2026, 4, 24); // 2026-05-24
    const todayStr = '2026-05-24';
    const yesterdayStr = '2026-05-23';
    void d;
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        [todayStr]: {
          localRecordId: 'r1',
          date: todayStr,
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
          createdAt: '2026-05-24T00:00:00.000Z',
          updatedAt: '2026-05-24T00:00:00.000Z',
        },
        [yesterdayStr]: {
          localRecordId: 'r2',
          date: yesterdayStr,
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
          createdAt: '2026-05-23T00:00:00.000Z',
          updatedAt: '2026-05-23T00:00:00.000Z',
        },
      }),
    );

    runMigrations();

    expect(getStoredSchemaVersion()).toBe('0.3.0');
    const raw = JSON.parse(localStorage.getItem(DAILY_KEY) ?? '{}');
    expect(raw[todayStr].note).toBe('これは消えてはいけない');
    expect(raw[todayStr].targetDateType).toBe('today');
    expect(raw[yesterdayStr].targetDateType).toBe('yesterday');
  });

  it('0.1.0 → 0.3.0: 既存 consent に weatherApiConsent="notAsked" が補われ、consentVersion=v1.1 になる', () => {
    setStoredSchemaVersion('0.1.0');
    const oldConsent = {
      appTermsAccepted: true,
      attendanceBackupConsent: 'accepted',
      attendanceExportConsent: 'accepted',
      researchConsent: 'notAsked',
      consentVersion: 'v1.0',
      consentedAt: '2026-05-23T00:00:00.000Z',
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(oldConsent));

    runMigrations();

    expect(getStoredSchemaVersion()).toBe('0.3.0');
    const next = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? '{}') as ConsentState;
    expect(next.weatherApiConsent).toBe('notAsked');
    expect(next.consentVersion).toBe('v1.1');
    // 既存値は維持
    expect(next.attendanceBackupConsent).toBe('accepted');
    expect(next.appTermsAccepted).toBe(true);
    expect(next.consentedAt).toBe('2026-05-23T00:00:00.000Z');
  });

  it('既に 0.3.0 → 何もしない (DailyRecord / Consent に手を加えない)', () => {
    setStoredSchemaVersion('0.3.0');
    const dailyBefore = JSON.stringify({
      '2026-05-24': {
        localRecordId: 'r1',
        date: '2026-05-24',
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
        createdAt: '2026-05-24T00:00:00.000Z',
        updatedAt: '2026-05-24T00:00:00.000Z',
      },
    });
    const consentBefore = JSON.stringify({
      appTermsAccepted: true,
      attendanceBackupConsent: 'accepted',
      attendanceExportConsent: 'accepted',
      researchConsent: 'notAsked',
      weatherApiConsent: 'accepted',
      consentVersion: 'v1.1',
    });
    localStorage.setItem(DAILY_KEY, dailyBefore);
    localStorage.setItem(CONSENT_KEY, consentBefore);

    runMigrations();

    expect(getStoredSchemaVersion()).toBe('0.3.0');
    expect(localStorage.getItem(DAILY_KEY)).toBe(dailyBefore);
    expect(localStorage.getItem(CONSENT_KEY)).toBe(consentBefore);
  });

  // T3: 0.2.0 → 0.3.0 smallGoals → OneOffTask 移行
  it('0.2.0 → 0.3.0: 旧 smallGoals が OneOffTask[] に正規化移行される', () => {
    setStoredSchemaVersion('0.2.0');
    localStorage.setItem(
      'seed.care.goals.v1',
      JSON.stringify({
        smallGoals: [
          {
            id: 'sg_1',
            date: '2026-05-23',
            text: '朝、窓を開ける',
            done: true,
            createdAt: '2026-05-23T00:00:00.000Z',
          },
          {
            id: 'sg_2',
            date: '2026-05-24',
            text: '5分ストレッチ',
            done: false,
            createdAt: '2026-05-24T00:00:00.000Z',
          },
        ],
        concernGoals: [
          { id: 'cg_1', text: '本屋に行く', createdAt: '2026-05-22T00:00:00.000Z' },
        ],
      }),
    );

    runMigrations();

    expect(getStoredSchemaVersion()).toBe('0.3.0');

    // smallGoals は空配列で上書きされる
    const care = JSON.parse(
      localStorage.getItem('seed.care.goals.v1') ?? '{}',
    );
    expect(care.smallGoals).toEqual([]);
    // concernGoals は保持される
    expect(care.concernGoals).toHaveLength(1);
    expect(care.concernGoals[0].text).toBe('本屋に行く');

    // OneOffTask[] に移行される
    const oneoff = JSON.parse(
      localStorage.getItem('seed.tasks.oneoff.v1') ?? '[]',
    );
    expect(oneoff).toHaveLength(2);
    expect(oneoff[0].id).toBe('sg_1');
    expect(oneoff[0].text).toBe('朝、窓を開ける');
    expect(oneoff[0].date).toBe('2026-05-23');
    expect(oneoff[0].done).toBe(true);
    expect(oneoff[1].id).toBe('sg_2');
    expect(oneoff[1].done).toBe(false);
  });

  it('0.2.0 → 0.3.0: 壊れた smallGoals 要素はスキップして起動を止めない', () => {
    setStoredSchemaVersion('0.2.0');
    localStorage.setItem(
      'seed.care.goals.v1',
      JSON.stringify({
        smallGoals: [
          // id が無い
          { date: '2026-05-23', text: '朝' },
          // text が無い
          { id: 'sg_x', date: '2026-05-23' },
          // 正常
          {
            id: 'sg_ok',
            date: '2026-05-23',
            text: 'OK',
            createdAt: '2026-05-23T00:00:00.000Z',
          },
          // null は無視
          null,
        ],
        concernGoals: [],
      }),
    );

    expect(() => runMigrations()).not.toThrow();
    expect(getStoredSchemaVersion()).toBe('0.3.0');
    const oneoff = JSON.parse(
      localStorage.getItem('seed.tasks.oneoff.v1') ?? '[]',
    );
    expect(oneoff).toHaveLength(1);
    expect(oneoff[0].id).toBe('sg_ok');
  });

  it('0.2.0 → 0.3.0: smallGoals が無くても起動は止まらない (concern のみ保持)', () => {
    setStoredSchemaVersion('0.2.0');
    localStorage.setItem(
      'seed.care.goals.v1',
      JSON.stringify({
        smallGoals: [],
        concernGoals: [
          { id: 'cg_1', text: '気になること', createdAt: '2026-05-22T00:00:00.000Z' },
        ],
      }),
    );

    runMigrations();

    expect(getStoredSchemaVersion()).toBe('0.3.0');
    // 既存 oneoff キーは作らない (smallGoals が空 → 何も移行しない)
    expect(localStorage.getItem('seed.tasks.oneoff.v1')).toBeNull();
    const care = JSON.parse(
      localStorage.getItem('seed.care.goals.v1') ?? '{}',
    );
    expect(care.concernGoals).toHaveLength(1);
  });

  it('未来の 9.9.9 → 落ちずに警告のみで終わる (version を勝手に書き換えない)', () => {
    setStoredSchemaVersion('9.9.9');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => runMigrations()).not.toThrow();

    expect(getStoredSchemaVersion()).toBe('9.9.9');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
