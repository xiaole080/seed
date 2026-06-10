import { useState } from 'react';
import { PALETTE, ROUNDED_FONT } from '../../theme';

// FAB (サッと追加ボタン) と、3 択ダイアログ。
export function FloatingAddButton({ onClick }: { onClick: () => void }) {
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

export function FabDialog({ onCancel, onAdd }: FabDialogProps) {
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
