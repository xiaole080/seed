import { PALETTE, ROUNDED_FONT } from '../../theme';

// Q3: もっと記録する？ (§2.2 トグル)。
export function MoreToggle({
  showMore,
  onToggle,
}: {
  showMore: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ marginTop: 22 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          border: `1.5px ${showMore ? 'solid' : 'dashed'} ${
            showMore ? PALETTE.sageDeep : PALETTE.sage
          }`,
          background: showMore ? PALETTE.sageSoft : 'transparent',
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          fontFamily: ROUNDED_FONT,
          color: PALETTE.ink,
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: showMore ? PALETTE.sageDeep : PALETTE.sageSoft,
            color: showMore ? '#fff' : PALETTE.sageDeep,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {showMore ? '−' : '＋'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>もっと記録する？</div>
          <div
            style={{
              fontSize: 11,
              color: PALETTE.inkSoft,
              marginTop: 2,
            }}
          >
            睡眠・食事・運動・体調・服薬を任意で記録できます
          </div>
        </div>
      </button>
    </div>
  );
}
