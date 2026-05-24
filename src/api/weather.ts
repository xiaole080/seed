// Open-Meteo Weather API クライアント。
//
// 【外部送信あり】privacy-reviewer の確認対象。
//
// 送信先 : https://api.open-meteo.com/v1/forecast
// 送信内容: クエリパラメータのみ
//   - latitude / longitude (小数第2位に丸めた区市町村レベル座標)
//   - current=temperature_2m,weather_code,surface_pressure
//   - hourly=surface_pressure
//   - timezone=Asia/Tokyo
//   - past_hours=6
// 送信しないもの:
//   - 健康データ・自由記述・気分・睡眠・服薬・通所 など一切送らない
//   - 識別情報を独自 header に載せない
//
// 同意必須:
//   `consent !== 'accepted'` の場合は fetch せず `WeatherError('consentRequired')` を throw。
//   呼び出し元 (useWeather) でも同意チェックする (二重防衛)。

import { roundCoord } from '../data/regions';
import type { WeatherSnapshot, WeatherTrend } from '../data/weatherCache';
import type { ConsentState } from '../data/types';

export type WeatherConsent = ConsentState['weatherApiConsent'];

export type WeatherErrorKind =
  | 'consentRequired'
  | 'network'
  | 'invalidResponse'
  | 'aborted';

export class WeatherError extends Error {
  readonly kind: WeatherErrorKind;
  constructor(kind: WeatherErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'WeatherError';
    this.kind = kind;
  }
}

interface RawCurrent {
  temperature_2m?: unknown;
  weather_code?: unknown;
  surface_pressure?: unknown;
}

interface RawHourly {
  time?: unknown;
  surface_pressure?: unknown;
}

interface RawResponse {
  current?: RawCurrent;
  hourly?: RawHourly;
}

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export interface FetchWeatherOptions {
  signal?: AbortSignal;
  consent: WeatherConsent;
}

export async function fetchWeather(
  lat: number,
  lon: number,
  opts: FetchWeatherOptions,
): Promise<WeatherSnapshot> {
  if (opts.consent !== 'accepted') {
    throw new WeatherError('consentRequired');
  }

  // 二重防衛: URL に乗せる直前で必ず再丸め
  const rLat = roundCoord(lat);
  const rLon = roundCoord(lon);

  const url = new URL(ENDPOINT);
  url.searchParams.set('latitude', String(rLat));
  url.searchParams.set('longitude', String(rLon));
  url.searchParams.set('current', 'temperature_2m,weather_code,surface_pressure');
  url.searchParams.set('hourly', 'surface_pressure');
  url.searchParams.set('timezone', 'Asia/Tokyo');
  url.searchParams.set('past_hours', '6');

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new WeatherError('aborted');
    }
    throw new WeatherError('network');
  }

  if (!res.ok) {
    throw new WeatherError('network', `status=${res.status}`);
  }

  let json: RawResponse;
  try {
    json = (await res.json()) as RawResponse;
  } catch {
    throw new WeatherError('invalidResponse');
  }

  const cur = json?.current;
  if (
    !cur ||
    typeof cur.temperature_2m !== 'number' ||
    typeof cur.weather_code !== 'number' ||
    typeof cur.surface_pressure !== 'number'
  ) {
    throw new WeatherError('invalidResponse');
  }

  const trend = computeTrendFromHourly(json.hourly, cur.surface_pressure);
  const { cond, icon } = mapWeatherCode(cur.weather_code);

  return {
    temperature: cur.temperature_2m,
    weatherCode: cur.weather_code,
    cond,
    icon,
    pressure: cur.surface_pressure,
    trend,
  };
}

/**
 * weather_code → 表示ラベル + アイコン (絵文字)。
 * WMO weather interpretation codes に準拠。
 * 既存の `cond` ラベル文化 (はれ / くもり / あめ など) に合わせる。
 */
export function mapWeatherCode(code: number): { cond: string; icon: string } {
  if (code === 0) return { cond: 'はれ', icon: '☀️' };
  if (code === 1) return { cond: 'はれ', icon: '🌤️' };
  if (code === 2) return { cond: 'はれ時々くもり', icon: '⛅' };
  if (code === 3) return { cond: 'くもり', icon: '☁️' };
  if (code === 45 || code === 48) return { cond: 'きり', icon: '🌫️' };
  if (code === 51 || code === 53 || code === 55) return { cond: 'きりさめ', icon: '🌦️' };
  if (code === 56 || code === 57) return { cond: 'こおりさめ', icon: '🌧️' };
  if (code === 61 || code === 63 || code === 65) return { cond: 'あめ', icon: '🌧️' };
  if (code === 66 || code === 67) return { cond: 'こおりあめ', icon: '🌧️' };
  if (code === 71 || code === 73 || code === 75) return { cond: 'ゆき', icon: '🌨️' };
  if (code === 77) return { cond: 'こなゆき', icon: '🌨️' };
  if (code === 80 || code === 81 || code === 82) return { cond: 'にわか雨', icon: '🌦️' };
  if (code === 85 || code === 86) return { cond: 'にわか雪', icon: '🌨️' };
  if (code === 95) return { cond: 'かみなり', icon: '⛈️' };
  if (code === 96 || code === 99) return { cond: 'かみなり (ひょう)', icon: '⛈️' };
  return { cond: '—', icon: '☁️' };
}

/**
 * 直近 3 時間の surface_pressure 差分から傾向を算出。
 *  +0.7 hPa 以上 → up
 *  -0.7 hPa 以下 → down
 *  それ以外 / データ不足 → stable
 */
export function computeTrendFromHourly(
  hourly: RawHourly | undefined,
  currentPressure: number,
): WeatherTrend {
  if (!hourly || !Array.isArray(hourly.surface_pressure)) return 'stable';
  const arr = (hourly.surface_pressure as unknown[]).filter(
    (v): v is number => typeof v === 'number',
  );
  if (arr.length < 4) return 'stable';
  // 末尾を「現在」とみなし、3 時間前と比較する。
  // (Open-Meteo の hourly は当該タイムゾーンで定刻配列)
  const last = arr[arr.length - 1];
  const past = arr[arr.length - 4];
  if (typeof last !== 'number' || typeof past !== 'number') return 'stable';
  // current が来ているならそちらを優先 (より時刻精度が高い)
  const now = Number.isFinite(currentPressure) ? currentPressure : last;
  const diff = now - past;
  if (diff >= 0.7) return 'up';
  if (diff <= -0.7) return 'down';
  return 'stable';
}
