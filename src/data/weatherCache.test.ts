import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WEATHER_CACHE_KEY,
  WEATHER_TTL_MS,
  clearWeatherCache,
  getCachedWeather,
  getCachedWeatherRaw,
  setCachedWeather,
  type WeatherSnapshot,
} from './weatherCache';

const SAMPLE: WeatherSnapshot = {
  temperature: 22,
  weatherCode: 0,
  cond: 'はれ',
  icon: '☀️',
  pressure: 1013,
  trend: 'stable',
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-24T10:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('weatherCache', () => {
  it('set → get で同じ snapshot が返る', () => {
    setCachedWeather(35.69, 139.69, SAMPLE);
    expect(getCachedWeather(35.69, 139.69)).toEqual(SAMPLE);
  });

  it('座標は小数第2位で正規化される', () => {
    // 異なる細かい桁でも、丸めれば一致するのでヒットする
    setCachedWeather(35.6895, 139.6917, SAMPLE);
    expect(getCachedWeather(35.69, 139.69)).toEqual(SAMPLE);
  });

  it('座標が違えば null', () => {
    setCachedWeather(35.69, 139.69, SAMPLE);
    expect(getCachedWeather(34.69, 135.5)).toBeNull();
  });

  it('小数第2位で 1 つでもズレるとミス扱い (0.01 drift)', () => {
    // 区市町村レベルの境界を越えるズレはキャッシュを使い回さない。
    setCachedWeather(35.69, 139.69, SAMPLE);
    expect(getCachedWeather(35.7, 139.69)).toBeNull(); // lat だけ +0.01
    expect(getCachedWeather(35.69, 139.7)).toBeNull(); // lon だけ +0.01
    expect(getCachedWeather(35.68, 139.69)).toBeNull(); // lat だけ -0.01
  });

  it('TTL 境界: 60分ぴったりはまだヒット、超えるとミス', () => {
    setCachedWeather(35.69, 139.69, SAMPLE, Date.now());
    // fake timer の Date.now() を 60 分丁度 / 60 分 + 1ms に進める
    vi.setSystemTime(new Date('2026-05-24T11:00:00.000Z')); // ちょうど 60 分後
    expect(getCachedWeather(35.69, 139.69)).toEqual(SAMPLE);
    vi.setSystemTime(new Date('2026-05-24T11:00:00.002Z')); // 60 分 + 2ms
    expect(getCachedWeather(35.69, 139.69)).toBeNull();
  });

  it('TTL (60 分) を超えると null', () => {
    setCachedWeather(35.69, 139.69, SAMPLE);
    const justBefore = Date.now() + WEATHER_TTL_MS - 1;
    const justAfter = Date.now() + WEATHER_TTL_MS + 1;
    expect(getCachedWeather(35.69, 139.69, justBefore)).toEqual(SAMPLE);
    expect(getCachedWeather(35.69, 139.69, justAfter)).toBeNull();
  });

  it('clearWeatherCache で削除される', () => {
    setCachedWeather(35.69, 139.69, SAMPLE);
    clearWeatherCache();
    expect(getCachedWeather(35.69, 139.69)).toBeNull();
    expect(localStorage.getItem(WEATHER_CACHE_KEY)).toBeNull();
  });

  it('getCachedWeatherRaw は TTL に関係なく取り出せる (オフラインフォールバック用)', () => {
    setCachedWeather(35.69, 139.69, SAMPLE);
    // 2 時間後でも raw は返る
    vi.setSystemTime(new Date('2026-05-24T12:00:00.000Z'));
    const raw = getCachedWeatherRaw();
    expect(raw).not.toBeNull();
    expect(raw?.snapshot).toEqual(SAMPLE);
    // get は null
    expect(getCachedWeather(35.69, 139.69)).toBeNull();
  });

  it('壊れた JSON が入っていても落ちない', () => {
    localStorage.setItem(WEATHER_CACHE_KEY, '{ not json');
    expect(getCachedWeather(35.69, 139.69)).toBeNull();
    expect(getCachedWeatherRaw()).toBeNull();
  });
});
