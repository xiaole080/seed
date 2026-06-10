import { useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import { deleteAllLocalData } from '../../data/store';

// ── データを消す (A6) ────────────────────────────────────────
//  - 端末のデータは即時削除できる
//  - 外部に送ったぶんは「アプリ外で」連絡してもらう旨を明示
export function DataDeleteCard({
  onAllDataDeleted,
}: {
  onAllDataDeleted?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const doDelete = () => {
    deleteAllLocalData();
    setConfirming(false);
    onAllDataDeleted?.();
  };

  return (
    <div
      style={{
        marginTop: 18,
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: CARD_SHADOW,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 20 }}>🗑️</div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
          データを消す
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          lineHeight: 1.7,
        }}
      >
        この端末にあるすべての記録 (きもち・通所打刻・自由記述・設定)
        を消します。元に戻せません。
        <br />
        外部に送られたぶんは、配布者に「データを消してほしい」と
        伝えてもらえれば消してもらえます。
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          style={{
            marginTop: 12,
            width: '100%',
            border: `1.5px solid ${PALETTE.amber}`,
            background: '#fff',
            color: PALETTE.amber,
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
          }}
        >
          端末のデータを消す
        </button>
      ) : (
        <div
          style={{
            marginTop: 12,
            background: PALETTE.amberSoft,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: PALETTE.ink,
              lineHeight: 1.6,
              marginBottom: 10,
            }}
          >
            ほんとうに、ぜんぶ消しますか？
            <br />
            元に戻すことはできません。
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setConfirming(false)}
              style={{
                flex: 1,
                border: 'none',
                background: '#fff',
                color: PALETTE.inkSoft,
                borderRadius: 10,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              やめる
            </button>
            <button
              onClick={doDelete}
              style={{
                flex: 1.4,
                border: 'none',
                background: PALETTE.amber,
                color: '#fff',
                borderRadius: 10,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              はい、消します
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
