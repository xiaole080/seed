import { PALETTE, CARD_SHADOW } from '../theme';
import { pressureCare } from '../data/regions';
import type { WeatherState } from './useWeather';
import type { ConsentState } from '../data/types';

interface WeatherWidgetProps {
  /** useWeather から渡される現在状態。未指定なら案内のみ表示。 */
  weather?: WeatherState;
  /** 同意状態。未指定なら 'notAsked' 扱い。 */
  consent?: ConsentState['weatherApiConsent'];
  /** 「天気を有効にする」ボタン。じぶん画面へ遷移など。 */
  onEnableWeather?: () => void;
  onOpenSettings?: () => void;
}

const ATTRIBUTION = 'Powered by Open-Meteo';

export function WeatherWidget({
  weather,
  consent = 'notAsked',
  onEnableWeather,
  onOpenSettings,
}: WeatherWidgetProps) {
  // 同意していない / state なし → 案内パネル
  if (!weather || weather.kind === 'optedOut' || consent !== 'accepted') {
    return (
      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: PALETTE.sageSoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            ☁️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              天気の表示はオフです
            </div>
            <div style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 2 }}>
              区市町村レベルの天気を表示できます。
            </div>
          </div>
          {onEnableWeather && (
            <button
              onClick={onEnableWeather}
              style={{
                border: 'none',
                background: PALETTE.sageSoft,
                color: PALETTE.sageDeep,
                fontWeight: 700,
                fontSize: 11,
                padding: '6px 10px',
                borderRadius: 10,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              天気を有効にする →
            </button>
          )}
        </div>
        <Attribution />
      </Card>
    );
  }

  if (weather.kind === 'loading') {
    return (
      <Card>
        <div style={{ fontSize: 12, color: PALETTE.inkSoft, padding: '4px 0' }}>
          天気を読み込み中…
        </div>
        <Attribution />
      </Card>
    );
  }

  if (weather.kind === 'error') {
    const msg =
      weather.errorKind === 'invalidResponse'
        ? '天気を取得できませんでした (応答が読めません)'
        : '天気を取得できませんでした (ネットワーク)';
    return (
      <Card>
        <div style={{ fontSize: 12, color: PALETTE.inkSoft, padding: '4px 0' }}>
          {msg}
        </div>
        <Attribution />
      </Card>
    );
  }

  // ready / offline
  const s = weather.snapshot!;
  const care = pressureCare(s.pressure, s.trend);
  const label = weather.label ?? '—';

  const pct = Math.max(0, Math.min(100, ((s.pressure - 980) / 50) * 100));
  const standardPct = ((1013 - 980) / 50) * 100;

  const trendSymbol = s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→';
  const trendLabel = s.trend === 'up' ? '上昇' : s.trend === 'down' ? '下降' : '安定';

  const careBg =
    care.tone === 'warn' ? '#FAE3D8'
      : care.tone === 'good' ? PALETTE.sageSoft
      : PALETTE.amberSoft;
  const careFg =
    care.tone === 'warn' ? '#A86A4A'
      : care.tone === 'good' ? PALETTE.sageDeep
      : '#A88458';

  return (
    <Card>
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
          {s.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {Math.round(s.temperature)}°
            </div>
            <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>{s.cond}</div>
          </div>
          <div style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 1 }}>
            📍 {label} · きょう
          </div>
        </div>
        {onOpenSettings && (
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
        )}
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
              {Math.round(s.pressure)}
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
                s.trend === 'down'
                  ? '#C68A6A'
                  : s.trend === 'up'
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
              background: s.pressure < 1005 ? '#E0A487' : PALETTE.sageDeep,
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
                s.pressure < 1005 ? '#E0A487' : PALETTE.sageDeep
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

      {weather.kind === 'offline' && (
        <div
          style={{
            fontSize: 10,
            color: '#A88458',
            background: PALETTE.amberSoft,
            borderRadius: 8,
            padding: '4px 8px',
            fontWeight: 600,
          }}
        >
          ⚠️ オフライン: 前回データを表示しています
        </div>
      )}

      <Attribution />
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
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
      {children}
    </div>
  );
}

function Attribution() {
  return (
    <div
      style={{
        fontSize: 9,
        color: PALETTE.inkSoft,
        opacity: 0.7,
        textAlign: 'right',
        marginTop: -2,
      }}
    >
      {ATTRIBUTION}
    </div>
  );
}
