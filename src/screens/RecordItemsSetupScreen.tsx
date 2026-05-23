import { useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { DEFAULT_RECORD_IDS, RECORD_PRESETS } from '../data/records';
import type { RecordPreset } from '../data/types';

interface RecordItemsSetupScreenProps {
  initialIds?: string[];
  onSave?: (ids: string[], customs: RecordPreset[]) => void;
  onSkip?: () => void;
  label?: string;
}

export function RecordItemsSetupScreen({
  initialIds = DEFAULT_RECORD_IDS,
  onSave,
  onSkip,
  label = '01c 記録項目',
}: RecordItemsSetupScreenProps) {
  const [ids, setIds] = useState<Set<string>>(() => new Set(initialIds));
  const [customs, setCustoms] = useState<RecordPreset[]>([]);
  const [draft, setDraft] = useState('');

  const toggle = (preset: RecordPreset) => {
    if (preset.required) return;
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(preset.id)) next.delete(preset.id);
      else next.add(preset.id);
      return next;
    });
  };

  const addCustom = () => {
    const v = draft.trim();
    if (!v) return;
    const id = 'c_' + Date.now();
    setCustoms((prev) => [...prev, { id, label: v, icon: '✨' }]);
    setIds((prev) => new Set([...prev, id]));
    setDraft('');
  };

  const allItems: RecordPreset[] = [...RECORD_PRESETS, ...customs];

  return (
    <PhoneShell bg={PALETTE.cream} label={label}>
      <BackgroundLeaves />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '4px 22px 24px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
        }}
      >
        <div style={{ marginTop: 14, marginBottom: 4 }}>
          <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginBottom: 4 }}>
            ステップ 4 / 4
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4 }}>
            なにを記録
            <br />
            しておきますか？
          </div>
          <div
            style={{
              fontSize: 12,
              color: PALETTE.inkSoft,
              marginTop: 8,
              lineHeight: 1.7,
            }}
          >
            えらんだものが「気分を記録」画面に出ます。
            <br />
            あとから「じぶん」でも 増やせます。
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 11,
            color: PALETTE.inkSoft,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          おすすめ
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {allItems.map((p) => {
            const sel = ids.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p)}
                disabled={p.required}
                style={{
                  border: 'none',
                  cursor: p.required ? 'default' : 'pointer',
                  background: sel ? '#fff' : 'rgba(255,255,255,0.5)',
                  borderRadius: 14,
                  padding: '12px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                  fontFamily: ROUNDED_FONT,
                  boxShadow: sel ? CARD_SHADOW : 'none',
                  outline: sel
                    ? `1.5px solid ${PALETTE.sageDeep}`
                    : '1.5px solid transparent',
                  transition: 'all .12s',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: sel ? PALETTE.sageDeep : PALETTE.sageSoft,
                    color: sel ? '#fff' : PALETTE.ink,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {p.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: PALETTE.ink,
                    }}
                  >
                    {p.label}
                    {p.required && (
                      <span
                        style={{
                          fontSize: 9,
                          color: PALETTE.inkSoft,
                          marginLeft: 4,
                          fontWeight: 500,
                        }}
                      >
                        必須
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: PALETTE.inkSoft,
                      marginTop: 1,
                    }}
                  >
                    {p.hint || ''}
                  </div>
                </div>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: sel ? PALETTE.sageDeep : 'transparent',
                    border: sel ? 'none' : `1.5px solid ${PALETTE.sage}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {sel ? '✓' : ''}
                </div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 11,
            color: PALETTE.inkSoft,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          自分で追加
        </div>
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            boxShadow: CARD_SHADOW,
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>✨</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="例: 推しの活動 / お風呂 / 日光浴"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 13,
              fontFamily: ROUNDED_FONT,
              color: PALETTE.ink,
              background: 'transparent',
            }}
          />
          <button
            onClick={addCustom}
            style={{
              border: 'none',
              background: draft.trim() ? PALETTE.sageDeep : PALETTE.sageSoft,
              color: draft.trim() ? '#fff' : PALETTE.inkSoft,
              padding: '6px 12px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              cursor: draft.trim() ? 'pointer' : 'default',
            }}
          >
            追加
          </button>
        </div>

        <button
          onClick={() => onSave?.(Array.from(ids), customs)}
          style={{
            marginTop: 18,
            width: '100%',
            height: 56,
            border: 'none',
            borderRadius: 20,
            background: PALETTE.sageDeep,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            boxShadow: '0 6px 16px rgba(127,169,130,0.32)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          この内容ではじめる（{ids.size}項目）
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            style={{
              marginTop: 12,
              border: 'none',
              background: 'transparent',
              color: PALETTE.inkSoft,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: ROUNDED_FONT,
              cursor: 'pointer',
              padding: '8px 12px',
              alignSelf: 'center',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            あとで設定する
          </button>
        )}

        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            color: PALETTE.inkSoft,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          えらばなくても OK。
          <br />
          毎日の記録時にも スキップできます。
        </div>
      </div>
    </PhoneShell>
  );
}
