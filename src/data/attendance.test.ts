import { describe, it, expect } from 'vitest';
import {
  DAYS,
  MODE_LABEL,
  MODE_COLOR,
  BAND_LABEL,
  DEFAULT_SCHEDULE,
} from './attendance';

describe('attendance 定数', () => {
  it('DAYS は月曜始まりの 7 曜日', () => {
    expect(DAYS).toEqual(['月', '火', '水', '木', '金', '土', '日']);
  });

  it('MODE_LABEL は通所/在宅/休み', () => {
    expect(MODE_LABEL.office).toBe('通所');
    expect(MODE_LABEL.home).toBe('在宅');
    expect(MODE_LABEL.off).toBe('休み');
  });

  it('MODE_COLOR は全モード分の配色を持つ', () => {
    for (const mode of ['office', 'home', 'off'] as const) {
      expect(MODE_COLOR[mode].bg).toBeTruthy();
      expect(MODE_COLOR[mode].fg).toBeTruthy();
    }
  });

  it('BAND_LABEL は一日/午前/午後', () => {
    expect(BAND_LABEL.full).toBe('一日');
    expect(BAND_LABEL.am).toBe('午前のみ');
    expect(BAND_LABEL.pm).toBe('午後のみ');
  });
});

describe('DEFAULT_SCHEDULE', () => {
  it('月〜日の 7 日分が揃っている', () => {
    for (let i = 0; i < 7; i++) {
      expect(DEFAULT_SCHEDULE[i]).toBeDefined();
      expect(DEFAULT_SCHEDULE[i].mode).toBeTruthy();
      expect(DEFAULT_SCHEDULE[i].band).toBeTruthy();
    }
  });

  it('土日 (index 5/6) は休み', () => {
    expect(DEFAULT_SCHEDULE[5].mode).toBe('off');
    expect(DEFAULT_SCHEDULE[6].mode).toBe('off');
  });
});
