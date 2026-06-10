import { useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import type { Schedule } from '../../data/types';
import {
  isRoutineActiveOn,
  type Routine,
  type RoutineLog,
} from '../../data/routines';
import { computeRoutineStreak } from '../../data/routineStreak';
import { pillBtn } from './styles';
import { RoutineEditPanel } from './RoutineEditPanel';

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

export function RoutineCard({
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
