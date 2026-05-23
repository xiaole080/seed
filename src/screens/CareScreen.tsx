import { useEffect, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { BottomTabs, type TabId } from '../components/BottomTabs';
import {
  addConcernGoal,
  addSmallGoal,
  deleteConcernGoal,
  deleteSmallGoal,
  getSmallGoalsForDate,
  loadCareGoals,
  updateSmallGoal,
  type ConcernGoal,
  type SmallGoal,
} from '../data/care';
import { todayISO } from '../data/store';
import { MILESTONES, getMilestone } from '../data/stages';
import { logTask } from '../api/sheets';
import type { Milestone } from '../data/types';

interface CareScreenProps {
  totalDays?: number;
  eggName?: string;
  nickname?: string;
  onTab?: (t: TabId) => void;
}

export function CareScreen({
  totalDays = 12,
  eggName = '',
  nickname,
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

  // 今日付の小さな目標だけを表示する (仕様 §5.1 翌日リセット)
  const today = todayISO();
  const [tasks, setTasks] = useState<SmallGoal[]>(() => getSmallGoalsForDate(today));
  const [concerns, setConcerns] = useState<ConcernGoal[]>(() => loadCareGoals().concernGoals);
  const [seeds, setSeeds] = useState(() =>
    getSmallGoalsForDate(today).reduce((acc, t) => acc + (t.done ? 1 : 0), 0),
  );
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [recentReward, setRecentReward] = useState<{
    id: string;
    amount: number;
  } | null>(null);
  // 削除確認用 (誤操作防止のインライン確認)
  const [confirmDeleteSmall, setConfirmDeleteSmall] = useState<string | null>(null);
  const [confirmDeleteConcern, setConfirmDeleteConcern] = useState<string | null>(null);

  // 気になる目標の追加用
  const [concernDraft, setConcernDraft] = useState('');

  // 日付が変わったら自動で「今日の小さな目標」だけを表示する
  useEffect(() => {
    setTasks(getSmallGoalsForDate(today));
  }, [today]);

  const onToggle = (task: SmallGoal) => {
    const nextDone = !task.done;
    updateSmallGoal(task.id, { done: nextDone });
    setTasks((ts) =>
      ts.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t)),
    );
    if (nextDone) {
      const reward = 1;
      setSeeds((s) => s + reward);
      setRecentReward({ id: task.id, amount: reward });
      setTimeout(
        () => setRecentReward((r) => (r && r.id === task.id ? null : r)),
        1800,
      );
    } else {
      setSeeds((s) => Math.max(0, s - 1));
    }
    // 既存の logTask は impact 必須なので互換目的で basic として送信。
    // 自由文 (task.text) は外部送信しない (§13.1 #12-#13 / H1)。ID のみ送る。
    logTask(
      {
        taskId: task.id,
        impact: 'basic',
        done: nextDone,
      },
      nickname,
    );
  };

  const onAdd = () => {
    const created = addSmallGoal(draftName, today);
    if (!created) return;
    setTasks((ts) => [...ts, created]);
    setDraftName('');
    setAdding(false);
  };

  const onDelete = (id: string) => {
    deleteSmallGoal(id);
    setTasks((ts) => ts.filter((t) => t.id !== id));
    setConfirmDeleteSmall(null);
  };

  const onAddConcern = () => {
    const created = addConcernGoal(concernDraft);
    if (!created) return;
    setConcerns((cs) => [...cs, created]);
    setConcernDraft('');
  };

  const onDeleteConcern = (id: string) => {
    deleteConcernGoal(id);
    setConcerns((cs) => cs.filter((c) => c.id !== id));
    setConfirmDeleteConcern(null);
  };

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

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 22,
            marginBottom: 4,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700 }}>ちいさな目標</div>
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
        <div
          style={{
            fontSize: 11,
            color: PALETTE.inkSoft,
            lineHeight: 1.6,
            marginBottom: 10,
          }}
        >
          自分で目標を作って、達成したら たねがもらえます。
          <br />
          <span style={{ color: PALETTE.sageDeep, fontWeight: 700 }}>
            がんばった
          </span>{' '}
          目標は、たねが多めです。
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onToggle={() => onToggle(t)}
              onDelete={() => onDelete(t.id)}
              confirming={confirmDeleteSmall === t.id}
              onAskDelete={() => setConfirmDeleteSmall(t.id)}
              onCancelDelete={() => setConfirmDeleteSmall(null)}
              reward={
                recentReward && recentReward.id === t.id
                  ? recentReward.amount
                  : null
              }
            />
          ))}

          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              style={{
                marginTop: 2,
                border: `1.5px dashed ${PALETTE.sage}`,
                background: 'transparent',
                color: PALETTE.sageDeep,
                padding: '12px 14px',
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>＋</span>
              <span>目標を追加する</span>
            </button>
          ) : (
            <AddTaskForm
              name={draftName}
              setName={setDraftName}
              onCancel={() => {
                setAdding(false);
                setDraftName('');
              }}
              onAdd={onAdd}
            />
          )}
        </div>

        <div style={{ marginTop: 22, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>気になる目標</div>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>
            自分で気になることを追加できます
          </div>
        </div>
        {/* 入力欄 + 追加ボタン (T4) */}
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: '10px 12px',
            boxShadow: CARD_SHADOW,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>✨</span>
          <input
            value={concernDraft}
            onChange={(e) => setConcernDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddConcern()}
            placeholder="例: 朝ごはんを 一口"
            maxLength={40}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 13,
              fontFamily: ROUNDED_FONT,
              color: PALETTE.ink,
              background: 'transparent',
            }}
          />
          <button
            onClick={onAddConcern}
            disabled={!concernDraft.trim()}
            style={{
              border: 'none',
              background: concernDraft.trim() ? PALETTE.sageDeep : PALETTE.sageSoft,
              color: concernDraft.trim() ? '#fff' : PALETTE.inkSoft,
              padding: '6px 12px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              cursor: concernDraft.trim() ? 'pointer' : 'default',
            }}
          >
            追加
          </button>
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
              まだ気になる目標はありません。
            </div>
          )}
          {concerns.map((c) => (
            <ConcernRow
              key={c.id}
              concern={c}
              confirming={confirmDeleteConcern === c.id}
              onAskDelete={() => setConfirmDeleteConcern(c.id)}
              onCancelDelete={() => setConfirmDeleteConcern(null)}
              onDelete={() => onDeleteConcern(c.id)}
            />
          ))}
        </div>

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
        <div style={{ height: 8 }} />
      </div>
      <BottomTabs active="care" onChange={onTab} />
    </PhoneShell>
  );
}

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
    <div style={{ marginTop: 22 }}>
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

interface TaskRowProps {
  task: SmallGoal;
  onToggle: () => void;
  onDelete: () => void;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  reward: number | null;
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  confirming,
  onAskDelete,
  onCancelDelete,
  reward,
}: TaskRowProps) {
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
        }}
      >
        {task.text}
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

      {/* 削除確認 (誤操作防止のインライン確認ブロック) */}
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
            この目標を消しますか？
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={onCancelDelete}
              style={{
                border: 'none',
                background: PALETTE.sageSoft,
                color: PALETTE.inkSoft,
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              やめる
            </button>
            <button
              onClick={onDelete}
              style={{
                border: 'none',
                background: PALETTE.amber,
                color: '#fff',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
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

interface AddTaskFormProps {
  name: string;
  setName: (v: string) => void;
  onCancel: () => void;
  onAdd: () => void;
}

function AddTaskForm({ name, setName, onCancel, onAdd }: AddTaskFormProps) {
  const canAdd = name.trim().length > 0;
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '12px 14px 14px',
        boxShadow: CARD_SHADOW,
        border: `1.5px solid ${PALETTE.sage}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && canAdd && onAdd()}
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

      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            height: 40,
            border: 'none',
            background: PALETTE.sageSoft,
            color: PALETTE.inkSoft,
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
          }}
        >
          キャンセル
        </button>
        <button
          onClick={onAdd}
          disabled={!canAdd}
          style={{
            flex: 1,
            height: 40,
            border: 'none',
            background: canAdd ? PALETTE.sageDeep : PALETTE.sage,
            color: '#fff',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: canAdd ? 'pointer' : 'not-allowed',
            opacity: canAdd ? 1 : 0.6,
            boxShadow: canAdd
              ? '0 4px 12px rgba(127,169,130,0.32)'
              : 'none',
          }}
        >
          追加する
        </button>
      </div>
    </div>
  );
}

// ── 気になる目標の1行 ───────────────────────────────────────
interface ConcernRowProps {
  concern: ConcernGoal;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}

function ConcernRow({
  concern,
  confirming,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: ConcernRowProps) {
  return (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: CARD_SHADOW,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: `1.5px dashed ${PALETTE.sage}`,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: PALETTE.sageSoft,
          fontSize: 18,
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
      <button
        onClick={onAskDelete}
        aria-label="削除"
        style={{
          border: 'none',
          background: 'transparent',
          color: PALETTE.inkSoft,
          fontSize: 16,
          cursor: 'pointer',
          padding: 4,
        }}
      >
        ×
      </button>

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
            この目標を消しますか？
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={onCancelDelete}
              style={{
                border: 'none',
                background: PALETTE.sageSoft,
                color: PALETTE.inkSoft,
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              やめる
            </button>
            <button
              onClick={onDelete}
              style={{
                border: 'none',
                background: PALETTE.amber,
                color: '#fff',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              消す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
