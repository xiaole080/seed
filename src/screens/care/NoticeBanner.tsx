import { PALETTE, CARD_SHADOW } from '../../theme';

// 初回お知らせバナー。『まいにちのリズム』追加の案内。
export function NoticeBanner({ onDismiss }: { onDismiss: () => void }) {
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
      <div
        style={{ flex: 1, fontSize: 12, lineHeight: 1.6, color: PALETTE.ink }}
      >
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
