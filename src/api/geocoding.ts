// Open-Meteo Geocoding API クライアント。
//
// 【外部送信あり】privacy-reviewer の確認対象。
//
// 送信先 : https://geocoding-api.open-meteo.com/v1/search
// 送信内容:
//   - クエリパラメータ `name` (ユーザが入力した検索語)
//   - クエリパラメータ `count=10`、`language=ja`、`countryCode=JP` (固定)
// 送信しないもの:
//   - 健康データ・自由記述・気分・睡眠・服薬・通所 など一切送らない
//   - 識別情報を独自 header に載せない (User-Agent はブラウザ任せ)
//
// 同意必須:
//   `consent !== 'accepted'` の場合は fetch せず `GeocodingError('consentRequired')` を throw。
//   useWeather / RegionSearchScreen 側でも同意チェックする (二重防衛)。

import type { ConsentState } from '../data/types';
import { roundCoord } from '../data/regions';

export type WeatherConsent = ConsentState['weatherApiConsent'];

export interface GeocodingResult {
  /** 地名 (例: "台東区") */
  name: string;
  /** ISO 国コード (JP のみ通す) */
  country: string;
  /** 都道府県名 (例: "東京都") */
  admin1?: string;
  lat: number;
  lon: number;
}

export type GeocodingErrorKind =
  | 'consentRequired'
  | 'network'
  | 'invalidResponse'
  | 'aborted';

export class GeocodingError extends Error {
  readonly kind: GeocodingErrorKind;
  constructor(kind: GeocodingErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'GeocodingError';
    this.kind = kind;
  }
}

interface RawGeocodingItem {
  name?: unknown;
  country_code?: unknown;
  admin1?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}

interface RawGeocodingResponse {
  results?: RawGeocodingItem[];
}

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

export interface SearchPlacesOptions {
  signal?: AbortSignal;
  consent: WeatherConsent;
}

export async function searchPlaces(
  query: string,
  opts: SearchPlacesOptions,
): Promise<GeocodingResult[]> {
  // 同意の二重防衛: ここで明示的にブロック。
  if (opts.consent !== 'accepted') {
    throw new GeocodingError('consentRequired');
  }

  const q = query.trim();
  if (q.length === 0) return [];

  const url = new URL(ENDPOINT);
  url.searchParams.set('name', q);
  url.searchParams.set('count', '10');
  url.searchParams.set('language', 'ja');
  url.searchParams.set('countryCode', 'JP');

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      signal: opts.signal,
      // 独自ヘッダは付けない (識別情報の漏出を避ける)
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new GeocodingError('aborted');
    }
    throw new GeocodingError('network');
  }

  if (!res.ok) {
    throw new GeocodingError('network', `status=${res.status}`);
  }

  let json: RawGeocodingResponse;
  try {
    json = (await res.json()) as RawGeocodingResponse;
  } catch {
    throw new GeocodingError('invalidResponse');
  }

  if (!json || !Array.isArray(json.results)) {
    // 結果なしは [] (エラーではない)
    return [];
  }

  const out: GeocodingResult[] = [];
  for (const r of json.results) {
    if (
      r == null ||
      typeof r.name !== 'string' ||
      typeof r.latitude !== 'number' ||
      typeof r.longitude !== 'number'
    ) {
      continue;
    }
    // API 側で countryCode=JP を指定しても、念のため二重防衛で JP のみ通す。
    if (r.country_code !== 'JP') continue;
    // 最上流防御 (§4.2): API から返ってきた生の lat/lon を「区市町村レベル」
    // (小数第2位) に丸めてから返す。これ以降の保存・送信・JSON エクスポートには
    // 一切の小数3位以降が漏れない。RegionSearchScreen / App.normalizeRegion でも
    // 二重に roundCoord を掛ける (三重防衛)。
    out.push({
      name: r.name,
      country: r.country_code,
      admin1: typeof r.admin1 === 'string' ? r.admin1 : undefined,
      lat: roundCoord(r.latitude),
      lon: roundCoord(r.longitude),
    });
  }
  return out;
}
