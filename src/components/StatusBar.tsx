import { PALETTE } from '../theme';

export function StatusBar() {
  return (
    <div
      style={{
        height: 44,
        padding: '0 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 13,
        fontWeight: 600,
        color: PALETTE.ink,
        flexShrink: 0,
      }}
    >
      <span>9:41</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <span style={{ fontSize: 11 }}>●●●●</span>
        <span style={{ fontSize: 11 }}>📶</span>
        <span
          style={{
            width: 22,
            height: 11,
            border: `1.2px solid ${PALETTE.ink}`,
            borderRadius: 3,
            position: 'relative',
            display: 'inline-block',
          }}
        >
          <span
            style={{
              position: 'absolute',
              inset: 1.5,
              width: '70%',
              background: PALETTE.ink,
              borderRadius: 1.5,
            }}
          />
        </span>
      </div>
    </div>
  );
}
