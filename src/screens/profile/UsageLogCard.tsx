import { useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import {
  clearUsageLog,
  listUsageEvents,
  type UsageEvent,
  type UsageEventType,
} from '../../data/usageLog';
import { buildUsageLogCsv, summarizeUsage } from '../../data/usageLogStats';

// ── 利用ログカード (docs/usage-log-spec.md §4-T6) ────────────
// プライバシー方針:
//  - 表示するのはイベント種類と時刻のみ。記録の内容は構造的に含まれない。
//  - 自動送信なし。クリップボードへのコピーは「コピー」ボタンの
//    onClick ハンドラ内のみで行う (本人が一覧を確認したうえでの明示操作)。
//  - このカード自身の閲覧・コピー・削除操作はログに記録しない (決定事項 D-7)。
//  - 「ログを全削除」は既存カード同様の二段階確認 (誤操作防止)。

const TYPE_LABEL: Record<UsageEventType, string> = {
  app_open: 'アプリを開いた',
  record_open: '記録をはじめた',
  record_save: '記録を保存した',
  record_abandon: '記録を途中でやめた',
  history_open: 'きろくを見た',
};

/** 一覧に出す最大件数 (それ以上は「ほか n 件」とだけ表示)。 */
const LIST_LIMIT = 20;

function formatAt(at: string): string {
  const t = Date.parse(at);
  if (!Number.isFinite(t)) return at;
  const d = new Date(t);
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function UsageLogCard() {
  // 初回マウント時に読むだけ (閲覧自体をログに残さない: D-7)
  const [events, setEvents] = useState<UsageEvent[]>(() => listUsageEvents());
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [confirming, setConfirming] = useState(false);

  const summary = summarizeUsage(events);
  const newestFirst = [...events].reverse();
  const visible = newestFirst.slice(0, LIST_LIMIT);
  const hiddenCount = newestFirst.length - visible.length;

  const doCopy = async () => {
    // 外部送信ではない。本人の明示タップ時のみクリップボードに書く。
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard unavailable');
      }
      await navigator.clipboard.writeText(buildUsageLogCsv(events));
      setCopyStatus('ok');
    } catch {
      setCopyStatus('fail');
    }
  };

  const doClear = () => {
    clearUsageLog();
    setEvents([]);
    setConfirming(false);
    setCopyStatus('idle');
  };

  const summaryRows: [string, string][] = [
    ['記録回数', `${summary.recordSaveCount}回`],
    ['起動回数', `${summary.appOpenCount}回`],
    ['閲覧回数', `${summary.historyOpenCount}回`],
    [
      '平均記録時間',
      summary.averageRecordSeconds != null
        ? `${summary.averageRecordSeconds}秒`
        : '—',
    ],
    ['未完了', `${summary.incompleteCount}件`],
  ];

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
        <div style={{ fontSize: 20 }}>📊</div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>利用ログ</div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          lineHeight: 1.7,
        }}
      >
        アプリの使われ方（開いた・記録した などの回数と時刻）だけを端末内に記録しています。
        <br />
        記録の内容（気分・睡眠・メモなど）は含まれません。自動では送信されません。
      </div>

      {events.length === 0 ? (
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: PALETTE.inkSoft,
            textAlign: 'center',
            padding: '10px 0',
          }}
        >
          まだ利用ログがありません。
        </div>
      ) : (
        <>
          {/* 直近 14 日の集計 */}
          <div
            style={{
              marginTop: 12,
              background: PALETTE.creamSoft,
              borderRadius: 12,
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              直近14日のようす
            </div>
            {summaryRows.map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: PALETTE.ink,
                  lineHeight: 1.8,
                }}
              >
                <span style={{ color: PALETTE.inkSoft }}>{label}</span>
                <span style={{ fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* イベント一覧 (新しい順) */}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
              イベント一覧（新しい順）
            </div>
            <div
              style={{
                maxHeight: 160,
                overflowY: 'auto',
                border: `1px solid ${PALETTE.creamSoft}`,
                borderRadius: 10,
                padding: '6px 10px',
              }}
            >
              {visible.map((ev, i) => (
                <div
                  key={`${ev.at}_${i}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: 10.5,
                    color: PALETTE.ink,
                    lineHeight: 1.9,
                  }}
                >
                  <span>{TYPE_LABEL[ev.type]}</span>
                  <span style={{ color: PALETTE.inkSoft }}>
                    {formatAt(ev.at)}
                  </span>
                </div>
              ))}
              {hiddenCount > 0 && (
                <div
                  style={{
                    fontSize: 10.5,
                    color: PALETTE.inkSoft,
                    lineHeight: 1.9,
                  }}
                >
                  ほか {hiddenCount} 件（コピーにはすべて含まれます）
                </div>
              )}
            </div>
          </div>

          {/* コピー (明示タップ時のみクリップボードへ) */}
          <button
            onClick={doCopy}
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
            コピー (CSV)
          </button>
          {copyStatus === 'ok' && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: PALETTE.sageDeep,
                textAlign: 'center',
              }}
            >
              コピーしました。
            </div>
          )}
          {copyStatus === 'fail' && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: PALETTE.amber,
                textAlign: 'center',
              }}
            >
              コピーできませんでした。お使いの環境では使えない場合があります。
            </div>
          )}

          {/* ログ全削除 (二段階確認) */}
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              style={{
                marginTop: 10,
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
              ログを全削除
            </button>
          ) : (
            <div
              style={{
                marginTop: 10,
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
                利用ログをすべて消しますか？
                <br />
                記録（きもち・通所など）は消えません。
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
                  onClick={doClear}
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
        </>
      )}
    </div>
  );
}
