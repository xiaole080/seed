import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  upsertDailyRecord,
  getDailyRecord,
  listDailyRecords,
  countRecordedDays,
  currentStreak,
  upsertAttendance,
  getAttendance,
  listAttendanceByMonth,
  todayISO,
  nowISO,
  nowHHmm,
  thisMonth,
  weekdayEnFor,
  scheduleSlotFor,
  deleteAllLocalData,
  _resetDaily,
  _resetAttendance,
  type StoredDailyRecord,
} from './store';
import { DEFAULT_SCHEDULE } from './attendance';
import type { AttendanceMonthlyRecord, MissingnessFlags, Mood } from './types';

const NO_MISSING: MissingnessFlags = {
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

function daily(date: string, mood: Mood = 3): StoredDailyRecord {
  return {
    localRecordId: `r_${date}`,
    date,
    mood,
    primaryInfluence: [],
    missingness: { ...NO_MISSING },
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  };
}

function att(
  date: string,
  over: Partial<AttendanceMonthlyRecord> = {},
): AttendanceMonthlyRecord {
  return {
    localAttendanceId: `att_${date}`,
    date,
    weekday: 'Mon',
    plannedMode: 'office',
    missingClock: false,
    edited: false,
    exportMonth: date.slice(0, 7),
    ...over,
  };
}

/** 固定システム日時 (2026-05-23 土曜 10:30) を基準にした相対 ISO 日付 */
function iso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 23, 10, 30, 0));
  _resetDaily();
  _resetAttendance();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('store — DailyRecord CRUD', () => {
  it('upsert した記録を date キーで取得できる', () => {
    upsertDailyRecord(daily('2026-05-20', 4));
    const got = getDailyRecord('2026-05-20');
    expect(got?.mood).toBe(4);
    expect(got?.date).toBe('2026-05-20');
  });

  it('未保存日の取得は undefined', () => {
    expect(getDailyRecord('2099-01-01')).toBeUndefined();
  });

  it('upsert は updatedAt を現在時刻で更新する', () => {
    upsertDailyRecord(daily('2026-05-20'));
    expect(getDailyRecord('2026-05-20')?.updatedAt).toBe(
      new Date(2026, 4, 23, 10, 30, 0).toISOString(),
    );
  });

  it('同じ日付の upsert は上書きする (重複行を作らない)', () => {
    upsertDailyRecord(daily('2026-05-20', 2));
    upsertDailyRecord(daily('2026-05-20', 5));
    expect(countRecordedDays()).toBe(1);
    expect(getDailyRecord('2026-05-20')?.mood).toBe(5);
  });

  it('listDailyRecords は日付昇順で返す', () => {
    upsertDailyRecord(daily('2026-05-22'));
    upsertDailyRecord(daily('2026-05-20'));
    upsertDailyRecord(daily('2026-05-21'));
    expect(listDailyRecords().map((r) => r.date)).toEqual([
      '2026-05-20',
      '2026-05-21',
      '2026-05-22',
    ]);
  });
});

describe('store — countRecordedDays / currentStreak', () => {
  it('記録ゼロなら 0', () => {
    expect(countRecordedDays()).toBe(0);
    expect(currentStreak()).toBe(0);
  });

  it('ユニークな記録日数を数える', () => {
    upsertDailyRecord(daily('2026-05-20'));
    upsertDailyRecord(daily('2026-05-21'));
    upsertDailyRecord(daily('2026-05-21')); // 重複
    expect(countRecordedDays()).toBe(2);
  });

  it('今日まで連続していれば日数を返す', () => {
    upsertDailyRecord(daily(iso(0)));
    upsertDailyRecord(daily(iso(-1)));
    upsertDailyRecord(daily(iso(-2)));
    expect(currentStreak()).toBe(3);
  });

  it('今日未記録でも昨日まで連続していれば 0 にしない', () => {
    upsertDailyRecord(daily(iso(-1)));
    upsertDailyRecord(daily(iso(-2)));
    expect(currentStreak()).toBe(2);
  });

  it('途中で抜けたらそこで連続が切れる', () => {
    upsertDailyRecord(daily(iso(0)));
    // iso(-1) は欠落
    upsertDailyRecord(daily(iso(-2)));
    expect(currentStreak()).toBe(1);
  });

  it('今日も昨日も無ければ 0', () => {
    upsertDailyRecord(daily(iso(-3)));
    expect(currentStreak()).toBe(0);
  });
});

describe('store — Attendance CRUD', () => {
  it('upsert / get できる', () => {
    upsertAttendance(att('2026-05-25', { checkIn: '10:00' }));
    expect(getAttendance('2026-05-25')?.checkIn).toBe('10:00');
  });

  it('listAttendanceByMonth は指定月だけを昇順で返す', () => {
    upsertAttendance(att('2026-05-25'));
    upsertAttendance(att('2026-05-10'));
    upsertAttendance(att('2026-06-01'));
    const may = listAttendanceByMonth('2026-05');
    expect(may.map((r) => r.date)).toEqual(['2026-05-10', '2026-05-25']);
  });

  it('DailyRecord と Attendance は別ストアに分離されている', () => {
    upsertDailyRecord(daily('2026-05-25'));
    upsertAttendance(att('2026-05-25'));
    _resetDaily();
    // daily を消しても attendance は残る
    expect(getDailyRecord('2026-05-25')).toBeUndefined();
    expect(getAttendance('2026-05-25')).toBeDefined();
  });
});

describe('store — 日付 / 曜日ヘルパ', () => {
  it('todayISO は YYYY-MM-DD', () => {
    expect(todayISO()).toBe('2026-05-23');
  });

  it('nowISO は ISO 8601 文字列', () => {
    expect(nowISO()).toBe(new Date(2026, 4, 23, 10, 30, 0).toISOString());
  });

  it('nowHHmm は HH:mm (ゼロ詰め)', () => {
    expect(nowHHmm()).toBe('10:30');
  });

  it('thisMonth は year と 0 始まり月を返す', () => {
    expect(thisMonth()).toEqual({ year: 2026, monthIndex0: 4 });
  });

  it('weekdayEnFor は曜日略称を返す', () => {
    expect(weekdayEnFor('2026-05-23')).toBe('Sat');
    expect(weekdayEnFor('2026-05-25')).toBe('Mon');
  });

  it('scheduleSlotFor は月曜始まりで schedule を引く', () => {
    // 2026-05-25 は月曜 → DEFAULT_SCHEDULE[0] = office/full
    expect(scheduleSlotFor('2026-05-25', DEFAULT_SCHEDULE)).toEqual({
      mode: 'office',
      band: 'full',
    });
    // 2026-05-23 は土曜 → DEFAULT_SCHEDULE[5] = off
    expect(scheduleSlotFor('2026-05-23', DEFAULT_SCHEDULE)?.mode).toBe('off');
  });
});

describe('store — 全データ削除 (A6)', () => {
  it('deleteAllLocalData は Seed の既知キーをすべて消す', () => {
    upsertDailyRecord(daily('2026-05-20'));
    upsertAttendance(att('2026-05-20'));
    localStorage.setItem('seed.app.state.v1', '{}');
    localStorage.setItem('seed.consent.v1', '{}');
    localStorage.setItem('seed.outbox.v1', '[]');
    localStorage.setItem('seed.care.goals.v1', '{"smallGoals":[],"concernGoals":[]}');
    // L1: seed.egg は鳥の名前など自由入力を含む可能性があるため削除対象
    localStorage.setItem('seed.egg', '{"name":"はる"}');

    deleteAllLocalData();

    expect(countRecordedDays()).toBe(0);
    expect(getAttendance('2026-05-20')).toBeUndefined();
    expect(localStorage.getItem('seed.app.state.v1')).toBeNull();
    expect(localStorage.getItem('seed.consent.v1')).toBeNull();
    expect(localStorage.getItem('seed.outbox.v1')).toBeNull();
    expect(localStorage.getItem('seed.care.goals.v1')).toBeNull();
    expect(localStorage.getItem('seed.egg')).toBeNull();
  });
});

describe('store — 旧 DailyRecord 形式の互換読み込み (T1)', () => {
  it('moodScore / primaryInfluences / details / notes.privateNote を読み替える', () => {
    // 旧形式を直接 localStorage に書く
    localStorage.setItem(
      'seed.daily.v1',
      JSON.stringify({
        '2026-05-22': {
          // 旧形式: mood ではなく moodScore
          moodScore: 4,
          primaryInfluences: ['sleep', 'fatigue'],
          details: {
            sleep: { bedtime: '23:00', sleepIssues: ['bad_dreams'] },
            meal: { mealStatus: 'less', mealsTaken: { breakfast: true } },
          },
          notes: { privateNote: '昨日のメモ' },
          createdAt: '2026-05-22T00:00:00.000Z',
          updatedAt: '2026-05-22T01:00:00.000Z',
        },
      }),
    );

    const got = getDailyRecord('2026-05-22');
    expect(got).toBeDefined();
    expect(got?.mood).toBe(4);
    expect(got?.primaryInfluence).toEqual(['sleep', 'fatigue']);
    expect(got?.sleep?.bedtime).toBe('23:00');
    expect(got?.meal?.mealStatus).toBe('less');
    expect(got?.note).toBe('昨日のメモ');
  });

  it('新形式 + 旧形式が混在しても両方読める', () => {
    upsertDailyRecord(daily('2026-05-20', 3));
    // 既存に旧形式を直接追加
    const raw = JSON.parse(localStorage.getItem('seed.daily.v1') ?? '{}');
    raw['2026-05-19'] = { moodScore: 5, primaryInfluences: [] };
    localStorage.setItem('seed.daily.v1', JSON.stringify(raw));

    const list = listDailyRecords();
    expect(list).toHaveLength(2);
    const may19 = list.find((r) => r.date === '2026-05-19');
    expect(may19?.mood).toBe(5);
  });

  it('新規保存後も別日付の旧データは消えない', () => {
    localStorage.setItem(
      'seed.daily.v1',
      JSON.stringify({
        '2026-05-15': { moodScore: 2, primaryInfluences: [] },
      }),
    );
    upsertDailyRecord(daily('2026-05-23', 5));
    expect(getDailyRecord('2026-05-15')?.mood).toBe(2);
    expect(getDailyRecord('2026-05-23')?.mood).toBe(5);
  });

  // P-6 対応: normalizeStored は targetDateType を型ガードする。
  it('targetDateType が想定外の値なら undefined に正規化する', () => {
    localStorage.setItem(
      'seed.daily.v1',
      JSON.stringify({
        '2026-05-20': {
          moodScore: 3,
          primaryInfluences: [],
          targetDateType: 'tomorrow', // 不正値
        },
        '2026-05-21': {
          moodScore: 3,
          primaryInfluences: [],
          targetDateType: 'today',
        },
        '2026-05-22': {
          moodScore: 3,
          primaryInfluences: [],
          targetDateType: 'yesterday',
        },
      }),
    );
    expect(getDailyRecord('2026-05-20')?.targetDateType).toBeUndefined();
    expect(getDailyRecord('2026-05-21')?.targetDateType).toBe('today');
    expect(getDailyRecord('2026-05-22')?.targetDateType).toBe('yesterday');
  });
});
