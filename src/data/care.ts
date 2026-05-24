import { loadJson, saveJson } from '../storage';
import { CARE_GOALS_KEY } from './store';
import type { Goal, UserTask, Whisper } from './types';
import {
  addOneOffTask,
  deleteOneOffTask,
  getOneOffTasksForDate,
  loadOneOffTasks,
  updateOneOffTask,
  type OneOffTask,
} from './routines';

export const DEFAULT_GOALS: Goal[] = [
  { id: 'g1', icon: '🌙', text: '23時までに ふとんに入る', kind: 'sleep',    progress: 5, target: 7, active: true },
  { id: 'g2', icon: '💧', text: '朝、コップ1杯のお水',     kind: 'meal',     progress: 7, target: 7, active: true },
  { id: 'g3', icon: '🚶', text: '週に2回 5分の散歩',       kind: 'exercise', progress: 1, target: 2, active: true },
];

export const DEFAULT_TASKS: UserTask[] = [
  { id: 't1', name: '朝、窓を開ける',           impact: 'basic',  done: true,  createdAt: new Date('2026-04-30') },
  { id: 't2', name: '夕方、5分のストレッチ',     impact: 'effort', done: false, createdAt: new Date('2026-05-01') },
  { id: 't3', name: '湯ぶねに ゆっくりつかる',   impact: 'effort', done: false, createdAt: new Date('2026-05-02') },
];

export const WHISPERS: Whisper[] = [
  { tone: 'gentle', text: 'おはよう。\n今日も、いてくれてありがとう。',                     from: 'morning' },
  { tone: 'cheer',  text: '昨日、よく眠れたみたいですね。\nそのリズム、大切にしましょう。', from: 'sleep' },
  { tone: 'soft',   text: 'うまくいかない日は、\nふかく息をはくだけで じゅうぶん。',       from: 'rest' },
];

// ── ケアの目標 (localStorage 永続化) ──────────────────────────
// 仕様 §5.1 / §5.2 / T2:
// - 小さな目標 (smallGoals) は日付ごとに保存し、翌日リセットする。
// - 気になる目標 (concernGoals) は本人が追加/削除する自由項目。
// 端末ローカルのみ。fetch / 外部送信は行わない。

export interface SmallGoal {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  done?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ConcernGoal {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CareGoalsStore {
  smallGoals: SmallGoal[];
  concernGoals: ConcernGoal[];
}

export function loadCareGoals(): CareGoalsStore {
  const v = loadJson<Partial<CareGoalsStore>>(CARE_GOALS_KEY, {});
  return {
    // smallGoals は OneOffTask へ実体が移ったが、後方互換のためここで合成して返す。
    smallGoals: oneOffsToSmallGoals(loadOneOffTasks()),
    concernGoals: Array.isArray(v.concernGoals) ? v.concernGoals : [],
  };
}

/**
 * 0.3.0 以降は smallGoals は OneOffTask の薄いラッパなので、
 * saveCareGoals では concernGoals のみを保存する (smallGoals は無視する)。
 */
export function saveCareGoals(store: CareGoalsStore): void {
  saveJson(CARE_GOALS_KEY, {
    smallGoals: [],
    concernGoals: store.concernGoals,
  });
}

function oneOffsToSmallGoals(list: OneOffTask[]): SmallGoal[] {
  return list.map((t) => ({
    id: t.id,
    date: t.date,
    text: t.text,
    done: !!t.done,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

/** 指定日 (既定: 今日) の小さな目標だけを返す (内部は OneOffTask)。 */
export function getSmallGoalsForDate(date: string): SmallGoal[] {
  return oneOffsToSmallGoals(getOneOffTasksForDate(date));
}

export function addSmallGoal(text: string, date: string): SmallGoal | null {
  const created = addOneOffTask({ text, date });
  if (!created) return null;
  return oneOffsToSmallGoals([created])[0];
}

export function updateSmallGoal(id: string, patch: Partial<SmallGoal>): void {
  // SmallGoal の patch は OneOffTask とほぼ 1:1。text / date / done のみ通す。
  const oneOffPatch: Partial<OneOffTask> = {};
  if (patch.text != null) oneOffPatch.text = patch.text;
  if (patch.date != null) oneOffPatch.date = patch.date;
  if (patch.done != null) oneOffPatch.done = patch.done;
  updateOneOffTask(id, oneOffPatch);
}

export function deleteSmallGoal(id: string): void {
  deleteOneOffTask(id);
}

export function addConcernGoal(text: string): ConcernGoal | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const goal: ConcernGoal = {
    id: `cg_${Date.now()}`,
    text: trimmed,
    createdAt: new Date().toISOString(),
  };
  const store = loadCareGoals();
  saveCareGoals({ ...store, concernGoals: [...store.concernGoals, goal] });
  return goal;
}

export function deleteConcernGoal(id: string): void {
  const store = loadCareGoals();
  saveCareGoals({
    ...store,
    concernGoals: store.concernGoals.filter((g) => g.id !== id),
  });
}

export { _resetCareGoals };

function _resetCareGoals(): void {
  try {
    localStorage.removeItem(CARE_GOALS_KEY);
  } catch {
    // ignore
  }
}
