import type { RegionId, RegionInfo } from './types';

/**
 * プリセット8都市。`lat` / `lon` は Open-Meteo 呼び出しのフォールバック用に
 * 区市町村レベルの代表座標 (小数第2位丸め済) を持つ。
 * `temp` / `pressure` / `trend` は Open-Meteo の実値が来たら上書きされるため、
 * ここに残っているのは「同意未取得時 / API オフ時」の見た目フォールバックだけ。
 */
export const REGIONS: Record<RegionId, RegionInfo> = {
  tokyo:     { label: '東京',   icon: '☀️',  cond: 'はれ',           lat: 35.69, lon: 139.69 },
  osaka:     { label: '大阪',   icon: '⛅',  cond: 'くもり時々はれ', lat: 34.69, lon: 135.50 },
  sapporo:   { label: '札幌',   icon: '🌧️', cond: 'あめ',           lat: 43.06, lon: 141.35 },
  fukuoka:   { label: '福岡',   icon: '☀️',  cond: 'はれ',           lat: 33.59, lon: 130.40 },
  nagoya:    { label: '名古屋', icon: '⛅',  cond: 'くもり',         lat: 35.18, lon: 136.91 },
  sendai:    { label: '仙台',   icon: '🌤️', cond: 'はれ時々くもり', lat: 38.27, lon: 140.87 },
  hiroshima: { label: '広島',   icon: '☀️',  cond: 'はれ',           lat: 34.40, lon: 132.46 },
  okinawa:   { label: '那覇',   icon: '🌦️', cond: 'にわか雨',       lat: 26.21, lon: 127.68 },
};

export interface PressureCare {
  tone: 'warn' | 'soft' | 'good';
  msg: string;
}

export function pressureCare(p: number, trend: 'up' | 'down' | 'stable'): PressureCare {
  if (p < 1005) return { tone: 'warn', msg: '低気圧です。頭やからだが重い人は無理せず。' };
  if (trend === 'down' && p < 1012) return { tone: 'soft', msg: '気圧が下がりぎみ。ゆっくりめで。' };
  if (p >= 1015) return { tone: 'good', msg: '気圧は安定。すごしやすい一日です。' };
  return { tone: 'soft', msg: '気圧はおだやか。マイペースでどうぞ。' };
}

/**
 * 緯度経度を小数第2位に丸める。Open-Meteo に送信する前の必須処理。
 * 区市町村レベルにとどめるための二重防衛 (API クライアントでも適用)。
 */
export function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}
