import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';

// ニックネーム編集カード。値は親へ即時通知する。
export function NicknameCard({
  nick,
  onChange,
}: {
  nick: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 18,
        padding: '14px 16px',
        boxShadow: CARD_SHADOW,
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 35%, #fff, ${PALETTE.sageSoft})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          flexShrink: 0,
        }}
      >
        🐥
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>ニックネーム</div>
        <input
          value={nick}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            fontSize: 17,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            color: PALETTE.ink,
            padding: '2px 0',
            outline: 'none',
            borderBottom: `1px dashed ${PALETTE.sage}`,
          }}
        />
      </div>
    </div>
  );
}
