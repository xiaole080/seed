import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { REGIONS } from '../data/regions';
import type { RegionId, SelectedRegion } from '../data/types';

interface RegionPickerProps {
  value?: SelectedRegion;
  onChange?: (next: SelectedRegion) => void;
  /** 「他の地域を探す」ボタン押下時の遷移ハンドラ。 */
  onSearchMore?: () => void;
}

export function RegionPicker({
  value,
  onChange,
  onSearchMore,
}: RegionPickerProps) {
  const selectedPreset: RegionId | null =
    value && value.kind === 'preset' ? value.presetId : null;
  const customLabel: string | null =
    value && value.kind === 'custom' ? value.name : null;

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

      {customLabel && (
        <div
          style={{
            fontSize: 12,
            color: PALETTE.sageDeep,
            background: PALETTE.sageSoft,
            padding: '6px 10px',
            borderRadius: 10,
            marginBottom: 10,
            fontWeight: 700,
          }}
        >
          📌 {customLabel}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
        }}
      >
        {(Object.entries(REGIONS) as [RegionId, typeof REGIONS[RegionId]][]).map(
          ([id, r]) => {
            const sel = id === selectedPreset;
            return (
              <button
                key={id}
                onClick={() => onChange?.({ kind: 'preset', presetId: id })}
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

      {onSearchMore && (
        <button
          onClick={onSearchMore}
          style={{
            marginTop: 10,
            width: '100%',
            border: `1px dashed ${PALETTE.sage}`,
            background: 'transparent',
            color: PALETTE.sageDeep,
            padding: '8px 10px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
          }}
        >
          他の地域を探す →
        </button>
      )}
    </div>
  );
}
