// routines.ts のユニットテスト (CareScreen 3 層構造リデザイン)。
//
// 保存先キー / 空入力ガード / 削除時の RoutineLog 連動削除 / 対象日判定を確認する。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addOneOffTask,
  addRoutine,
  clearRoutineLog,
  deleteOneOffTask,
  deleteRoutine,
  getOneOffTasksForDate,
  isRoutineActiveOn,
  loadOneOffTasks,
  loadRoutineLogs,
  loadRoutines,
  setRoutineLog,
  updateOneOffTask,
  updateRoutine,
} from './routines';
import {
  ROUTINES_KEY,
  ROUTINE_LOGS_KEY,
  ONEOFF_TASKS_KEY,
} from './store';
import { DEFAULT_SCHEDULE } from './attendance';
import type { Schedule } from './types';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 25, 10, 0, 0)); // 2026-05-25 月曜
});

afterEach(() => {
  vi.useRealTimers();
});

describe('routines — Routine CRUD', () => {
  it('addRoutine は空文字を null で返す', () => {
    expect(addRoutine({ text: '', frequency: 'daily' })).toBeNull();
    expect(addRoutine({ text: '   ', frequency: 'daily' })).toBeNull();
  });

  it('addRoutine で daily を作成すると localStorage に保存される', () => {
    const r = addRoutine({ text: '朝、窓を開ける', frequency: 'daily' });
    expect(r).not.toBeNull();
    expect(r?.text).toBe('朝、窓を開ける');
    expect(r?.frequency).toBe('daily');
    expect(r?.paused).toBe(false);
    expect(loadRoutines()).toHaveLength(1);
    expect(localStorage.getItem(ROUTINES_KEY)).not.toBeNull();
  });

  it('weekdays 指定だと weekdays フィールドが保持される', () => {
    const r = addRoutine({
      text: '月水金にストレッチ',
      frequency: 'weekdays',
      weekdays: [0, 2, 4], // 月水金 (月=0)
    });
    expect(r?.weekdays).toEqual([0, 2, 4]);
  });

  it('updateRoutine は patch を適用し updatedAt を更新する', () => {
    const r = addRoutine({ text: '原案', frequency: 'daily' })!;
    updateRoutine(r.id, { text: '改訂', paused: true });
    const got = loadRoutines()[0];
    expect(got.text).toBe('改訂');
    expect(got.paused).toBe(true);
    expect(got.updatedAt).toBeDefined();
  });

  it('deleteRoutine は対象だけ消し、RoutineLog も一緒に消す', () => {
    const a = addRoutine({ text: 'A', frequency: 'daily' })!;
    const b = addRoutine({ text: 'B', frequency: 'daily' })!;
    setRoutineLog(a.id, '2026-05-25', 'done');
    setRoutineLog(b.id, '2026-05-25', 'done');

    deleteRoutine(a.id);

    expect(loadRoutines().map((r) => r.id)).toEqual([b.id]);
    const logs = loadRoutineLogs();
    expect(logs[a.id]).toBeUndefined();
    expect(logs[b.id]?.['2026-05-25']).toBe('done');
  });
});

describe('routines — RoutineLog API', () => {
  it('setRoutineLog で done / rest を切り替えられる', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-25', 'done');
    expect(loadRoutineLogs()[r.id]?.['2026-05-25']).toBe('done');
    setRoutineLog(r.id, '2026-05-25', 'rest');
    expect(loadRoutineLogs()[r.id]?.['2026-05-25']).toBe('rest');
  });

  it('clearRoutineLog で当日エントリを消せる', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-25', 'done');
    clearRoutineLog(r.id, '2026-05-25');
    expect(loadRoutineLogs()[r.id]?.['2026-05-25']).toBeUndefined();
  });

  it('別キー (ROUTINE_LOGS_KEY) に保存されている', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-25', 'done');
    expect(localStorage.getItem(ROUTINE_LOGS_KEY)).not.toBeNull();
  });
});

describe('routines — isRoutineActiveOn', () => {
  const schedule: Schedule = DEFAULT_SCHEDULE;

  it('daily は常に true', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    expect(isRoutineActiveOn(r, '2026-05-25', schedule)).toBe(true);
    expect(isRoutineActiveOn(r, '2026-05-23', schedule)).toBe(true); // 土曜
  });

  it('weekdays は月曜=0..日曜=6 で判定 (規約統一)', () => {
    // 月水金 (0,2,4)
    const r = addRoutine({
      text: 'A',
      frequency: 'weekdays',
      weekdays: [0, 2, 4],
    })!;
    expect(isRoutineActiveOn(r, '2026-05-25', schedule)).toBe(true); // 月曜
    expect(isRoutineActiveOn(r, '2026-05-26', schedule)).toBe(false); // 火曜
    expect(isRoutineActiveOn(r, '2026-05-27', schedule)).toBe(true); // 水曜
    expect(isRoutineActiveOn(r, '2026-05-29', schedule)).toBe(true); // 金曜
    expect(isRoutineActiveOn(r, '2026-05-31', schedule)).toBe(false); // 日曜
  });

  it('attendance は schedule の off 以外 (= 通所 or 在宅) で true', () => {
    const r = addRoutine({ text: 'A', frequency: 'attendance' })!;
    // DEFAULT_SCHEDULE: 月=office, 火=office, 水=home, 木=office, 金=office, 土=off, 日=off
    expect(isRoutineActiveOn(r, '2026-05-25', schedule)).toBe(true); // 月 office
    expect(isRoutineActiveOn(r, '2026-05-27', schedule)).toBe(true); // 水 home
    expect(isRoutineActiveOn(r, '2026-05-30', schedule)).toBe(false); // 土 off
    expect(isRoutineActiveOn(r, '2026-05-31', schedule)).toBe(false); // 日 off
  });

  it('weekdays が空配列なら常に false', () => {
    const r = addRoutine({
      text: 'A',
      frequency: 'weekdays',
      weekdays: [],
    })!;
    expect(isRoutineActiveOn(r, '2026-05-25', schedule)).toBe(false);
  });
});

describe('routines — OneOffTask API', () => {
  it('addOneOffTask は空文字を null で返す', () => {
    expect(addOneOffTask({ text: '', date: '2026-05-25' })).toBeNull();
    expect(addOneOffTask({ text: '   ', date: '2026-05-25' })).toBeNull();
  });

  it('addOneOffTask で作成すると ONEOFF_TASKS_KEY に保存される', () => {
    const t = addOneOffTask({ text: '本を1ページ', date: '2026-05-25' });
    expect(t).not.toBeNull();
    expect(t?.text).toBe('本を1ページ');
    expect(t?.date).toBe('2026-05-25');
    expect(t?.done).toBe(false);
    expect(loadOneOffTasks()).toHaveLength(1);
    expect(localStorage.getItem(ONEOFF_TASKS_KEY)).not.toBeNull();
  });

  it('fromConcernId を渡せる', () => {
    const t = addOneOffTask({
      text: '本屋に行く',
      date: '2026-05-25',
      fromConcernId: 'cg_1',
    });
    expect(t?.fromConcernId).toBe('cg_1');
  });

  it('getOneOffTasksForDate は指定日だけを返す', () => {
    addOneOffTask({ text: '今日', date: '2026-05-25' });
    addOneOffTask({ text: '昨日', date: '2026-05-24' });
    addOneOffTask({ text: '今日2', date: '2026-05-25' });
    const today = getOneOffTasksForDate('2026-05-25');
    expect(today).toHaveLength(2);
    expect(today.map((t) => t.text).sort()).toEqual(['今日', '今日2']);
  });

  it('updateOneOffTask は patch を適用する', () => {
    const t = addOneOffTask({ text: 'A', date: '2026-05-25' })!;
    updateOneOffTask(t.id, { done: true });
    expect(loadOneOffTasks()[0].done).toBe(true);
  });

  it('deleteOneOffTask は対象だけ消す', () => {
    const a = addOneOffTask({ text: 'A', date: '2026-05-25' })!;
    const b = addOneOffTask({ text: 'B', date: '2026-05-25' })!;
    deleteOneOffTask(a.id);
    const list = loadOneOffTasks();
    expect(list.map((t) => t.id)).toEqual([b.id]);
  });
});

describe('routines — localStorage キーの分離', () => {
  it('Routine / RoutineLog / OneOff は別キーに保存される', () => {
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-25', 'done');
    addOneOffTask({ text: 'B', date: '2026-05-25' });
    expect(localStorage.getItem(ROUTINES_KEY)).not.toBeNull();
    expect(localStorage.getItem(ROUTINE_LOGS_KEY)).not.toBeNull();
    expect(localStorage.getItem(ONEOFF_TASKS_KEY)).not.toBeNull();
    // それぞれ独立して読み出せる
    expect(loadRoutines()).toHaveLength(1);
    expect(loadOneOffTasks()).toHaveLength(1);
  });
});
