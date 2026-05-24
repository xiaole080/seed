import { describe, it, expect, vi } from 'vitest';
import { GeocodingError, searchPlaces } from './geocoding';

function mockJsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

describe('searchPlaces — 同意の二重防衛', () => {
  it('consent !== "accepted" は fetch を呼ばずに consentRequired を throw', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);

    await expect(
      searchPlaces('台東', { consent: 'notAsked' }),
    ).rejects.toMatchObject({ kind: 'consentRequired' });
    await expect(
      searchPlaces('台東', { consent: 'declined' }),
    ).rejects.toMatchObject({ kind: 'consentRequired' });

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('searchPlaces — URL 構築', () => {
  it('count=10, language=ja, countryCode=JP, name=<input> でクエリを組む', async () => {
    const spy = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> =>
        mockJsonResponse({ results: [] }),
    );
    vi.stubGlobal('fetch', spy);

    await searchPlaces('台東区', { consent: 'accepted' });

    expect(spy).toHaveBeenCalledOnce();
    const firstArg = spy.mock.calls[0][0];
    const url = new URL(firstArg);
    expect(url.origin + url.pathname).toBe(
      'https://geocoding-api.open-meteo.com/v1/search',
    );
    expect(url.searchParams.get('name')).toBe('台東区');
    expect(url.searchParams.get('count')).toBe('10');
    expect(url.searchParams.get('language')).toBe('ja');
    expect(url.searchParams.get('countryCode')).toBe('JP');
  });

  it('独自 header を付けない (識別情報を載せない)', async () => {
    const spy = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> =>
        mockJsonResponse({ results: [] }),
    );
    vi.stubGlobal('fetch', spy);

    await searchPlaces('台東', { consent: 'accepted' });

    const init = spy.mock.calls[0][1];
    expect(init?.headers).toBeUndefined();
  });

  it('空文字 / 空白だけなら fetch せず空配列', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);

    expect(await searchPlaces('', { consent: 'accepted' })).toEqual([]);
    expect(await searchPlaces('   ', { consent: 'accepted' })).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('searchPlaces — 結果のフィルタ', () => {
  it('country_code === "JP" のみ通す (二重防衛)', async () => {
    vi.stubGlobal('fetch', async () =>
      mockJsonResponse({
        results: [
          {
            name: '台東区',
            country_code: 'JP',
            admin1: '東京都',
            latitude: 35.71,
            longitude: 139.78,
          },
          {
            name: 'Taito',
            country_code: 'US',
            admin1: 'Texas',
            latitude: 30.0,
            longitude: -97.0,
          },
        ],
      }),
    );

    const out = await searchPlaces('台東', { consent: 'accepted' });
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('台東区');
    expect(out[0].country).toBe('JP');
    expect(out[0].admin1).toBe('東京都');
  });

  it('results が無い場合は空配列を返す (エラーではない)', async () => {
    vi.stubGlobal('fetch', async () => mockJsonResponse({}));
    const out = await searchPlaces('xyz', { consent: 'accepted' });
    expect(out).toEqual([]);
  });

  it('【プライバシー §4.2】戻り値の lat/lon は小数第2位に丸められている (区市町村レベル)', async () => {
    vi.stubGlobal('fetch', async () =>
      mockJsonResponse({
        results: [
          {
            name: '台東区',
            country_code: 'JP',
            admin1: '東京都',
            // 小数 4 桁の生値が来ても、ライブラリ側で第2位に丸める
            latitude: 35.7128,
            longitude: 139.7847,
          },
          {
            name: '大阪市中央区',
            country_code: 'JP',
            admin1: '大阪府',
            latitude: 34.6855,
            longitude: 135.5025,
          },
        ],
      }),
    );

    const out = await searchPlaces('q', { consent: 'accepted' });
    expect(out).toHaveLength(2);
    expect(out[0].lat).toBe(35.71);
    expect(out[0].lon).toBe(139.78);
    expect(out[1].lat).toBe(34.69);
    expect(out[1].lon).toBe(135.5);
    // 小数3桁以降のビット情報を構造的に持たない
    for (const r of out) {
      expect(Math.round(r.lat * 100) / 100).toBe(r.lat);
      expect(Math.round(r.lon * 100) / 100).toBe(r.lon);
    }
  });

  it('必要フィールドが欠けた要素はスキップ', async () => {
    vi.stubGlobal('fetch', async () =>
      mockJsonResponse({
        results: [
          { name: 'A', country_code: 'JP', latitude: 1, longitude: 2 }, // ok
          { name: 'B', country_code: 'JP', latitude: 'x', longitude: 2 }, // bad
          { country_code: 'JP', latitude: 1, longitude: 2 }, // missing name
        ],
      }),
    );
    const out = await searchPlaces('q', { consent: 'accepted' });
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('A');
  });
});

describe('searchPlaces — URL の機微語監査 (QA)', () => {
  // 仕様 §13.8 系列: 健康データ・識別子は地名検索にも乗せない。
  // 将来 nickname や clientId を添えるリグレッションを早期に止めるための gate。
  it('URL に nickname / clientId / note / 健康データ語が一切混ざらない', async () => {
    const spy = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> =>
        mockJsonResponse({ results: [] }),
    );
    vi.stubGlobal('fetch', spy);

    await searchPlaces('台東区', { consent: 'accepted' });

    const url = String(spy.mock.calls[0][0]).toLowerCase();
    const FORBIDDEN = [
      'nickname',
      'clientid',
      'client_id',
      'note',
      'mood',
      'sleep',
      'meal',
      'medication',
      'attendance',
      'consent',
      'freetext',
      'free_text',
      'othertext',
      'primaryinfluence',
      'testerid',
    ];
    for (const k of FORBIDDEN) {
      expect(url, `URL に "${k}" が含まれている`).not.toContain(k);
    }
    const decoded = decodeURIComponent(String(spy.mock.calls[0][0]));
    for (const ng of ['気分', '自由記述', 'メモ', '体調', '服薬', '通所']) {
      expect(decoded).not.toContain(ng);
    }
    // name= で渡る検索語は許容 (これがそもそも検索クエリ)
    expect(decoded).toContain('name=台東区');
  });
});

describe('searchPlaces — エラー', () => {
  it('ネットワーク失敗 → kind=network', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(
      searchPlaces('q', { consent: 'accepted' }),
    ).rejects.toMatchObject({ kind: 'network' });
  });

  it('AbortError → kind=aborted', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new DOMException('aborted', 'AbortError');
    });
    await expect(
      searchPlaces('q', { consent: 'accepted' }),
    ).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('non-2xx → kind=network', async () => {
    vi.stubGlobal('fetch', async () =>
      ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response,
    );
    await expect(
      searchPlaces('q', { consent: 'accepted' }),
    ).rejects.toMatchObject({ kind: 'network' });
  });

  it('JSON パース失敗 → kind=invalidResponse', async () => {
    vi.stubGlobal('fetch', async () =>
      ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('bad json');
        },
      }) as unknown as Response,
    );
    await expect(
      searchPlaces('q', { consent: 'accepted' }),
    ).rejects.toMatchObject({ kind: 'invalidResponse' });
  });

  it('GeocodingError は kind を持つ', () => {
    const e = new GeocodingError('network', 'foo');
    expect(e.kind).toBe('network');
    expect(e.name).toBe('GeocodingError');
  });
});
