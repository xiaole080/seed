// routineStreak.ts のユニットテスト。
//
// アルゴリズム確認:
//  - done のみカウント、rest はスキップ (連続維持)
//  - 対象日外スキップ
//  - paused なら 0
//  - 今日のログ無しは許容、昨日以降のログ無しは break

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeRoutineStreak } from './routineStreak';
import {
  addRoutine,
  setRoutineLog,
  updateRoutine,
  loadRoutineLogs,
} from './routines';
import { DEFAULT_SCHEDULE } from './attendance';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 25, 10, 0, 0)); // 2026-05-25 月曜
});

afterEach(() => {
  vi.useRealTimers();
});

describe('computeRoutineStreak — 基本', () => {
  it('ログ無しなら 0', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    expect(computeRoutineStreak(r, null, DEFAULT_SCHEDULE, '2026-05-25')).toBe(0);
  });

  it('今日 done なら 1', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-25', 'done');
    expect(computeRoutineStreak(r, null, DEFAULT_SCHEDULE, '2026-05-25')).toBe(1);
  });

  it('連続 done なら累積する', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-25', 'done');
    setRoutineLog(r.id, '2026-05-24', 'done');
    setRoutineLog(r.id, '2026-05-23', 'done');
    expect(computeRoutineStreak(r, null, DEFAULT_SCHEDULE, '2026-05-25')).toBe(3);
  });
});

describe('computeRoutineStreak — rest スキップ', () => {
  it('rest は連続を途切れさせない (カウントしない)', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-25', 'done');
    setRoutineLog(r.id, '2026-05-24', 'rest');
    setRoutineLog(r.id, '2026-05-23', 'done');
    setRoutineLog(r.id, '2026-05-22', 'done');
    expect(computeRoutineStreak(r, null, DEFAULT_SCHEDULE, '2026-05-25')).toBe(3);
  });

  it('rest だけが連続しても streak は 0 (done なし)', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-25', 'rest');
    setRoutineLog(r.id, '2026-05-24', 'rest');
    expect(computeRoutineStreak(r, null, DEFAULT_SCHEDULE, '2026-05-25')).toBe(0);
  });
});

describe('computeRoutineStreak — 今日のログ無し許容', () => {
  it('今日まだ操作してなくても、昨日まで done なら streak は続く', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-24', 'done');
    setRoutineLog(r.id, '2026-05-23', 'done');
    // 今日 (2026-05-25) はログ無し
    expect(computeRoutineStreak(r, null, DEFAULT_SCHEDULE, '2026-05-25')).toBe(2);
  });

  it('昨日にログが無ければ (対象日のはずなのに) そこで break', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    // 今日: 無し (許容), 昨日: 無し → break
    setRoutineLog(r.id, '2026-05-23', 'done');
    expect(computeRoutineStreak(r, null, DEFAULT_SCHEDULE, '2026-05-25')).toBe(0);
  });
});

describe('computeRoutineStreak — 対象日外スキップ', () => {
  it('weekdays 月水金: 火曜が対象外でも金→水→月 と連続できる', () => {
    // 月=0,水=2,金=4
    const r = addRoutine({
      text: 'A',
      frequency: 'weekdays',
      weekdays: [0, 2, 4],
    })!;
    // 今日: 2026-05-25 月曜 = 対象
    setRoutineLog(r.id, '2026-05-25', 'done');
    // 2026-05-22 金曜 = 対象 done
    setRoutineLog(r.id, '2026-05-22', 'done');
    // 2026-05-20 水曜 = 対象 done
    setRoutineLog(r.id, '2026-05-20', 'done');
    // 火/木は対象外 → スキップ
    expect(computeRoutineStreak(r, null, DEFAULT_SCHEDULE, '2026-05-25')).toBe(3);
  });

  it('対象日のはずの過去日が done でなければ break する', () => {
    const r = addRoutine({
      text: 'A',
      frequency: 'weekdays',
      weekdays: [0, 2, 4],
    })!;
    setRoutineLog(r.id, '2026-05-25', 'done'); // 月
    // 2026-05-22 金 = 対象だが done なし → break
    setRoutineLog(r.id, '2026-05-20', 'done'); // 水
    expect(computeRoutineStreak(r, null, DEFAULT_SCHEDULE, '2026-05-25')).toBe(1);
  });

  it('attendance: schedule の off の日はスキップ (= 連続維持)', () => {
    const r = addRoutine({ text: 'A', frequency: 'attendance' })!;
    // 2026-05-25 月曜 office → 対象
    setRoutineLog(r.id, '2026-05-25', 'done');
    // 2026-05-24 日曜 off → スキップ
    // 2026-05-23 土曜 off → スキップ
    // 2026-05-22 金曜 office → 対象
    setRoutineLog(r.id, '2026-05-22', 'done');
    expect(computeRoutineStreak(r, null, DEFAULT_SCHEDULE, '2026-05-25')).toBe(2);
  });
});

describe('computeRoutineStreak — paused', () => {
  it('paused: true なら streak は 0 (ログがあっても)', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-25', 'done');
    setRoutineLog(r.id, '2026-05-24', 'done');
    updateRoutine(r.id, { paused: true });
    const updated = { ...r, paused: true };
    expect(
      computeRoutineStreak(updated, null, DEFAULT_SCHEDULE, '2026-05-25'),
    ).toBe(0);
  });
});

describe('computeRoutineStreak — logs を引数で渡す', () => {
  it('logs を null 以外で渡すと localStorage を読まずに使う', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    // localStorage には記録なし
    const logs = loadRoutineLogs();
    logs[r.id] = { '2026-05-25': 'done' };
    expect(computeRoutineStreak(r, logs, DEFAULT_SCHEDULE, '2026-05-25')).toBe(1);
  });
});
