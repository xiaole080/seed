import { PALETTE, CARD_SHADOW } from '../../theme';
import type { ConsentState } from '../../data/types';

// ── 天気APIの ON/OFF ────────────────────────────────────────
//
// 【外部送信あり】privacy-reviewer の確認対象。
//  - ON にすると Open-Meteo に区市町村レベルの緯度経度 (小数第2位) を送る。
//  - 健康データ・自由記述は送らない。
//  - OFF (declined) にしたらキャッシュも消す (親側で実施)。
export function WeatherConsentToggle({
  consent,
  onChange,
}: {
  consent: ConsentState['weatherApiConsent'];
  onChange: (next: ConsentState['weatherApiConsent']) => void;
}) {
  const on = consent === 'accepted';
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: CARD_SHADOW,
      }}
    >
      <label
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onChange(e.target.checked ? 'accepted' : 'declined')}
          style={{ marginTop: 4 }}
        />
        {/* T6-A (B 案): やわらかい日本語に統一。
            送信内容の最小性 (区市町村レベルのだいたいの位置のみ / 体調・自由記述は送らない)
            といつでもオフにできることを明示する。 */}
        <span style={{ fontSize: 13, lineHeight: 1.6, color: PALETTE.ink }}>
          <strong>天気と気圧を表示する</strong>
          <br />
          <span style={{ fontSize: 11, color: PALETTE.inkSoft }}>
            選んだ地域の天気を Open-Meteo
            から取り寄せます。送るのは区市町村レベルのだいたいの位置だけで、体調や自由記述は送りません。いつでもオフにできます。
          </span>
        </span>
      </label>
    </div>
  );
}
