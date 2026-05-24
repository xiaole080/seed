import { describe, it, expect, vi } from 'vitest';
import {
  WeatherError,
  computeTrendFromHourly,
  fetchWeather,
  mapWeatherCode,
} from './weather';

function mockJsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

describe('fetchWeather — 同意の二重防衛', () => {
  it('consent !== "accepted" は fetch を呼ばず consentRequired を throw', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);

    await expect(
      fetchWeather(35.69, 139.69, { consent: 'notAsked' }),
    ).rejects.toMatchObject({ kind: 'consentRequired' });
    await expect(
      fetchWeather(35.69, 139.69, { consent: 'declined' }),
    ).rejects.toMatchObject({ kind: 'consentRequired' });

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('fetchWeather — URL 構築', () => {
  it('roundCoord で再丸めし、所定のクエリを乗せる', async () => {
    const spy = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> =>
        mockJsonResponse({
          current: {
            temperature_2m: 22,
            weather_code: 0,
            surface_pressure: 1013,
          },
          hourly: {
            surface_pressure: [1010, 1011, 1012, 1013, 1013, 1013, 1013],
          },
        }),
    );
    vi.stubGlobal('fetch', spy);

    await fetchWeather(35.6895, 139.6917, { consent: 'accepted' });

    const url = new URL(spy.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe(
      'https://api.open-meteo.com/v1/forecast',
    );
    // 二重防衛: roundCoord で小数第2位に丸まる
    expect(url.searchParams.get('latitude')).toBe('35.69');
    expect(url.searchParams.get('longitude')).toBe('139.69');
    expect(url.searchParams.get('current')).toBe(
      'temperature_2m,weather_code,surface_pressure',
    );
    expect(url.searchParams.get('hourly')).toBe('surface_pressure');
    expect(url.searchParams.get('timezone')).toBe('Asia/Tokyo');
    expect(url.searchParams.get('past_hours')).toBe('6');
  });

  it('独自 header を付けない', async () => {
    const spy = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> =>
        mockJsonResponse({
          current: {
            temperature_2m: 22,
            weather_code: 0,
            surface_pressure: 1013,
          },
        }),
    );
    vi.stubGlobal('fetch', spy);

    await fetchWeather(35.69, 139.69, { consent: 'accepted' });
    const init = spy.mock.calls[0][1];
    expect(init?.headers).toBeUndefined();
  });
});

describe('fetchWeather — レスポンスのマッピング', () => {
  it('current が揃っていれば snapshot を返す', async () => {
    vi.stubGlobal('fetch', async () =>
      mockJsonResponse({
        current: {
          temperature_2m: 24.3,
          weather_code: 2,
          surface_pressure: 1012,
        },
        hourly: {
          // 末尾 1012, 3つ前 1010.5 → 差 +1.5 → up
          surface_pressure: [1009, 1009.5, 1010, 1010.5, 1011, 1011.5, 1012],
        },
      }),
    );

    const snap = await fetchWeather(35.69, 139.69, { consent: 'accepted' });
    expect(snap.temperature).toBe(24.3);
    expect(snap.weatherCode).toBe(2);
    expect(snap.pressure).toBe(1012);
    expect(snap.cond).toBe('はれ時々くもり');
    expect(snap.icon).toBe('⛅');
    expect(snap.trend).toBe('up');
  });

  it('current のキーが欠けたら invalidResponse', async () => {
    vi.stubGlobal('fetch', async () =>
      mockJsonResponse({ current: { temperature_2m: 22 } }),
    );
    await expect(
      fetchWeather(35.69, 139.69, { consent: 'accepted' }),
    ).rejects.toMatchObject({ kind: 'invalidResponse' });
  });

  it('hourly が無くても snapshot は返る (trend は stable)', async () => {
    vi.stubGlobal('fetch', async () =>
      mockJsonResponse({
        current: {
          temperature_2m: 22,
          weather_code: 0,
          surface_pressure: 1013,
        },
      }),
    );
    const snap = await fetchWeather(35.69, 139.69, { consent: 'accepted' });
    expect(snap.trend).toBe('stable');
  });
});

describe('fetchWeather — エラー', () => {
  it('ネットワーク失敗 → kind=network', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(
      fetchWeather(35.69, 139.69, { consent: 'accepted' }),
    ).rejects.toMatchObject({ kind: 'network' });
  });

  it('AbortError → kind=aborted', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new DOMException('aborted', 'AbortError');
    });
    await expect(
      fetchWeather(35.69, 139.69, { consent: 'accepted' }),
    ).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('non-2xx → kind=network', async () => {
    vi.stubGlobal('fetch', async () =>
      ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response,
    );
    await expect(
      fetchWeather(35.69, 139.69, { consent: 'accepted' }),
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
      fetchWeather(35.69, 139.69, { consent: 'accepted' }),
    ).rejects.toMatchObject({ kind: 'invalidResponse' });
  });

  it('WeatherError は kind を持つ', () => {
    const e = new WeatherError('network');
    expect(e.kind).toBe('network');
  });
});

describe('fetchWeather — URL の機微語監査 (QA)', () => {
  // 仕様 §13.8 / §9.5 系列: 健康データ・自由記述・識別子は外部に送らない。
  // ここでは「URL を文字列化したものに、絶対に出てはいけない語が混ざっていないか」
  // を 1 ファイル分まとめて assert する。誰かが将来 fetchWeather に nickname や
  // note を渡すコードを足したら、まずこのテストで止まる。
  it('URL に nickname / clientId / note / 健康データ語が一切混ざらない', async () => {
    const spy = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> =>
        mockJsonResponse({
          current: { temperature_2m: 22, weather_code: 0, surface_pressure: 1013 },
        }),
    );
    vi.stubGlobal('fetch', spy);

    await fetchWeather(35.6895, 139.6917, { consent: 'accepted' });

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
      'free_text',
      'freetext',
      'othertext',
      'primaryinfluence',
      'testerid',
    ];
    for (const k of FORBIDDEN) {
      expect(url, `URL に "${k}" が含まれている`).not.toContain(k);
    }
    // 健康データ用語 (日本語) — URL は %エンコードされるが localStorage 由来の
    // 余計な値が混ざっていないか、生の URL も念のため見る (decoded)。
    const decoded = decodeURIComponent(String(spy.mock.calls[0][0]));
    for (const ng of ['気分', '自由記述', 'メモ', '体調', '服薬', '通所']) {
      expect(decoded).not.toContain(ng);
    }
  });
});

describe('mapWeatherCode', () => {
  it('0 → はれ', () => {
    expect(mapWeatherCode(0)).toEqual({ cond: 'はれ', icon: '☀️' });
  });
  it('45/48 → きり', () => {
    expect(mapWeatherCode(45).cond).toBe('きり');
    expect(mapWeatherCode(48).cond).toBe('きり');
  });
  it('61/63/65 → あめ', () => {
    expect(mapWeatherCode(63).cond).toBe('あめ');
  });
  it('71/73/75 → ゆき', () => {
    expect(mapWeatherCode(75).cond).toBe('ゆき');
  });
  it('80以上 → にわか雨/雷雨 系', () => {
    expect(mapWeatherCode(81).cond).toBe('にわか雨');
    expect(mapWeatherCode(95).cond).toBe('かみなり');
  });
});

describe('computeTrendFromHourly', () => {
  it('+1 hPa 以上で up', () => {
    expect(
      computeTrendFromHourly({ surface_pressure: [1010, 1010, 1010, 1011.5] }, 1011.5),
    ).toBe('up');
  });
  it('-1 hPa 以下で down', () => {
    expect(
      computeTrendFromHourly({ surface_pressure: [1013, 1013, 1012, 1011] }, 1011),
    ).toBe('down');
  });
  it('変化が小さければ stable', () => {
    expect(
      computeTrendFromHourly({ surface_pressure: [1013, 1013, 1013, 1013.2] }, 1013.2),
    ).toBe('stable');
  });
  it('データが足りなければ stable', () => {
    expect(computeTrendFromHourly({ surface_pressure: [1013] }, 1013)).toBe(
      'stable',
    );
    expect(computeTrendFromHourly(undefined, 1013)).toBe('stable');
  });
});
