import { useEffect, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { DEFAULT_RECORD_IDS, RECORD_PRESETS } from '../data/records';
import type { RecordPreset } from '../data/types';

interface RecordItemsManagerProps {
  /** ON にする項目ID。制御コンポーネントとして使う場合は親で管理する。 */
  initialIds?: string[];
  /** カスタム項目。親で管理する場合に渡す。 */
  customs?: RecordPreset[];
  /**
   * ON/OFF やカスタム追加・削除が起こったたびに親へ通知する。
   * 渡されない場合は内部 state のみで動く (後方互換)。
   */
  onChange?: (ids: string[], customs: RecordPreset[]) => void;
}

export function RecordItemsManager({
  initialIds = DEFAULT_RECORD_IDS,
  customs: initCustoms = [],
  onChange,
}: RecordItemsManagerProps) {
  const [ids, setIds] = useState<Set<string>>(() => new Set(initialIds));
  const [customs, setCustoms] = useState<RecordPreset[]>(initCustoms);
  const [draft, setDraft] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  // 親が initialIds / customs を切り替えたら追従 (制御化パスのみ更新する)
  useEffect(() => {
    setIds(new Set(initialIds));
    // initialIds の参照変化のみをトリガにする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIds.join('|')]);

  const allItems: RecordPreset[] = [...RECORD_PRESETS, ...customs];

  // ids/customs の変更を親に伝える。Set は配列化して通知。
  const notify = (nextIds: Set<string>, nextCustoms: RecordPreset[]) => {
    onChange?.(Array.from(nextIds), nextCustoms);
  };

  const toggle = (it: RecordPreset) => {
    if (it.required) return;
    setIds((prev) => {
      const n = new Set(prev);
      if (n.has(it.id)) n.delete(it.id);
      else n.add(it.id);
      notify(n, customs);
      return n;
    });
  };

  const removeCustom = (id: string) => {
    setCustoms((prev) => {
      const nextCustoms = prev.filter((c) => c.id !== id);
      setIds((prevIds) => {
        const n = new Set(prevIds);
        n.delete(id);
        notify(n, nextCustoms);
        return n;
      });
      return nextCustoms;
    });
  };

  const addCustom = () => {
    const v = draft.trim();
    if (!v) return;
    const id = 'c_' + Date.now();
    const newItem: RecordPreset = { id, label: v, icon: '✨' };
    setCustoms((prev) => {
      const nextCustoms = [...prev, newItem];
      setIds((prevIds) => {
        const n = new Set([...prevIds, id]);
        notify(n, nextCustoms);
        return n;
      });
      return nextCustoms;
    });
    setDraft('');
    setShowAdd(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {allItems.map((it) => {
        const on = ids.has(it.id);
        const isCustom = it.id.startsWith('c_');
        return (
          <div
            key={it.id}
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: '10px 12px',
              boxShadow: CARD_SHADOW,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: on ? 1 : 0.5,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: on ? PALETTE.sageDeep : PALETTE.sageSoft,
                color: on ? '#fff' : PALETTE.ink,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {it.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {it.label}
                {isCustom && (
                  <span
                    style={{
                      fontSize: 9,
                      color: PALETTE.sageDeep,
                      marginLeft: 6,
                      fontWeight: 600,
                    }}
                  >
                    自分で追加
                  </span>
                )}
                {it.required && (
                  <span
                    style={{
                      fontSize: 9,
                      color: PALETTE.inkSoft,
                      marginLeft: 6,
                      fontWeight: 500,
                    }}
                  >
                    必須
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 1 }}>
                {it.hint || (isCustom ? 'カスタム項目' : '')}
              </div>
            </div>
            {isCustom && (
              <button
                onClick={() => removeCustom(it.id)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: PALETTE.inkSoft,
                  fontSize: 14,
                  cursor: 'pointer',
                  padding: 4,
                }}
                aria-label="削除"
              >
                ×
              </button>
            )}
            <button
              onClick={() => toggle(it)}
              disabled={it.required}
              style={{
                width: 38,
                height: 22,
                borderRadius: 999,
                border: 'none',
                background: on ? PALETTE.sageDeep : PALETTE.sageSoft,
                position: 'relative',
                cursor: it.required ? 'default' : 'pointer',
                flexShrink: 0,
                opacity: it.required ? 0.5 : 1,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  left: on ? 18 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left .15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}
              />
            </button>
          </div>
        );
      })}

      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            border: `1.5px dashed ${PALETTE.sage}`,
            background: 'transparent',
            borderRadius: 14,
            padding: 12,
            color: PALETTE.sageDeep,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>＋</span>
          <span>記録したい項目を追加</span>
        </button>
      ) : (
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: '10px 12px',
            boxShadow: CARD_SHADOW,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>✨</span>
          <input
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="例: 集中力 / 推し活 / 日光浴"
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
            onClick={() => {
              setShowAdd(false);
              setDraft('');
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: PALETTE.inkSoft,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: ROUNDED_FONT,
              cursor: 'pointer',
              padding: '6px 8px',
            }}
          >
            キャンセル
          </button>
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
      )}
    </div>
  );
}
