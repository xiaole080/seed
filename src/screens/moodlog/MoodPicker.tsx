import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import { MOODS } from '../../data/moods';
import type { Mood } from '../../data/types';

// Q1: 気分 (§2.3)。5 段階の顔ボタン。
export function MoodPicker({
  mood,
  onPick,
}: {
  mood: Mood;
  onPick: (m: Mood) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        background: '#fff',
        borderRadius: 22,
        padding: '14px 8px',
        boxShadow: CARD_SHADOW,
      }}
    >
      {MOODS.map((m) => {
        const selected = m.v === mood;
        return (
          <button
            key={m.v}
            onClick={() => onPick(m.v)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              padding: '6px 0',
              fontFamily: ROUNDED_FONT,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: selected ? PALETTE.sageDeep : PALETTE.sageSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                transition: 'all .2s',
                transform: selected ? 'scale(1.08)' : 'scale(1)',
                boxShadow: selected
                  ? '0 4px 12px rgba(127,169,130,0.4)'
                  : 'none',
              }}
            >
              {m.face}
            </div>
            <span
              style={{
                fontSize: 9,
                color: selected ? PALETTE.sageDeep : PALETTE.inkSoft,
                fontWeight: selected ? 700 : 500,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
