import { useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import {
  buildExportEnvelope,
  downloadJson,
  exportFilename,
} from '../../data/jsonExport';

// ── JSON 全データエクスポート (Phase 2d) ────────────────────
// プライバシー方針:
//  - 本人操作・本人端末内の処理のみ。fetch は使わない。
//  - 自由記述・その他欄を含む。共有先には注意を促す。
//  - 外部送信ではないことを補足文で明示する。
//  - P-2 対応: 誤タップ防止のためインラインの確認ステップを挟む。
export function JsonExportCard() {
  const [confirming, setConfirming] = useState(false);

  const doExport = () => {
    const envelope = buildExportEnvelope();
    downloadJson(exportFilename(), envelope);
    setConfirming(false);
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
        <div style={{ fontSize: 20 }}>💾</div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
          データを書き出す（JSON）
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          lineHeight: 1.7,
        }}
      >
        端末にある記録すべて（自由記述・その他欄を含む）を1つのファイルとして書き出します。
        <br />
        あなたの端末で書き出します。外には送られません。
        <br />
        共有するときは、内容に個人情報が含まれていないか確認してください。
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          style={{
            marginTop: 12,
            width: '100%',
            minHeight: 44,
            border: `1.5px solid ${PALETTE.sage}`,
            background: PALETTE.sageSoft,
            color: PALETTE.sageDeep,
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
          }}
        >
          書き出す (JSON)
        </button>
      ) : (
        <div
          style={{
            marginTop: 12,
            background: PALETTE.creamSoft,
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
            自由記述・その他欄を含むすべての記録を1ファイルにまとめます。
            <br />
            共有先にご注意ください。
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
              キャンセル
            </button>
            <button
              onClick={doExport}
              style={{
                flex: 1.4,
                border: 'none',
                background: PALETTE.sageDeep,
                color: '#fff',
                borderRadius: 10,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              書き出す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
