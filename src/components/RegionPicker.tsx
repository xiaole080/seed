import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { REGIONS } from '../data/regions';
import type { RegionId } from '../data/types';

interface RegionPickerProps {
  value?: RegionId;
  onChange?: (id: RegionId) => void;
}

export function RegionPicker({ value = 'tokyo', onChange }: RegionPickerProps) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: CARD_SHADOW,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>📍</span>
        <div style={{ fontSize: 13, fontWeight: 700 }}>地域</div>
        <div
          style={{
            fontSize: 10,
            color: PALETTE.inkSoft,
            marginLeft: 'auto',
          }}
        >
          天気・気圧の表示
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
        }}
      >
        {(Object.entries(REGIONS) as [RegionId, typeof REGIONS[RegionId]][]).map(
          ([id, r]) => {
            const sel = id === value;
            return (
              <button
                key={id}
                onClick={() => onChange?.(id)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  background: sel ? PALETTE.sageDeep : PALETTE.sageSoft,
                  color: sel ? '#fff' : PALETTE.ink,
                  padding: '8px 4px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontFamily: ROUNDED_FONT,
                  fontWeight: sel ? 700 : 600,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'all .12s',
                }}
              >
                <span style={{ fontSize: 14 }}>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}
