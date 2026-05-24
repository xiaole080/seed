// 天気スナップショットの localStorage キャッシュ。
//
// 仕様 (Sprint 2026-05-24 / schemaVersion 0.2.0):
//  - 同じ座標 (小数第2位) + 60 分以内ならキャッシュヒット。
//  - TTL 切れは原則ヒット扱いしない (古い値で安心させない)。
//  - ただし「ネットワークエラー時に限り、TTL 切れキャッシュを表示」する判定は
//    useWeather 側で別途行う (§3.4 オフラインフォールバック)。
//  - 保存内容に自由記述・気分・体調などの機微情報は含めない。

import { loadJson, saveJson } from '../storage';
import { roundCoord } from './regions';

export type WeatherTrend = 'up' | 'down' | 'stable';

/**
 * Open-Meteo から取得した snapshot。
 * weatherCode のラベル変換は表示直前に行う。
 */
export interface WeatherSnapshot {
  /** 摂氏 */
  temperature: number;
  /** Open-Meteo の WMO weather_code */
  weatherCode: number;
  /** 表示用ラベル (FE 側のマッピング表で決定) */
  cond: string;
  /** 表示用アイコン (絵文字) */
  icon: string;
  /** hPa */
  pressure: number;
  /** 直近 3 時間の差分から導いた傾向 */
  trend: WeatherTrend;
}

export interface CachedWeatherEntry {
  lat: number;
  lon: number;
  /** ISO 文字列。Date.now() ベースで判定する。 */
  fetchedAt: string;
  snapshot: WeatherSnapshot;
}

export const WEATHER_CACHE_KEY = 'seed.weather.v1';

/** 1 時間 (ms)。 */
export const WEATHER_TTL_MS = 60 * 60 * 1000;

/**
 * キャッシュを取り出す。座標一致 (小数第2位) かつ TTL 内ならヒット。
 * fresh だけ欲しい場合に使う。stale を取りたいときは `getCachedWeatherRaw` を使う。
 */
export function getCachedWeather(
  lat: number,
  lon: number,
  now: number = Date.now(),
): WeatherSnapshot | null {
  const entry = getCachedWeatherRaw();
  if (!entry) return null;
  if (entry.lat !== roundCoord(lat)) return null;
  if (entry.lon !== roundCoord(lon)) return null;
  const fetchedAt = Date.parse(entry.fetchedAt);
  if (Number.isNaN(fetchedAt)) return null;
  if (now - fetchedAt > WEATHER_TTL_MS) return null;
  return entry.snapshot;
}

/**
 * 生のキャッシュエントリを返す (TTL チェックなし)。
 * オフラインフォールバック判定用。
 */
export function getCachedWeatherRaw(): CachedWeatherEntry | null {
  const raw = loadJson<CachedWeatherEntry | null>(WEATHER_CACHE_KEY, null);
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.lat !== 'number' || typeof raw.lon !== 'number') return null;
  if (typeof raw.fetchedAt !== 'string') return null;
  if (raw.snapshot == null || typeof raw.snapshot !== 'object') return null;
  return raw;
}

export function setCachedWeather(
  lat: number,
  lon: number,
  snapshot: WeatherSnapshot,
  now: number = Date.now(),
): void {
  const entry: CachedWeatherEntry = {
    lat: roundCoord(lat),
    lon: roundCoord(lon),
    fetchedAt: new Date(now).toISOString(),
    snapshot,
  };
  saveJson(WEATHER_CACHE_KEY, entry);
}

export function clearWeatherCache(): void {
  try {
    localStorage.removeItem(WEATHER_CACHE_KEY);
  } catch {
    // private mode / quota — 何もしない
  }
}
