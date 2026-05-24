import { useEffect, useMemo, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { BottomTabs, type TabId } from '../components/BottomTabs';
import {
  addConcernGoal,
  deleteConcernGoal,
  loadCareGoals,
  type ConcernGoal,
} from '../data/care';
import {
  NOTICE_ROUTINES_DISMISSED_KEY,
  todayISO,
} from '../data/store';
import { DEFAULT_SCHEDULE } from '../data/attendance';
import { MILESTONES, getMilestone } from '../data/stages';
import { logTask } from '../api/sheets';
import type { Milestone, Schedule } from '../data/types';
import {
  addOneOffTask,
  addRoutine,
  clearRoutineLog,
  deleteOneOffTask,
  deleteRoutine,
  getOneOffTasksForDate,
  isRoutineActiveOn,
  loadRoutineLogs,
  loadRoutines,
  setRoutineLog,
  updateOneOffTask,
  updateRoutine,
  type OneOffTask,
  type Routine,
  type RoutineLog,
} from '../data/routines';
import { computeRoutineStreak } from '../data/routineStreak';
import { loadJson, saveJson } from '../storage';

interface CareScreenProps {
  totalDays?: number;
  eggName?: string;
  nickname?: string;
  schedule?: Schedule;
  onTab?: (t: TabId) => void;
}

const WEEKDAY_JP_MON0 = ['月', '火', '水', '木', '金', '土', '日'] as const;

export function CareScreen({
  totalDays = 12,
  eggName = '',
  nickname,
  schedule = DEFAULT_SCHEDULE,
  onTab,
}: CareScreenProps) {
  const milestone = getMilestone(totalDays);
  const nextMilestone =
    milestone.next != null
      ? MILESTONES.find((m) => m.days === milestone.next)
      : null;
  const segStart = milestone.days;
  const segEnd =
    milestone.next ?? Math.max(milestone.days + 1, totalDays);
  const segPct =
    milestone.next != null
      ? Math.min(
          100,
          Math.max(0, ((totalDays - segStart) / (segEnd - segStart)) * 100),
        )
      : 100;
  const remaining =
    milestone.next != null ? Math.max(0, milestone.next - totalDays) : 0;

  const today = todayISO();

  // ② Routine
  const [routines, setRoutines] = useState<Routine[]>(() => loadRoutines());
  const [routineLogs, setRoutineLogs] = useState<RoutineLog>(() =>
    loadRoutineLogs(),
  );

  // ③ OneOff
  const [oneoffs, setOneoffs] = useState<OneOffTask[]>(() =>
    getOneOffTasksForDate(today),
  );
  const [seeds, setSeeds] = useState(() =>
    getOneOffTasksForDate(today).reduce((acc, t) => acc + (t.done ? 1 : 0), 0),
  );
  const [recentReward, setRecentReward] = useState<{
    id: string;
    amount: number;
  } | null>(null);
  const [confirmDeleteOneoff, setConfirmDeleteOneoff] = useState<string | null>(null);

  // ④ Concern
  const [concerns, setConcerns] = useState<ConcernGoal[]>(
    () => loadCareGoals().concernGoals,
  );
  const [confirmDeleteConcern, setConfirmDeleteConcern] = useState<string | null>(null);

  // FAB ダイアログ
  const [fabOpen, setFabOpen] = useState(false);

  // 初回お知らせバナー
  const [noticeOpen, setNoticeOpen] = useState(
    () => !loadJson<boolean>(NOTICE_ROUTINES_DISMISSED_KEY, false),
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
      ts.map((x) => (x.id === t.id ? { ...x, done: nextDone } : x)),
    );
    if (nextDone) {
      const reward = 1;
      setSeeds((s) => s + reward);
      setRecentReward({ id: t.id, amount: reward });
      setTimeout(
        () => setRecentReward((r) => (r && r.id === t.id ? null : r)),
        1800,
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
  const sortedRoutines = useMemo(() => {
    const active = routines.filter((r) => !r.paused);
    const paused = routines.filter((r) => r.paused);
    return [...active, ...paused];
  }, [routines]);

  return (
    <PhoneShell bg={PALETTE.creamSoft} label="07 ケア">
      <BackgroundLeaves />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '4px 22px 12px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        <div style={{ marginTop: 6, marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>ケア</div>
          <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 4 }}>
            ちいさな目標と、鳥からのことば
          </div>
        </div>

        {noticeOpen && <NoticeBanner onDismiss={dismissNotice} />}

        <RelationshipSection
          eggName={eggName}
          totalDays={totalDays}
          milestone={milestone}
          nextLabel={nextMilestone?.label ?? null}
          segStart={segStart}
          segEnd={segEnd}
          segPct={segPct}
          remaining={remaining}
        />

        {/* ② まいにちのリズム ─────────────────────────── */}
        <RoutineSection
          routines={sortedRoutines}
          logs={routineLogs}
          schedule={schedule}
          today={today}
          onDone={onRoutineDone}
          onRest={onRoutineRest}
          onUpdate={onRoutineUpdate}
          onDelete={onRoutineDelete}
        />

        {/* ③ 今日だけタスク ─────────────────────────── */}
        <OneOffSection
          tasks={oneoffs}
          seeds={seeds}
          onToggle={onOneoffToggle}
          onDelete={onOneoffDelete}
          confirming={confirmDeleteOneoff}
          onAskDelete={setConfirmDeleteOneoff}
          recentReward={recentReward}
        />

        {/* ④ いつかやってみたいこと ─────────────────── */}
        <ConcernSection
          concerns={concerns}
          confirmDeleteId={confirmDeleteConcern}
          onAskDelete={setConfirmDeleteConcern}
          onDelete={onDeleteConcern}
          onToOneoff={onConcernToOneoff}
          onToRoutine={onConcernToRoutine}
        />

        <div style={{ height: 8 }} />
        <div
          style={{
            marginTop: 4,
            padding: '10px 12px',
            background: PALETTE.creamSoft,
            borderRadius: 12,
            fontSize: 11,
            color: PALETTE.inkSoft,
            lineHeight: 1.7,
            textAlign: 'center',
          }}
        >
          達成できなくても、大丈夫。
          <br />
          休んだ日も、関係性は後退しません。
        </div>
        <div style={{ height: 80 }} />
      </div>

      {/* FAB */}
      <FloatingAddButton onClick={() => setFabOpen(true)} />
      {fabOpen && (
        <FabDialog
          onCancel={() => setFabOpen(false)}
          onAdd={onFabAdd}
        />
      )}

      <BottomTabs active="care" onChange={onTab} />
    </PhoneShell>
  );
}

// ── Notice バナー ────────────────────────────────────────────
function NoticeBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        marginBottom: 12,
        padding: '10px 12px',
        background: PALETTE.sageSoft,
        borderRadius: 12,
        boxShadow: CARD_SHADOW,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        position: 'relative',
      }}
    >
      <div style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }}>🌱</div>
      <div style={{ flex: 1, fontSize: 12, lineHeight: 1.6, color: PALETTE.ink }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>
          『まいにちのリズム』が追加されました
        </div>
        <div style={{ color: PALETTE.inkSoft }}>
          つづけたいことを、ゆっくり育てる場所です。気軽にはじめて、休んでも大丈夫。
        </div>
      </div>
      <button
        onClick={onDismiss}
        aria-label="閉じる"
        style={{
          border: 'none',
          background: 'transparent',
          color: PALETTE.inkSoft,
          fontSize: 16,
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── ① RelationshipSection (既存) ───────────────────────────
interface RelationshipProps {
  eggName: string;
  totalDays: number;
  milestone: Milestone;
  nextLabel: string | null;
  segStart: number;
  segEnd: number;
  segPct: number;
  remaining: number;
}

function RelationshipSection({
  eggName,
  totalDays,
  milestone,
  nextLabel,
  segStart,
  segEnd,
  segPct,
  remaining,
}: RelationshipProps) {
  const isMax = milestone.next == null;
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
        {eggName ? `${eggName}との関係` : '鳥との関係'}
      </div>
      <div
        style={{ fontSize: 11, color: PALETTE.inkSoft, marginBottom: 10 }}
      >
        累計 {totalDays} 日の記録から
      </div>
      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          padding: '16px 18px 18px',
          boxShadow: CARD_SHADOW,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🤝</span>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: PALETTE.sageDeep,
              letterSpacing: '0.02em',
              lineHeight: 1.2,
            }}
          >
            {milestone.label}
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: PALETTE.inkSoft,
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            <span>{segStart}日</span>
            <span>{isMax ? '∞' : `${segEnd}日`}</span>
          </div>
          <div
            style={{
              height: 8,
              background: PALETTE.sageSoft,
              borderRadius: 999,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${segPct}%`,
                background: `linear-gradient(90deg, ${PALETTE.sage}, ${PALETTE.sageDeep})`,
                borderRadius: 999,
                transition: 'width .4s',
              }}
            />
          </div>
        </div>

        <div style={{ fontSize: 12, color: PALETTE.ink, lineHeight: 1.6 }}>
          {isMax ? (
            <span>もう、ことばでは言えない関係になりました。</span>
          ) : (
            <span>
              あと{' '}
              <b style={{ color: PALETTE.sageDeep }}>{remaining}日</b> で『
              {nextLabel}』
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ② RoutineSection ──────────────────────────────────────
interface RoutineSectionProps {
  routines: Routine[];
  logs: RoutineLog;
  schedule: Schedule;
  today: string;
  onDone: (r: Routine) => void;
  onRest: (r: Routine) => void;
  onUpdate: (id: string, patch: Partial<Routine>) => void;
  onDelete: (id: string) => void;
}

function RoutineSection({
  routines,
  logs,
  schedule,
  today,
  onDone,
  onRest,
  onUpdate,
  onDelete,
}: RoutineSectionProps) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>🌱 まいにちのリズム</div>
      <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2, marginBottom: 10 }}>
        つづけたいことを、ゆっくり育てる場所
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {routines.length === 0 ? (
          <div
            style={{
              fontSize: 11,
              color: PALETTE.inkSoft,
              padding: '8px 4px',
              lineHeight: 1.6,
            }}
          >
            『+ サッと追加』から、ひとつはじめてみよう
          </div>
        ) : (
          routines.map((r) => (
            <RoutineCard
              key={r.id}
              routine={r}
              state={logs[r.id]?.[today]}
              schedule={schedule}
              today={today}
              logs={logs}
              onDone={() => onDone(r)}
              onRest={() => onRest(r)}
              onUpdate={(patch) => onUpdate(r.id, patch)}
              onDelete={() => onDelete(r.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface RoutineCardProps {
  routine: Routine;
  state: 'done' | 'rest' | undefined;
  schedule: Schedule;
  today: string;
  logs: RoutineLog;
  onDone: () => void;
  onRest: () => void;
  onUpdate: (patch: Partial<Routine>) => void;
  onDelete: () => void;
}

function RoutineCard({
  routine,
  state,
  schedule,
  today,
  logs,
  onDone,
  onRest,
  onUpdate,
  onDelete,
}: RoutineCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const active = isRoutineActiveOn(routine, today, schedule);
  const streak = computeRoutineStreak(routine, logs, schedule, today);
  const done = state === 'done';
  const rest = state === 'rest';
  const paused = !!routine.paused;

  return (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 14,
        padding: '12px 12px 10px',
        boxShadow: CARD_SHADOW,
        opacity: paused ? 0.55 : done ? 0.75 : 1,
        border: done
          ? `1.5px solid ${PALETTE.sageDeep}`
          : '1.5px solid transparent',
        transition: 'opacity .2s, border-color .2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            fontWeight: 700,
            color: PALETTE.ink,
            lineHeight: 1.4,
            textDecoration: done ? 'line-through' : 'none',
          }}
        >
          {routine.text}
        </div>
        <button
          onClick={() => setEditOpen((o) => !o)}
          aria-label="編集"
          style={{
            width: 28,
            height: 28,
            border: 'none',
            background: 'transparent',
            color: PALETTE.inkSoft,
            fontSize: 14,
            cursor: 'pointer',
            flexShrink: 0,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ✎
        </button>
      </div>

      {/* ストリーク / 状態表示 */}
      <div
        style={{
          marginTop: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 16,
        }}
      >
        {paused ? (
          <span style={{ fontSize: 11, color: PALETTE.inkSoft }}>
            ひと休み中
          </span>
        ) : !active ? (
          <span style={{ fontSize: 11, color: PALETTE.inkSoft }}>
            きょうは おやすみの曜日
          </span>
        ) : rest ? (
          <span style={{ fontSize: 11, color: PALETTE.inkSoft }}>
            ひと休み中
          </span>
        ) : streak >= 1 ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: PALETTE.sageDeep,
            }}
          >
            🔥 {streak}日 つづいてるよ
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'transparent' }}>·</span>
        )}
      </div>

      {/* アクション (対象日かつ paused でないときのみ操作可能) */}
      {!paused && active && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={onDone}
            aria-label={done ? '達成を取り消す' : '達成にする'}
            style={{
              flex: 1,
              height: 36,
              border: done ? 'none' : `1.5px solid ${PALETTE.sage}`,
              background: done ? PALETTE.sageDeep : '#fff',
              color: done ? '#fff' : PALETTE.sageDeep,
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              cursor: 'pointer',
            }}
          >
            {done ? '✓ 達成しました' : '✓ できた'}
          </button>
          <button
            onClick={onRest}
            style={{
              minWidth: 90,
              height: 36,
              border: `1.5px solid ${rest ? PALETTE.amber : PALETTE.sage}`,
              background: rest ? PALETTE.amberSoft : '#fff',
              color: rest ? PALETTE.ink : PALETTE.inkSoft,
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              cursor: 'pointer',
            }}
          >
            ひと休み
          </button>
        </div>
      )}

      {/* 編集パネル */}
      {editOpen && (
        <RoutineEditPanel
          routine={routine}
          onChange={onUpdate}
          onAskDelete={() => setConfirmDelete(true)}
          onClose={() => setEditOpen(false)}
        />
      )}

      {confirmDelete && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.96)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            gap: 8,
            zIndex: 6,
            border: `1.5px solid ${PALETTE.amber}`,
          }}
        >
          <div style={{ fontSize: 12, color: PALETTE.ink, fontWeight: 600 }}>
            このリズムを消しますか？
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setConfirmDelete(false)}
              style={pillBtn(PALETTE.sageSoft, PALETTE.inkSoft)}
            >
              やめる
            </button>
            <button
              onClick={() => {
                setConfirmDelete(false);
                setEditOpen(false);
                onDelete();
              }}
              style={pillBtn(PALETTE.amber, '#fff')}
            >
              消す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function pillBtn(bg: string, fg: string) {
  return {
    border: 'none',
    background: bg,
    color: fg,
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: ROUNDED_FONT,
    cursor: 'pointer',
  } as const;
}

interface RoutineEditPanelProps {
  routine: Routine;
  onChange: (patch: Partial<Routine>) => void;
  onAskDelete: () => void;
  onClose: () => void;
}

function RoutineEditPanel({
  routine,
  onChange,
  onAskDelete,
  onClose,
}: RoutineEditPanelProps) {
  const [text, setText] = useState(routine.text);
  const [frequency, setFrequency] = useState(routine.frequency);
  const [weekdays, setWeekdays] = useState<number[]>(routine.weekdays ?? []);

  const commitText = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== routine.text) {
      onChange({ text: trimmed });
    }
  };

  const setFreq = (f: Routine['frequency']) => {
    setFrequency(f);
    if (f === 'weekdays') {
      onChange({ frequency: f, weekdays });
    } else {
      onChange({ frequency: f, weekdays: undefined });
    }
  };

  const toggleWeekday = (wd: number) => {
    const next = weekdays.includes(wd)
      ? weekdays.filter((x) => x !== wd)
      : [...weekdays, wd].sort();
    setWeekdays(next);
    onChange({ frequency: 'weekdays', weekdays: next });
  };

  return (
    <div
      style={{
        marginTop: 10,
        padding: '10px 12px',
        background: PALETTE.creamSoft,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitText();
            onClose();
          }
        }}
        maxLength={40}
        style={{
          width: '100%',
          height: 32,
          border: 'none',
          borderBottom: `1.5px solid ${PALETTE.sageSoft}`,
          outline: 'none',
          fontSize: 13,
          fontFamily: ROUNDED_FONT,
          color: PALETTE.ink,
          background: 'transparent',
          padding: '0 4px',
        }}
      />

      <div style={{ display: 'flex', gap: 6 }}>
        {(['daily', 'weekdays', 'attendance'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFreq(f)}
            style={{
              flex: 1,
              height: 30,
              border: 'none',
              background:
                frequency === f ? PALETTE.sageDeep : PALETTE.sageSoft,
              color: frequency === f ? '#fff' : PALETTE.inkSoft,
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              cursor: 'pointer',
            }}
          >
            {f === 'daily' ? 'まいにち' : f === 'weekdays' ? '曜日' : '通所日'}
          </button>
        ))}
      </div>

      {frequency === 'weekdays' && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {WEEKDAY_JP_MON0.map((label, i) => {
            const on = weekdays.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggleWeekday(i)}
                style={{
                  width: 32,
                  height: 28,
                  border: 'none',
                  background: on ? PALETTE.sageDeep : '#fff',
                  color: on ? '#fff' : PALETTE.inkSoft,
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: ROUNDED_FONT,
                  cursor: 'pointer',
                  boxShadow: on ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: PALETTE.ink,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={!!routine.paused}
            onChange={(e) => onChange({ paused: e.target.checked })}
          />
          <span>ひと休み中にする</span>
        </label>
        <button
          onClick={onAskDelete}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#A04848',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          消す
        </button>
      </div>
    </div>
  );
}

// ── ③ OneOffSection ──────────────────────────────────────
interface OneOffSectionProps {
  tasks: OneOffTask[];
  seeds: number;
  onToggle: (t: OneOffTask) => void;
  onDelete: (id: string) => void;
  confirming: string | null;
  onAskDelete: (id: string | null) => void;
  recentReward: { id: string; amount: number } | null;
}

function OneOffSection({
  tasks,
  seeds,
  onToggle,
  onDelete,
  confirming,
  onAskDelete,
  recentReward,
}: OneOffSectionProps) {
  return (
    <div style={{ marginTop: 22 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>🌱 今日だけタスク</div>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>
            今日のうちに、できたら うれしいこと
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 700,
            color: PALETTE.sageDeep,
            background: PALETTE.sageSoft,
            padding: '4px 10px',
            borderRadius: 999,
          }}
        >
          <span style={{ fontSize: 13 }}>🌱</span>
          <span>{seeds} たね</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {tasks.length === 0 ? (
          <div
            style={{
              fontSize: 11,
              color: PALETTE.inkSoft,
              padding: '8px 4px',
              lineHeight: 1.6,
            }}
          >
            今日はまだタスクがありません
          </div>
        ) : (
          tasks.map((t) => (
            <OneOffRow
              key={t.id}
              task={t}
              onToggle={() => onToggle(t)}
              onDelete={() => onDelete(t.id)}
              confirming={confirming === t.id}
              onAskDelete={() => onAskDelete(t.id)}
              onCancelDelete={() => onAskDelete(null)}
              reward={
                recentReward && recentReward.id === t.id
                  ? recentReward.amount
                  : null
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

interface OneOffRowProps {
  task: OneOffTask;
  onToggle: () => void;
  onDelete: () => void;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  reward: number | null;
}

function OneOffRow({
  task,
  onToggle,
  onDelete,
  confirming,
  onAskDelete,
  onCancelDelete,
  reward,
}: OneOffRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const done = !!task.done;

  return (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 14,
        padding: '10px 12px',
        boxShadow: CARD_SHADOW,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        border: done
          ? `1.5px solid ${PALETTE.sageDeep}`
          : '1.5px solid transparent',
        opacity: done ? 0.6 : 1,
        transition: 'opacity .2s, border-color .2s',
      }}
    >
      <button
        onClick={onToggle}
        aria-label={done ? '達成済み' : '達成にする'}
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          border: done ? 'none' : `1.5px solid ${PALETTE.sage}`,
          background: done ? PALETTE.sageDeep : '#fff',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: ROUNDED_FONT,
        }}
      >
        {done ? '✓' : ''}
      </button>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 13,
          fontWeight: 600,
          color: PALETTE.ink,
          textDecoration: done ? 'line-through' : 'none',
          lineHeight: 1.4,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {task.fromConcernId && <span aria-label="いつかリスト由来">✨</span>}
        <span>{task.text}</span>
      </div>

      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="メニュー"
        style={{
          width: 24,
          height: 24,
          border: 'none',
          background: 'transparent',
          color: PALETTE.inkSoft,
          fontSize: 14,
          cursor: 'pointer',
          flexShrink: 0,
          lineHeight: 1,
          padding: 0,
        }}
      >
        ⋯
      </button>
      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 36,
            right: 8,
            zIndex: 5,
            background: '#fff',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(60,80,60,0.18)',
            padding: 4,
            minWidth: 110,
            fontFamily: ROUNDED_FONT,
          }}
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              onAskDelete();
            }}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              padding: '8px 12px',
              textAlign: 'left',
              fontSize: 12,
              color: '#A04848',
              cursor: 'pointer',
              borderRadius: 6,
              fontFamily: ROUNDED_FONT,
              fontWeight: 600,
            }}
          >
            削除する
          </button>
        </div>
      )}

      {confirming && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.96)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            gap: 8,
            zIndex: 6,
            border: `1.5px solid ${PALETTE.amber}`,
          }}
        >
          <div style={{ fontSize: 12, color: PALETTE.ink, fontWeight: 600 }}>
            このタスクを消しますか？
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={onCancelDelete}
              style={pillBtn(PALETTE.sageSoft, PALETTE.inkSoft)}
            >
              やめる
            </button>
            <button onClick={onDelete} style={pillBtn(PALETTE.amber, '#fff')}>
              消す
            </button>
          </div>
        </div>
      )}

      {reward != null && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: 10,
            background: PALETTE.sageDeep,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 999,
            boxShadow: '0 6px 16px rgba(127,169,130,0.4)',
            animation: 'seed-twinkle 1.4s ease-out',
            pointerEvents: 'none',
          }}
        >
          +{reward}🌱 もらえました
        </div>
      )}
    </div>
  );
}

// ── ④ ConcernSection ─────────────────────────────────────
interface ConcernSectionProps {
  concerns: ConcernGoal[];
  confirmDeleteId: string | null;
  onAskDelete: (id: string | null) => void;
  onDelete: (id: string) => void;
  onToOneoff: (c: ConcernGoal) => void;
  onToRoutine: (c: ConcernGoal) => void;
}

function ConcernSection({
  concerns,
  confirmDeleteId,
  onAskDelete,
  onDelete,
  onToOneoff,
  onToRoutine,
}: ConcernSectionProps) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>✨ いつかやってみたいこと</div>
      <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2, marginBottom: 10 }}>
        すぐじゃなくていい、心にあること
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {concerns.length === 0 && (
          <div
            style={{
              fontSize: 11,
              color: PALETTE.inkSoft,
              padding: '8px 4px',
              lineHeight: 1.6,
            }}
          >
            まだ気になることはありません。
          </div>
        )}
        {concerns.map((c) => (
          <ConcernCard
            key={c.id}
            concern={c}
            confirming={confirmDeleteId === c.id}
            onAskDelete={() => onAskDelete(c.id)}
            onCancelDelete={() => onAskDelete(null)}
            onDelete={() => onDelete(c.id)}
            onToOneoff={() => onToOneoff(c)}
            onToRoutine={() => onToRoutine(c)}
          />
        ))}
      </div>
    </div>
  );
}

interface ConcernCardProps {
  concern: ConcernGoal;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onToOneoff: () => void;
  onToRoutine: () => void;
}

function ConcernCard({
  concern,
  confirming,
  onAskDelete,
  onCancelDelete,
  onDelete,
  onToOneoff,
  onToRoutine,
}: ConcernCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: CARD_SHADOW,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        border: `1.5px dashed ${PALETTE.sage}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: PALETTE.sageSoft,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✨
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{concern.text}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onToOneoff}
          style={{
            flex: 1,
            height: 32,
            border: `1.5px solid ${PALETTE.sage}`,
            background: '#fff',
            color: PALETTE.sageDeep,
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
          }}
        >
          今日だけやってみる
        </button>
        <button
          onClick={onToRoutine}
          style={{
            flex: 1,
            height: 32,
            border: 'none',
            background: PALETTE.sageDeep,
            color: '#fff',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
          }}
        >
          まいにちにする
        </button>
        <button
          onClick={onAskDelete}
          style={{
            minWidth: 50,
            height: 32,
            border: `1.5px solid ${PALETTE.sageSoft}`,
            background: '#fff',
            color: PALETTE.inkSoft,
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
          }}
        >
          消す
        </button>
      </div>

      {confirming && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.96)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            gap: 8,
            zIndex: 6,
            border: `1.5px solid ${PALETTE.amber}`,
          }}
        >
          <div style={{ fontSize: 12, color: PALETTE.ink, fontWeight: 600 }}>
            これを消しますか？
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={onCancelDelete}
              style={pillBtn(PALETTE.sageSoft, PALETTE.inkSoft)}
            >
              やめる
            </button>
            <button onClick={onDelete} style={pillBtn(PALETTE.amber, '#fff')}>
              消す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FAB + 3 択ダイアログ ─────────────────────────────────
function FloatingAddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="サッと追加"
      style={{
        position: 'fixed',
        bottom: 88,
        right: 24,
        zIndex: 20,
        height: 48,
        padding: '0 18px',
        border: 'none',
        background: PALETTE.sageDeep,
        color: '#fff',
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 700,
        fontFamily: ROUNDED_FONT,
        boxShadow: '0 8px 24px rgba(60,80,60,0.24)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span style={{ fontSize: 16 }}>+</span>
      <span>サッと追加</span>
    </button>
  );
}

interface FabDialogProps {
  onCancel: () => void;
  onAdd: (kind: 'oneoff' | 'routine' | 'concern', text: string) => void;
}

function FabDialog({ onCancel, onAdd }: FabDialogProps) {
  const [text, setText] = useState('');
  const canAdd = text.trim().length > 0;
  return (
    <div
      role="dialog"
      aria-label="なにを ふやしますか？"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(40,50,40,0.36)',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 18,
          padding: '18px 18px 16px',
          maxWidth: 320,
          width: '100%',
          boxShadow: '0 14px 36px rgba(40,60,40,0.22)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          fontFamily: ROUNDED_FONT,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: PALETTE.ink }}>
          なにを ふやしますか？
        </div>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例: 朝、窓を開ける"
          maxLength={40}
          style={{
            width: '100%',
            height: 40,
            border: 'none',
            borderBottom: `1.5px solid ${PALETTE.sageSoft}`,
            outline: 'none',
            fontSize: 14,
            fontFamily: ROUNDED_FONT,
            color: PALETTE.ink,
            background: 'transparent',
            padding: '0 4px',
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => onAdd('oneoff', text)}
            disabled={!canAdd}
            style={dialogBtn(canAdd, PALETTE.sage)}
          >
            今日だけ
          </button>
          <button
            onClick={() => onAdd('routine', text)}
            disabled={!canAdd}
            style={dialogBtn(canAdd, PALETTE.sageDeep)}
          >
            まいにち
          </button>
          <button
            onClick={() => onAdd('concern', text)}
            disabled={!canAdd}
            style={dialogBtn(canAdd, PALETTE.amber)}
          >
            いつか
          </button>
        </div>
        <div style={{ fontSize: 11, color: PALETTE.inkSoft, lineHeight: 1.6 }}>
          今日だけ＝1回。まいにち＝つづけたい。いつか＝心にとめておきたい。
        </div>
        <button
          onClick={onCancel}
          style={{
            marginTop: 2,
            border: 'none',
            background: 'transparent',
            color: PALETTE.inkSoft,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
            padding: '6px 0 0',
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

function dialogBtn(enabled: boolean, color: string) {
  return {
    flex: 1,
    height: 40,
    border: 'none',
    background: enabled ? color : PALETTE.sageSoft,
    color: enabled ? '#fff' : PALETTE.inkSoft,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: ROUNDED_FONT,
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.7,
  } as const;
}
