import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import type { ConcernGoal } from '../../data/care';
import { pillBtn } from './styles';

// ④ いつかやってみたいこと。
interface ConcernSectionProps {
  concerns: ConcernGoal[];
  confirmDeleteId: string | null;
  onAskDelete: (id: string | null) => void;
  onDelete: (id: string) => void;
  onToOneoff: (c: ConcernGoal) => void;
  onToRoutine: (c: ConcernGoal) => void;
}

export function ConcernSection({
  concerns,
  confirmDeleteId,
  onAskDelete,
  onDelete,
  onToOneoff,
  onToRoutine,
}: ConcernSectionProps) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>
        ✨ いつかやってみたいこと
      </div>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          marginTop: 2,
          marginBottom: 10,
        }}
      >
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
