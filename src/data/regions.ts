import type { RegionId, RegionInfo } from './types';

export const REGIONS: Record<RegionId, RegionInfo> = {
  tokyo:     { label: '東京',   temp: 22, icon: '☀️',  cond: 'はれ',           pressure: 1013, trend: 'stable' },
  osaka:     { label: '大阪',   temp: 24, icon: '⛅',  cond: 'くもり時々はれ', pressure: 1009, trend: 'down'   },
  sapporo:   { label: '札幌',   temp: 14, icon: '🌧️', cond: 'あめ',           pressure: 1002, trend: 'down'   },
  fukuoka:   { label: '福岡',   temp: 25, icon: '☀️',  cond: 'はれ',           pressure: 1015, trend: 'up'     },
  nagoya:    { label: '名古屋', temp: 23, icon: '⛅',  cond: 'くもり',         pressure: 1011, trend: 'stable' },
  sendai:    { label: '仙台',   temp: 18, icon: '🌤️', cond: 'はれ時々くもり', pressure: 1008, trend: 'down'   },
  hiroshima: { label: '広島',   temp: 23, icon: '☀️',  cond: 'はれ',           pressure: 1014, trend: 'stable' },
  okinawa:   { label: '那覇',   temp: 27, icon: '🌦️', cond: 'にわか雨',       pressure: 1006, trend: 'down'   },
};

export interface PressureCare {
  tone: 'warn' | 'soft' | 'good';
  msg: string;
}

export function pressureCare(p: number, trend: RegionInfo['trend']): PressureCare {
  if (p < 1005) return { tone: 'warn', msg: '低気圧です。頭やからだが重い人は無理せず。' };
  if (trend === 'down' && p < 1012) return { tone: 'soft', msg: '気圧が下がりぎみ。ゆっくりめで。' };
  if (p >= 1015) return { tone: 'good', msg: '気圧は安定。すごしやすい一日です。' };
  return { tone: 'soft', msg: '気圧はおだやか。マイペースでどうぞ。' };
}
