import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import { MONTH_NAV_COPY } from '../../data/historyCopy';

// 月ナビゲーションヘッダー (history-month-nav-spec T5)。
//  - 「← / 2026年6月 / →」。矢印のタップ領域は 44×44px 以上。
//  - 境界では disabled (非表示にしない。「端まで来た」ことの明示のため)。
export function MonthNavHeader({
  label,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: {
  label: string;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        background: '#fff',
        borderRadius: 14,
        padding: 4,
        boxShadow: CARD_SHADOW,
        marginBottom: 12,
      }}
    >
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label={MONTH_NAV_COPY.prevMonth}
        style={arrowBtnStyle(canGoPrev)}
      >
        ‹
      </button>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: PALETTE.ink,
          fontFamily: ROUNDED_FONT,
        }}
      >
        {label}
      </div>
      <button
        onClick={onNext}
        disabled={!canGoNext}
        aria-label={MONTH_NAV_COPY.nextMonth}
        style={arrowBtnStyle(canGoNext)}
      >
        ›
      </button>
    </div>
  );
}

function arrowBtnStyle(enabled: boolean): React.CSSProperties {
  return {
    // タップ領域 44×44px 以上 (§2.3)
    width: 44,
    height: 44,
    border: 'none',
    background: PALETTE.sageSoft,
    color: PALETTE.sageDeep,
    borderRadius: 12,
    fontSize: 18,
    fontWeight: 700,
    fontFamily: ROUNDED_FONT,
    cursor: enabled ? 'pointer' : 'default',
    flexShrink: 0,
    // 境界では薄く表示する (非表示にしない)
    opacity: enabled ? 1 : 0.35,
  };
}
