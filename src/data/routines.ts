// 「まいにちのリズム (Routine)」と「今日だけタスク (OneOffTask)」の永続化。
//
// CareScreen 3 層構造リデザイン (2026-05-24) で導入。
// 仕様:
//  - 健康データの保存先は localStorage を原則とする (CLAUDE.md / §13)。
//  - 外部送信はしない (logTask で taskId / impact / done のみ送る既存 API は変更しない)。
//  - 自由記述 (text) は外部に送らない。
//
// 週次規約: 月曜 = 0 (Schedule と統一)。

import { loadJson, saveJson } from '../storage';
import {
  ROUTINES_KEY,
  ROUTINE_LOGS_KEY,
  ONEOFF_TASKS_KEY,
  scheduleSlotFor,
} from './store';
import type { Schedule } from './types';

// ── 型 ────────────────────────────────────────────────────────

/**
 * Routine = まいにちのリズム。
 * 続けたいことをゆるく育てる枠。完了 / 休む / 対象日外の 3 状態を持つ。
 */
export interface Routine {
  id: string;
  text: string;
  /**
   * - 'daily'      : 毎日対象
   * - 'weekdays'   : 指定曜日のみ対象 (weekdays に月曜=0..日曜=6 を入れる)
   * - 'attendance' : 通所予定がある日のみ対象 (Schedule の off 以外)
   */
  frequency: 'daily' | 'weekdays' | 'attendance';
  /** frequency='weekdays' のとき有効。月曜=0..日曜=6。 */
  weekdays?: number[];
  /** ひと休み中フラグ。true ならストリーク 0、見た目も薄く出す。 */
  paused?: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * RoutineLog = ルーティンの日別状態。
 * 形状: Record<routineId, Record<YYYY-MM-DD, 'done' | 'rest'>>
 *  - 'done' : その日に達成した
 *  - 'rest' : その日は意図的に休んだ (ひと休み)
 *  - 未エントリ: 未操作
 */
export type RoutineLog = Record<string, Record<string, 'done' | 'rest'>>;

/**
 * OneOffTask = 今日だけタスク。
 * 「今日のうちに、できたら うれしいこと」。日付固定で持つ。
 */
export interface OneOffTask {
  id: string;
  text: string;
  date: string; // YYYY-MM-DD
  done?: boolean;
  /** 「いつかやってみたいこと」から「今日だけやってみる」した時の元 concern id。 */
  fromConcernId?: string;
  createdAt: string;
  updatedAt?: string;
}

// ── Routine API ───────────────────────────────────────────────

export function loadRoutines(): Routine[] {
  const v = loadJson<Routine[]>(ROUTINES_KEY, []);
  return Array.isArray(v) ? v : [];
}

function saveRoutines(list: Routine[]): void {
  saveJson(ROUTINES_KEY, list);
}

export function addRoutine(input: {
  text: string;
  frequency: Routine['frequency'];
  weekdays?: number[];
}): Routine | null {
  const trimmed = input.text.trim();
  if (!trimmed) return null;
  const now = new Date().toISOString();
  const routine: Routine = {
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text: trimmed,
    frequency: input.frequency,
    weekdays: input.frequency === 'weekdays' ? input.weekdays ?? [] : undefined,
    paused: false,
    createdAt: now,
  };
  const list = loadRoutines();
  saveRoutines([...list, routine]);
  return routine;
}

export function updateRoutine(id: string, patch: Partial<Routine>): void {
  // L-1: 不正値が localStorage に書き込まれないようランタイム型ガード。
  // TypeScript 上では Partial<Routine> で守られるが、JSON 経由・将来の
  // 別経路呼び出しで '不明な frequency' 等が来ても保存しない。
  const safePatch: Partial<Routine> = {};
  if (typeof patch.text === 'string') safePatch.text = patch.text;
  if (
    patch.frequency === 'daily' ||
    patch.frequency === 'weekdays' ||
    patch.frequency === 'attendance'
  )
    safePatch.frequency = patch.frequency;
  if (Array.isArray(patch.weekdays))
    safePatch.weekdays = patch.weekdays.filter(
      (n): n is number => typeof n === 'number' && n >= 0 && n <= 6,
    );
  if (typeof patch.paused === 'boolean') safePatch.paused = patch.paused;

  const list = loadRoutines();
  const now = new Date().toISOString();
  saveRoutines(
    list.map((r) => (r.id === id ? { ...r, ...safePatch, updatedAt: now } : r)),
  );
}

/**
 * Routine と紐づく RoutineLog を一緒に削除する (確定方針: 削除時 RoutineLog も削除)。
 */
export function deleteRoutine(id: string): void {
  const list = loadRoutines();
  saveRoutines(list.filter((r) => r.id !== id));
  const logs = loadRoutineLogs();
  if (id in logs) {
    const next = { ...logs };
    delete next[id];
    saveRoutineLogs(next);
  }
}

// ── RoutineLog API ────────────────────────────────────────────

export function loadRoutineLogs(): RoutineLog {
  // L-3: 配列が混入すると後段の Record アクセスで挙動が崩れるため除外。
  const v = loadJson<RoutineLog>(ROUTINE_LOGS_KEY, {});
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

function saveRoutineLogs(logs: RoutineLog): void {
  saveJson(ROUTINE_LOGS_KEY, logs);
}

export function setRoutineLog(
  routineId: string,
  date: string,
  state: 'done' | 'rest',
): void {
  // L-2: 想定外の状態値が localStorage に書き込まれないよう防御。
  if (state !== 'done' && state !== 'rest') return;
  const logs = loadRoutineLogs();
  const dayMap = { ...(logs[routineId] ?? {}) };
  dayMap[date] = state;
  saveRoutineLogs({ ...logs, [routineId]: dayMap });
}

export function clearRoutineLog(routineId: string, date: string): void {
  const logs = loadRoutineLogs();
  const dayMap = { ...(logs[routineId] ?? {}) };
  if (!(date in dayMap)) return;
  delete dayMap[date];
  saveRoutineLogs({ ...logs, [routineId]: dayMap });
}

// ── 対象日判定 ────────────────────────────────────────────────

/**
 * 指定日が routine の対象日かどうか。
 *  - daily      : 常に true
 *  - weekdays   : weekdays に jsDow→月曜0..日曜6 変換した値が含まれていれば true
 *  - attendance : 通所スケジュールが off 以外 (= 通所 or 在宅) なら true
 *
 * paused (ひと休み) は別軸で扱う (computeRoutineStreak 側で 0 を返す)。
 */
export function isRoutineActiveOn(
  routine: Routine,
  date: string,
  schedule: Schedule,
): boolean {
  if (routine.frequency === 'daily') return true;
  if (routine.frequency === 'weekdays') {
    const wd = mondayWeekdayIndex(date);
    if (wd == null) return false;
    return (routine.weekdays ?? []).includes(wd);
  }
  if (routine.frequency === 'attendance') {
    const slot = scheduleSlotFor(date, schedule);
    return !!slot && slot.mode !== 'off';
  }
  return false;
}

/** YYYY-MM-DD → 月曜=0..日曜=6 */
export function mondayWeekdayIndex(date: string): number | null {
  const parts = date.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  const jsDow = new Date(y, m - 1, d).getDay(); // 0=Sun..6=Sat
  return (jsDow + 6) % 7; // 月曜=0..日曜=6
}

// ── OneOffTask API ────────────────────────────────────────────

export function loadOneOffTasks(): OneOffTask[] {
  const v = loadJson<OneOffTask[]>(ONEOFF_TASKS_KEY, []);
  return Array.isArray(v) ? v : [];
}

function saveOneOffTasks(list: OneOffTask[]): void {
  saveJson(ONEOFF_TASKS_KEY, list);
}

/** 指定日に紐づく OneOffTask のみを返す。 */
export function getOneOffTasksForDate(date: string): OneOffTask[] {
  return loadOneOffTasks().filter((t) => t.date === date);
}

export function addOneOffTask(input: {
  text: string;
  date: string;
  fromConcernId?: string;
}): OneOffTask | null {
  const trimmed = input.text.trim();
  if (!trimmed) return null;
  const now = new Date().toISOString();
  const task: OneOffTask = {
    id: `oo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text: trimmed,
    date: input.date,
    done: false,
    fromConcernId: input.fromConcernId,
    createdAt: now,
  };
  const list = loadOneOffTasks();
  saveOneOffTasks([...list, task]);
  return task;
}

export function updateOneOffTask(id: string, patch: Partial<OneOffTask>): void {
  const list = loadOneOffTasks();
  const now = new Date().toISOString();
  saveOneOffTasks(
    list.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now } : t)),
  );
}

export function deleteOneOffTask(id: string): void {
  const list = loadOneOffTasks();
  saveOneOffTasks(list.filter((t) => t.id !== id));
}
