import { useEffect, useMemo, useState } from 'react';
import {
  addConcernGoal,
  deleteConcernGoal,
  loadCareGoals,
  type ConcernGoal,
} from '../../data/care';
import { NOTICE_ROUTINES_DISMISSED_KEY, todayISO } from '../../data/store';
import { logTask } from '../../api/sheets';
import {
  addOneOffTask,
  addRoutine,
  clearRoutineLog,
  deleteOneOffTask,
  deleteRoutine,
  getOneOffTasksForDate,
  loadRoutineLogs,
  loadRoutines,
  setRoutineLog,
  updateOneOffTask,
  updateRoutine,
  type OneOffTask,
  type Routine,
  type RoutineLog,
} from '../../data/routines';
import { sortRoutinesByActiveFirst } from '../../data/careView';
import { loadJson, saveJson } from '../../storage';

/**
 * CareScreen の状態管理とアクションをまとめたカスタムフック。
 * 表示 (JSX) はコンポーネントに残し、ここは状態と副作用・永続化だけを担う。
 */
export function useCareScreen(nickname?: string) {
  const today = todayISO();

  // ② Routine
  const [routines, setRoutines] = useState<Routine[]>(() => loadRoutines());
  const [routineLogs, setRoutineLogs] = useState<RoutineLog>(() =>
    loadRoutineLogs()
  );

  // ③ OneOff
  const [oneoffs, setOneoffs] = useState<OneOffTask[]>(() =>
    getOneOffTasksForDate(today)
  );
  const [seeds, setSeeds] = useState(() =>
    getOneOffTasksForDate(today).reduce((acc, t) => acc + (t.done ? 1 : 0), 0)
  );
  const [recentReward, setRecentReward] = useState<{
    id: string;
    amount: number;
  } | null>(null);
  const [confirmDeleteOneoff, setConfirmDeleteOneoff] = useState<string | null>(
    null
  );

  // ④ Concern
  const [concerns, setConcerns] = useState<ConcernGoal[]>(
    () => loadCareGoals().concernGoals
  );
  const [confirmDeleteConcern, setConfirmDeleteConcern] = useState<
    string | null
  >(null);

  // FAB ダイアログ
  const [fabOpen, setFabOpen] = useState(false);

  // 初回お知らせバナー
  const [noticeOpen, setNoticeOpen] = useState(
    () => !loadJson<boolean>(NOTICE_ROUTINES_DISMISSED_KEY, false)
  );

  // 日付が変わったら今日分の OneOff を取り直す
  useEffect(() => {
    setOneoffs(getOneOffTasksForDate(today));
  }, [today]);

  // ── Routine: 達成 / ひと休み / クリア ─────────────────────
  const onRoutineDone = (r: Routine) => {
    const current = routineLogs[r.id]?.[today];
    if (current === 'done') {
      // 再タップで取り消し
      clearRoutineLog(r.id, today);
    } else {
      setRoutineLog(r.id, today, 'done');
    }
    setRoutineLogs(loadRoutineLogs());
  };

  const onRoutineRest = (r: Routine) => {
    const current = routineLogs[r.id]?.[today];
    if (current === 'rest') {
      clearRoutineLog(r.id, today);
    } else {
      setRoutineLog(r.id, today, 'rest');
    }
    setRoutineLogs(loadRoutineLogs());
  };

  const onRoutineUpdate = (id: string, patch: Partial<Routine>) => {
    updateRoutine(id, patch);
    setRoutines(loadRoutines());
  };

  const onRoutineDelete = (id: string) => {
    deleteRoutine(id);
    setRoutines(loadRoutines());
    setRoutineLogs(loadRoutineLogs());
  };

  // ── OneOff: 達成 / 削除 ─────────────────────────────────
  const onOneoffToggle = (t: OneOffTask) => {
    const nextDone = !t.done;
    updateOneOffTask(t.id, { done: nextDone });
    setOneoffs((ts) =>
      ts.map((x) => (x.id === t.id ? { ...x, done: nextDone } : x))
    );
    if (nextDone) {
      const reward = 1;
      setSeeds((s) => s + reward);
      setRecentReward({ id: t.id, amount: reward });
      setTimeout(
        () => setRecentReward((r) => (r && r.id === t.id ? null : r)),
        1800
      );
    } else {
      setSeeds((s) => Math.max(0, s - 1));
    }
    // 既存仕様: logTask は taskId / impact / done のみ。text は送らない (§13.1 / H1)。
    logTask({ taskId: t.id, impact: 'basic', done: nextDone }, nickname);
  };

  const onOneoffDelete = (id: string) => {
    deleteOneOffTask(id);
    setOneoffs((ts) => ts.filter((t) => t.id !== id));
    setConfirmDeleteOneoff(null);
  };

  // ── Concern: 3 動線 ────────────────────────────────────
  const onConcernToOneoff = (c: ConcernGoal) => {
    const created = addOneOffTask({
      text: c.text,
      date: today,
      fromConcernId: c.id,
    });
    if (created) {
      setOneoffs((ts) => [...ts, created]);
    }
    // 「今日だけやってみる」は concern を残す (確定方針)
  };

  const onConcernToRoutine = (c: ConcernGoal) => {
    const created = addRoutine({ text: c.text, frequency: 'daily' });
    if (created) {
      setRoutines(loadRoutines());
      // concern は削除する (確定方針: まいにちにする = 移動)
      deleteConcernGoal(c.id);
      setConcerns((cs) => cs.filter((x) => x.id !== c.id));
    }
  };

  const onDeleteConcern = (id: string) => {
    deleteConcernGoal(id);
    setConcerns((cs) => cs.filter((c) => c.id !== id));
    setConfirmDeleteConcern(null);
  };

  // ── FAB: 3 択ダイアログ ────────────────────────────────
  const onFabAdd = (kind: 'oneoff' | 'routine' | 'concern', text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (kind === 'oneoff') {
      const created = addOneOffTask({ text: trimmed, date: today });
      if (created) setOneoffs((ts) => [...ts, created]);
    } else if (kind === 'routine') {
      const created = addRoutine({ text: trimmed, frequency: 'daily' });
      if (created) setRoutines(loadRoutines());
    } else {
      const created = addConcernGoal(trimmed);
      if (created) setConcerns((cs) => [...cs, created]);
    }
    setFabOpen(false);
  };

  // ── 初回お知らせバナー ───────────────────────────────
  const dismissNotice = () => {
    setNoticeOpen(false);
    saveJson(NOTICE_ROUTINES_DISMISSED_KEY, true);
  };

  // paused は最下部に表示するため並び替え (T6 確定方針)
  const sortedRoutines = useMemo(
    () => sortRoutinesByActiveFirst(routines),
    [routines]
  );

  return {
    today,
    // ② Routine
    routines: sortedRoutines,
    routineLogs,
    onRoutineDone,
    onRoutineRest,
    onRoutineUpdate,
    onRoutineDelete,
    // ③ OneOff
    oneoffs,
    seeds,
    recentReward,
    confirmDeleteOneoff,
    setConfirmDeleteOneoff,
    onOneoffToggle,
    onOneoffDelete,
    // ④ Concern
    concerns,
    confirmDeleteConcern,
    setConfirmDeleteConcern,
    onConcernToOneoff,
    onConcernToRoutine,
    onDeleteConcern,
    // FAB
    fabOpen,
    setFabOpen,
    onFabAdd,
    // Notice
    noticeOpen,
    dismissNotice,
  };
}
