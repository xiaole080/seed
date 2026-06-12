import { PALETTE, ROUNDED_FONT } from '../../theme';

interface OffActionsProps {
  officeClosed: boolean;
  onBack?: () => void;
  onAttend: () => void;
}

// T6: 予定が休みの日の 2 択 (お休みのまま / やっぱり通所する)。
export function OffActions({ officeClosed, onBack, onAttend }: OffActionsProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flexShrink: 0,
      }}
    >
      {/* T6 メイン: お休みのままにする (ホームへ戻る) */}
      <button
        onClick={onBack}
        style={{
          width: '100%',
          height: 56,
          border: 'none',
          borderRadius: 18,
          background: PALETTE.sageDeep,
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
          fontFamily: ROUNDED_FONT,
          boxShadow: '0 6px 16px rgba(127,169,130,0.32)',
          cursor: 'pointer',
        }}
      >
        お休みのままにする
      </button>
      {/* T4-A: サブ「やっぱり通所する」(effectiveMode=office に切替)。
          バグ① 修正: 事務所休業日は本ボタンも disabled にする (打刻不可)。 */}
      <button
        onClick={onAttend}
        disabled={officeClosed}
        aria-disabled={officeClosed || undefined}
        style={{
          width: '100%',
          height: 48,
          border: `1.5px solid ${PALETTE.sage}`,
          borderRadius: 16,
          background: '#fff',
          color: officeClosed ? PALETTE.inkSoft : PALETTE.sageDeep,
          fontSize: 13,
          fontWeight: 700,
          fontFamily: ROUNDED_FONT,
          cursor: officeClosed ? 'not-allowed' : 'pointer',
          opacity: officeClosed ? 0.7 : 1,
        }}
      >
        やっぱり通所する
      </button>
    </div>
  );
}
