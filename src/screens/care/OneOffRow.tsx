import { useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import type { OneOffTask } from '../../data/routines';
import { pillBtn } from './styles';

interface OneOffRowProps {
  task: OneOffTask;
  onToggle: () => void;
  onDelete: () => void;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  reward: number | null;
}

export function OneOffRow({
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
