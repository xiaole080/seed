import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWeather } from './useWeather';
import { setCachedWeather } from '../data/weatherCache';
import type { SelectedRegion } from '../data/types';

const TOKYO: SelectedRegion = { kind: 'preset', presetId: 'tokyo' };
const OSAKA: SelectedRegion = { kind: 'preset', presetId: 'osaka' };

function mockOk(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

const DEFAULT_BODY = {
  current: { temperature_2m: 22, weather_code: 0, surface_pressure: 1013 },
  hourly: { surface_pressure: [1010, 1011, 1012, 1013, 1013, 1013, 1013] },
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useWeather — 同意未取得', () => {
  it('consent !== "accepted" は fetch を呼ばずに kind=optedOut', () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);

    const { result } = renderHook(() =>
      useWeather({ region: TOKYO, consent: 'notAsked' }),
    );

    expect(result.current.kind).toBe('optedOut');
    expect(spy).not.toHaveBeenCalled();
  });

  it('consent=declined でも fetch しない', () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const { result } = renderHook(() =>
      useWeather({ region: TOKYO, consent: 'declined' }),
    );
    expect(result.current.kind).toBe('optedOut');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('useWeather — debounce + fetch', () => {
  it('250ms ではまだ fetch しない / 300ms 経つと走る (境界)', async () => {
    const spy = vi.fn(async () => mockOk(DEFAULT_BODY));
    vi.stubGlobal('fetch', spy);

    renderHook(() => useWeather({ region: TOKYO, consent: 'accepted' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(spy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50); // 累計 300ms
    });
    expect(spy).toHaveBeenCalledOnce();
  });

  it('300ms 経つと fetch が走り ready になる', async () => {
    const spy = vi.fn(async () => mockOk(DEFAULT_BODY));
    vi.stubGlobal('fetch', spy);

    const { result } = renderHook(() =>
      useWeather({ region: TOKYO, consent: 'accepted' }),
    );

    expect(result.current.kind).toBe('loading');
    expect(spy).not.toHaveBeenCalled();

    // debounce 解除 + fetch promise / setState を flush
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(spy).toHaveBeenCalledOnce();
    expect(result.current.kind).toBe('ready');
    expect(result.current.snapshot?.temperature).toBe(22);
  });

  it('連続変更時は前リクエストを abort して最後の region のみ fetch', async () => {
    const spy = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> =>
        mockOk(DEFAULT_BODY),
    );
    vi.stubGlobal('fetch', spy);

    const { result, rerender } = renderHook(
      ({ region }: { region: SelectedRegion }) =>
        useWeather({ region, consent: 'accepted' }),
      { initialProps: { region: TOKYO } },
    );

    // 300ms 待たずに地域を切り替える: 東京の debounce タイマーは破棄される
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    rerender({ region: OSAKA });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.kind).toBe('ready');
    // 東京の debounce は新しい region で上書きされたため、fetch は大阪のみ走る
    expect(spy).toHaveBeenCalledOnce();
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
    const url = new URL(lastCall);
    expect(url.searchParams.get('latitude')).toBe('34.69');
    expect(url.searchParams.get('longitude')).toBe('135.5');
  });
});

describe('useWeather — キャッシュ', () => {
  it('同座標で 60分以内のキャッシュがあれば fetch せず ready', () => {
    setCachedWeather(35.69, 139.69, {
      temperature: 18,
      weatherCode: 3,
      cond: 'くもり',
      icon: '☁️',
      pressure: 1010,
      trend: 'stable',
    });
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);

    const { result } = renderHook(() =>
      useWeather({ region: TOKYO, consent: 'accepted' }),
    );

    expect(result.current.kind).toBe('ready');
    expect(result.current.snapshot?.temperature).toBe(18);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('useWeather — オフラインフォールバック (§3.4)', () => {
  it('ネットワーク失敗 + TTL 切れキャッシュあり → kind=offline でキャッシュ表示', async () => {
    // TTL ギリギリ過ぎたキャッシュを直接入れる
    setCachedWeather(
      35.69,
      139.69,
      {
        temperature: 15,
        weatherCode: 0,
        cond: 'はれ',
        icon: '☀️',
        pressure: 1011,
        trend: 'stable',
      },
      Date.now() - 2 * 60 * 60 * 1000, // 2 時間前
    );

    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });

    const { result } = renderHook(() =>
      useWeather({ region: TOKYO, consent: 'accepted' }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.kind).toBe('offline');
    expect(result.current.snapshot?.temperature).toBe(15);
  });

  it('ネットワーク失敗 + キャッシュなし → kind=error', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });

    const { result } = renderHook(() =>
      useWeather({ region: TOKYO, consent: 'accepted' }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.kind).toBe('error');
    expect(result.current.errorKind).toBe('network');
  });
});

describe('useWeather — アンマウント', () => {
  it('アンマウント時に in-flight を abort', async () => {
    let aborted = false;
    vi.stubGlobal(
      'fetch',
      async (_url: string, init?: { signal?: AbortSignal }) => {
        init?.signal?.addEventListener('abort', () => {
          aborted = true;
        });
        // 永遠に解決しない
        await new Promise(() => undefined);
        return mockOk(DEFAULT_BODY);
      },
    );

    const { unmount } = renderHook(() =>
      useWeather({ region: TOKYO, consent: 'accepted' }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    unmount();
    expect(aborted).toBe(true);
  });
});
