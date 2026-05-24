// 区市町村検索画面。
//
// 【外部送信あり】privacy-reviewer の確認対象。
// 送信先: Open-Meteo Geocoding API (api/geocoding.ts 参照)。
// 送信内容: ユーザがこの画面で入力した検索語のみ。健康データは送らない。
//
// 同意未取得時は検索バー無効化。同意取得への導線を出す。

import { useEffect, useRef, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { REGIONS, roundCoord } from '../data/regions';
import {
  GeocodingError,
  searchPlaces,
  type GeocodingResult,
} from '../api/geocoding';
import type { ConsentState, RegionId, SelectedRegion } from '../data/types';

interface RegionSearchScreenProps {
  consent: ConsentState['weatherApiConsent'];
  /** 選択を確定した時に呼ばれる。 */
  onPick: (region: SelectedRegion) => void;
  /** 戻るボタン (ProfileScreen へ戻る等)。 */
  onBack?: () => void;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

export function RegionSearchScreen({
  consent,
  onPick,
  onBack,
}: RegionSearchScreenProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'empty' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // クリーンアップ用
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (consent !== 'accepted') {
      setResults([]);
      setStatus('idle');
      return;
    }
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setResults([]);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      void searchPlaces(q, { consent, signal: ctrl.signal })
        .then((items) => {
          if (ctrl.signal.aborted) return;
          setResults(items);
          setStatus(items.length === 0 ? 'empty' : 'idle');
        })
        .catch((err: unknown) => {
          if (ctrl.signal.aborted) return;
          if (err instanceof GeocodingError && err.kind === 'aborted') return;
          setResults([]);
          setStatus('error');
          setErrorMsg(
            err instanceof GeocodingError
              ? errorMessageFor(err.kind)
              : '検索に失敗しました',
          );
        });
    }, DEBOUNCE_MS);
  }, [query, consent]);

  return (
    <PhoneShell bg={PALETTE.creamSoft} label="05b 地域を探す">
      <BackgroundLeaves />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 22px 24px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
            marginBottom: 12,
          }}
        >
          {onBack ? (
            <button
              onClick={onBack}
              style={{
                border: 'none',
                background: 'transparent',
                color: PALETTE.sageDeep,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                padding: 0,
                fontFamily: ROUNDED_FONT,
              }}
            >
              ‹ もどる
            </button>
          ) : (
            <span />
          )}
          <div style={{ fontSize: 18, fontWeight: 700 }}>地域を探す</div>
          <span />
        </div>

        {/* 同意未取得の案内 */}
        {consent !== 'accepted' && (
          <div
            style={{
              background: PALETTE.amberSoft,
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 12,
              color: PALETTE.ink,
              lineHeight: 1.7,
              marginBottom: 12,
            }}
          >
            天気の取得を「じぶん」画面で有効にすると、
            区市町村名で検索できます。
          </div>
        )}

        {/* 検索バー */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: CARD_SHADOW,
            padding: '10px 12px',
            marginBottom: 12,
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="市区町村名を入力（例: 台東区）"
            disabled={consent !== 'accepted'}
            aria-label="市区町村名"
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              fontFamily: ROUNDED_FONT,
              color: PALETTE.ink,
              padding: '6px 0',
              background: 'transparent',
            }}
          />
        </div>

        {/* プリセット8都市 (後方互換チップ) */}
        {query.trim().length === 0 && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                color: PALETTE.inkSoft,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              よく使う 8 都市
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
              }}
            >
              {(Object.entries(REGIONS) as [
                RegionId,
                typeof REGIONS[RegionId],
              ][]).map(([id, r]) => (
                <button
                  key={id}
                  onClick={() => onPick({ kind: 'preset', presetId: id })}
                  style={{
                    border: 'none',
                    background: PALETTE.sageSoft,
                    color: PALETTE.ink,
                    padding: '8px 4px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: ROUNDED_FONT,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 検索結果 */}
        {status === 'loading' && (
          <div
            style={{ fontSize: 12, color: PALETTE.inkSoft, padding: '8px 4px' }}
          >
            検索中…
          </div>
        )}
        {status === 'empty' && (
          <div
            style={{ fontSize: 12, color: PALETTE.inkSoft, padding: '8px 4px' }}
          >
            該当する地域が見つかりませんでした。
          </div>
        )}
        {status === 'error' && (
          <div
            style={{
              fontSize: 12,
              color: '#A86A4A',
              background: '#FAE3D8',
              padding: '8px 12px',
              borderRadius: 10,
            }}
          >
            {errorMsg}
          </div>
        )}

        {results.length > 0 && (
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              boxShadow: CARD_SHADOW,
              overflow: 'hidden',
            }}
          >
            {results.map((r, i) => {
              const label = r.admin1 ? `${r.name}, ${r.admin1}` : r.name;
              return (
                <button
                  key={`${r.lat}_${r.lon}_${i}`}
                  onClick={() =>
                    // 中間防御 (§4.2): geocoding.ts で丸め済だが、保存直前で
                    // もう一度 roundCoord して区市町村レベルを徹底する。
                    onPick({
                      kind: 'custom',
                      name: label,
                      lat: roundCoord(r.lat),
                      lon: roundCoord(r.lon),
                    })
                  }
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    padding: '12px 14px',
                    fontSize: 13,
                    fontFamily: ROUNDED_FONT,
                    color: PALETTE.ink,
                    borderBottom:
                      i === results.length - 1
                        ? 'none'
                        : `1px solid ${PALETTE.sageSoft}`,
                    cursor: 'pointer',
                  }}
                >
                  📍 {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}

function errorMessageFor(kind: GeocodingError['kind']): string {
  switch (kind) {
    case 'network':
      return '通信に失敗しました。あとでもう一度お試しください。';
    case 'invalidResponse':
      return '検索結果を読み取れませんでした。';
    case 'consentRequired':
      return '天気の取得が有効になっていません。';
    case 'aborted':
      return '';
  }
}
