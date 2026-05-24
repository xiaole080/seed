// 天気取得のオーケストレーション (debounce / cache / abort / 同意確認)。
//
// 仕様 (Sprint 2026-05-24):
//  - region 変更時に 300ms debounce。
//  - キャッシュヒット (同座標 + 60分以内) ならその snapshot を返す。
//  - キャッシュミス時のみ fetch。前リクエストは AbortController で abort。
//  - 同意 !== 'accepted' は即座に kind:'optedOut' を返す (fetch 0)。
//  - ネットワークエラー時、TTL 切れキャッシュがあれば kind:'offline' で表示 (§3.4)。
//  - アンマウント時に in-flight を abort。

import { useEffect, useRef, useState } from 'react';
import { REGIONS, roundCoord } from '../data/regions';
import {
  getCachedWeather,
  getCachedWeatherRaw,
  setCachedWeather,
  type WeatherSnapshot,
} from '../data/weatherCache';
import { fetchWeather, WeatherError } from '../api/weather';
import type { ConsentState, SelectedRegion } from '../data/types';

export type WeatherStateKind =
  | 'optedOut'
  | 'loading'
  | 'ready'
  | 'error'
  | 'offline';

export type WeatherErrorKind = 'network' | 'invalidResponse';

export interface WeatherState {
  kind: WeatherStateKind;
  snapshot?: WeatherSnapshot;
  errorKind?: WeatherErrorKind;
  /** 表示用の地域名 (プリセットラベル or 検索結果名) */
  label?: string;
  /** 取得に使った座標 (roundCoord 済) */
  lat?: number;
  lon?: number;
}

export interface UseWeatherOptions {
  region: SelectedRegion;
  consent: ConsentState['weatherApiConsent'];
}

const DEBOUNCE_MS = 300;

interface ResolvedRegion {
  lat: number;
  lon: number;
  label: string;
}

function resolveRegion(region: SelectedRegion): ResolvedRegion {
  if (region.kind === 'preset') {
    const r = REGIONS[region.presetId] ?? REGIONS.tokyo;
    return { lat: roundCoord(r.lat), lon: roundCoord(r.lon), label: r.label };
  }
  return {
    lat: roundCoord(region.lat),
    lon: roundCoord(region.lon),
    label: region.name,
  };
}

export function useWeather({
  region,
  consent,
}: UseWeatherOptions): WeatherState {
  const resolved = resolveRegion(region);
  const [state, setState] = useState<WeatherState>(() => {
    if (consent !== 'accepted') {
      return { kind: 'optedOut', label: resolved.label };
    }
    // 初期表示: キャッシュがあれば即時 ready
    const cached = getCachedWeather(resolved.lat, resolved.lon);
    if (cached) {
      return {
        kind: 'ready',
        snapshot: cached,
        label: resolved.label,
        lat: resolved.lat,
        lon: resolved.lon,
      };
    }
    return { kind: 'loading', label: resolved.label };
  });

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 同意なし: fetch しない。前回 in-flight があれば中断。
    if (consent !== 'accepted') {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = null;
      setState({ kind: 'optedOut', label: resolved.label });
      return;
    }

    // キャッシュ即時ヒット → loading を経由しない
    const cached = getCachedWeather(resolved.lat, resolved.lon);
    if (cached) {
      setState({
        kind: 'ready',
        snapshot: cached,
        label: resolved.label,
        lat: resolved.lat,
        lon: resolved.lon,
      });
      return;
    }

    // debounce
    setState((prev) =>
      prev.kind === 'ready' && prev.lat === resolved.lat && prev.lon === resolved.lon
        ? prev
        : { kind: 'loading', label: resolved.label },
    );

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // 直前の in-flight をキャンセル
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      void fetchWeather(resolved.lat, resolved.lon, {
        signal: ctrl.signal,
        consent,
      })
        .then((snap) => {
          if (ctrl.signal.aborted) return;
          setCachedWeather(resolved.lat, resolved.lon, snap);
          setState({
            kind: 'ready',
            snapshot: snap,
            label: resolved.label,
            lat: resolved.lat,
            lon: resolved.lon,
          });
        })
        .catch((err: unknown) => {
          if (ctrl.signal.aborted) return;
          if (err instanceof WeatherError && err.kind === 'aborted') return;

          // ネットワークエラー時のオフラインフォールバック (§3.4)。
          // TTL 切れでも同座標のキャッシュがあれば表示し、kind=offline で示す。
          const errKind: WeatherErrorKind =
            err instanceof WeatherError && err.kind === 'invalidResponse'
              ? 'invalidResponse'
              : 'network';

          if (errKind === 'network') {
            const raw = getCachedWeatherRaw();
            if (
              raw &&
              raw.lat === resolved.lat &&
              raw.lon === resolved.lon &&
              raw.snapshot
            ) {
              setState({
                kind: 'offline',
                snapshot: raw.snapshot,
                label: resolved.label,
                lat: resolved.lat,
                lon: resolved.lon,
              });
              return;
            }
          }
          setState({
            kind: 'error',
            errorKind: errKind,
            label: resolved.label,
            lat: resolved.lat,
            lon: resolved.lon,
          });
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // resolved の lat/lon/label と consent が変わったら再評価
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved.lat, resolved.lon, resolved.label, consent]);

  // アンマウント時の cleanup
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return state;
}
