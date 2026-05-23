import { PALETTE, CARD_SHADOW } from '../theme';
import { REGIONS, pressureCare } from '../data/regions';
import type { RegionId } from '../data/types';

interface WeatherWidgetProps {
  regionId?: RegionId;
  onOpenSettings?: () => void;
}

export function WeatherWidget({
  regionId = 'tokyo',
  onOpenSettings,
}: WeatherWidgetProps) {
  const r = REGIONS[regionId] || REGIONS.tokyo;
  const care = pressureCare(r.pressure, r.trend);

  const pct = Math.max(0, Math.min(100, ((r.pressure - 980) / 50) * 100));
  const standardPct = ((1013 - 980) / 50) * 100;

  const trendSymbol = r.trend === 'up' ? '↑' : r.trend === 'down' ? '↓' : '→';
  const trendLabel = r.trend === 'up' ? '上昇' : r.trend === 'down' ? '下降' : '安定';

  const careBg =
    care.tone === 'warn' ? '#FAE3D8'
      : care.tone === 'good' ? PALETTE.sageSoft
      : PALETTE.amberSoft;
  const careFg =
    care.tone === 'warn' ? '#A86A4A'
      : care.tone === 'good' ? PALETTE.sageDeep
      : '#A88458';

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 18,
        boxShadow: CARD_SHADOW,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: PALETTE.sageSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
          }}
        >
          {r.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{r.temp}°</div>
            <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>{r.cond}</div>
          </div>
          <div style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 1 }}>
            📍 {r.label} · きょう
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          style={{
            border: 'none',
            background: 'transparent',
            color: PALETTE.inkSoft,
            fontSize: 16,
            cursor: 'pointer',
            padding: 4,
          }}
          aria-label="地域を変える"
        >
          ⚙
        </button>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <div style={{ fontSize: 10, color: PALETTE.inkSoft, fontWeight: 600 }}>
            気圧{' '}
            <span style={{ marginLeft: 4, color: PALETTE.ink, fontWeight: 700 }}>
              {r.pressure}
              <span style={{ fontSize: 9, color: PALETTE.inkSoft, fontWeight: 500 }}>
                {' '}
                hPa
              </span>
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color:
                r.trend === 'down'
                  ? '#C68A6A'
                  : r.trend === 'up'
                  ? PALETTE.sageDeep
                  : PALETTE.inkSoft,
            }}
          >
            {trendSymbol} {trendLabel}
          </div>
        </div>
        <div
          style={{
            height: 6,
            background: PALETTE.sageSoft,
            borderRadius: 999,
            position: 'relative',
            overflow: 'visible',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${standardPct}%`,
              top: -2,
              bottom: -2,
              width: 1,
              background: 'rgba(95,106,92,0.25)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${pct}%`,
              background: r.pressure < 1005 ? '#E0A487' : PALETTE.sageDeep,
              borderRadius: 999,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `calc(${pct}% - 6px)`,
              top: -3,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#fff',
              border: `2px solid ${
                r.pressure < 1005 ? '#E0A487' : PALETTE.sageDeep
              }`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          />
        </div>
      </div>

      <div
        style={{
          background: careBg,
          color: careFg,
          borderRadius: 10,
          padding: '6px 10px',
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1.5,
        }}
      >
        {care.msg}
      </div>
    </div>
  );
}
