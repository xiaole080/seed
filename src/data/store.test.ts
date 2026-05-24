import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  upsertDailyRecord,
  getDailyRecord,
  listDailyRecords,
  countRecordedDays,
  currentStreak,
  upsertAttendance,
  deleteAttendance,
  getAttendance,
  listAttendanceByMonth,
  setClosedDayActivity,
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

// T3-A: 日単位での打刻取り消し。打刻ミスや誤入力時の救済導線として、
// 「取り消す」ボタン (CheckInScreen) から呼ばれる。
describe('store — deleteAttendance (T3-A)', () => {
  it('対象日のレコードだけを消す', () => {
    upsertAttendance(att('2026-05-25', { checkIn: '09:30' }));
    upsertAttendance(att('2026-05-26', { checkIn: '09:30' }));
    deleteAttendance('2026-05-25');
    expect(getAttendance('2026-05-25')).toBeUndefined();
    expect(getAttendance('2026-05-26')).toBeDefined();
  });

  it('存在しない日付を渡しても例外を投げない (no-op)', () => {
    upsertAttendance(att('2026-05-25'));
    expect(() => deleteAttendance('2099-01-01')).not.toThrow();
    expect(getAttendance('2026-05-25')).toBeDefined();
  });

  it('他キー (daily / consent / careGoals / weather) は触らない', () => {
    upsertDailyRecord(daily('2026-05-25'));
    upsertAttendance(att('2026-05-25'));
    localStorage.setItem('seed.consent.v1', '{"appTermsAccepted":true}');
    localStorage.setItem(
      'seed.care.goals.v1',
      '{"smallGoals":[],"concernGoals":[]}',
    );
    localStorage.setItem('seed.weather.v1', '{"snapshot":null}');

    deleteAttendance('2026-05-25');

    // 通所だけ消える
    expect(getAttendance('2026-05-25')).toBeUndefined();
    // 他キーは生き残る
    expect(getDailyRecord('2026-05-25')).toBeDefined();
    expect(localStorage.getItem('seed.consent.v1')).toBe(
      '{"appTermsAccepted":true}',
    );
    expect(localStorage.getItem('seed.care.goals.v1')).toBe(
      '{"smallGoals":[],"concernGoals":[]}',
    );
    expect(localStorage.getItem('seed.weather.v1')).toBe('{"snapshot":null}');
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

// Sprint 2026-05-24 / 案 X: 事務所休業日の「軽い記録」。
// localStorage 完結 (seed.daily.v1 の closedDayActivity フィールド) で、
// Sheets / CSV エクスポートには載せない設計。
describe('store — setClosedDayActivity (案 X)', () => {
  it('既存 DailyRecord が無い日に呼ぶと最小レコードを新規作成する', () => {
    setClosedDayActivity('2026-05-30', 'home_rest');
    const rec = getDailyRecord('2026-05-30');
    expect(rec).toBeDefined();
    expect(rec?.closedDayActivity).toBe('home_rest');
    expect(rec?.date).toBe('2026-05-30');
    // 新規作成時の missingness は「気分も未入力」として skippedMood=true
    expect(rec?.missingness.skippedMood).toBe(true);
  });

  it('既存 DailyRecord がある日は closedDayActivity だけを additive に追加する', () => {
    // まず通常の気分記録を作る
    upsertDailyRecord({
      ...({
        localRecordId: 'r_2026-05-30',
        date: '2026-05-30',
        mood: 4,
        primaryInfluence: ['sleep'],
        note: '朝はだるかった',
        missingness: { ...NO_MISSING, skippedMood: false },
        createdAt: '2026-05-30T08:00:00.000Z',
        updatedAt: '2026-05-30T08:00:00.000Z',
      } as StoredDailyRecord),
    });
    setClosedDayActivity('2026-05-30', 'medical');
    const rec = getDailyRecord('2026-05-30');
    expect(rec?.mood).toBe(4);
    expect(rec?.primaryInfluence).toEqual(['sleep']);
    expect(rec?.note).toBe('朝はだるかった');
    expect(rec?.closedDayActivity).toBe('medical');
  });

  it('同じ日に再度呼ぶと closedDayActivity が上書きされる (1 日 1 つの運用)', () => {
    setClosedDayActivity('2026-05-30', 'home_rest');
    setClosedDayActivity('2026-05-30', 'outing');
    expect(getDailyRecord('2026-05-30')?.closedDayActivity).toBe('outing');
  });

  it('別キー (attendance / consent / careGoals) は触らない (localStorage 完結)', () => {
    upsertAttendance(att('2026-05-25', { checkIn: '09:30' }));
    localStorage.setItem('seed.consent.v1', '{"appTermsAccepted":true}');
    localStorage.setItem(
      'seed.care.goals.v1',
      '{"smallGoals":[],"concernGoals":[]}',
    );

    setClosedDayActivity('2026-05-30', 'medical');

    expect(getAttendance('2026-05-25')?.checkIn).toBe('09:30');
    expect(localStorage.getItem('seed.consent.v1')).toBe(
      '{"appTermsAccepted":true}',
    );
    expect(localStorage.getItem('seed.care.goals.v1')).toBe(
      '{"smallGoals":[],"concernGoals":[]}',
    );
  });

  it('localStorage に保存された JSON から closedDayActivity が直接読める', () => {
    setClosedDayActivity('2026-05-30', 'outing');
    const raw = JSON.parse(localStorage.getItem('seed.daily.v1') ?? '{}');
    expect(raw['2026-05-30'].closedDayActivity).toBe('outing');
  });

  // T-C1: localStorage に書き込まれた中身を直接読んで確認する手順を
  // テストとして残す (FE 手動確認時の参照用)。
  it('不正な値は normalizeStored で undefined に正規化される (型ガード)', () => {
    localStorage.setItem(
      'seed.daily.v1',
      JSON.stringify({
        '2026-05-30': {
          localRecordId: 'r',
          date: '2026-05-30',
          mood: 3,
          primaryInfluence: [],
          missingness: NO_MISSING,
          createdAt: '2026-05-30T00:00:00.000Z',
          updatedAt: '2026-05-30T00:00:00.000Z',
          closedDayActivity: 'home_party', // 不正値
        },
      }),
    );
    expect(getDailyRecord('2026-05-30')?.closedDayActivity).toBeUndefined();
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

  it('deleteAllLocalData は routines / routine.logs / oneoff / notice も消す (0.3.0)', () => {
    localStorage.setItem('seed.routines.v1', '[]');
    localStorage.setItem('seed.routine.logs.v1', '{}');
    localStorage.setItem('seed.tasks.oneoff.v1', '[]');
    localStorage.setItem('seed.notice.routines.dismissed.v1', 'true');

    deleteAllLocalData();

    expect(localStorage.getItem('seed.routines.v1')).toBeNull();
    expect(localStorage.getItem('seed.routine.logs.v1')).toBeNull();
    expect(localStorage.getItem('seed.tasks.oneoff.v1')).toBeNull();
    expect(localStorage.getItem('seed.notice.routines.dismissed.v1')).toBeNull();
  });

  it('deleteAllLocalData は closedDayActivity も seed.daily.v1 ごと消す (privacy 軽微 #1)', () => {
    // 案 X の軽い記録を保存 → 全データ削除 → undefined を確認
    setClosedDayActivity('2026-05-30', 'medical');
    expect(getDailyRecord('2026-05-30')?.closedDayActivity).toBe('medical');

    deleteAllLocalData();

    expect(getDailyRecord('2026-05-30')?.closedDayActivity).toBeUndefined();
    expect(localStorage.getItem('seed.daily.v1')).toBeNull();
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
