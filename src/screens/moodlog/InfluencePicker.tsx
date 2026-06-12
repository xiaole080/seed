import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import { PRIMARY_INFLUENCES } from '../../data/moods';
import type { PrimaryInfluence } from '../../data/types';
import { OtherTextField } from './OtherTextField';

// Q2: 影響していそうなこと (§2.4)。複数選択 + 「その他」自由入力 (T9)。
export function InfluencePicker({
  influences,
  onToggle,
  influenceOtherText,
  onChangeOtherText,
}: {
  influences: Set<PrimaryInfluence>;
  onToggle: (id: PrimaryInfluence) => void;
  influenceOtherText: string;
  onChangeOtherText: (v: string) => void;
}) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          background: '#fff',
          borderRadius: 18,
          padding: 12,
          boxShadow: CARD_SHADOW,
        }}
      >
        {PRIMARY_INFLUENCES.map((inf) => {
          const isSel = influences.has(inf.id);
          return (
            <button
              key={inf.id}
              onClick={() => onToggle(inf.id)}
              style={{
                border: 'none',
                cursor: 'pointer',
                background: isSel ? PALETTE.sageDeep : PALETTE.sageSoft,
                color: isSel ? '#fff' : PALETTE.ink,
                padding: '7px 11px',
                borderRadius: 12,
                fontSize: 12,
                fontFamily: ROUNDED_FONT,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all .12s',
              }}
            >
              <span style={{ fontSize: 13 }}>{inf.icon}</span>
              <span>{inf.label}</span>
            </button>
          );
        })}
      </div>

      {/* T9: 影響要因「その他」を選んだ時だけ自由入力欄を出す。端末ローカル限定。 */}
      {influences.has('other') && (
        <OtherTextField
          value={influenceOtherText}
          onChange={onChangeOtherText}
          placeholder="例: 朝の電車が混んでいて疲れた"
        />
      )}
    </>
  );
}
