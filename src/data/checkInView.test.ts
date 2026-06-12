// checkInView.ts のユニットテスト。
// 時刻パース・編集バリデーション・ヘッダー文言・ヒーロー絵文字を確認する。

import { describe, it, expect } from 'vitest';
import {
  bandHours,
  buildHeaderDateLabel,
  timeToMin,
  validateTimeEdit,
  computeHeroEmoji,
} from './checkInView';
import type { TodayCard } from './types';

const baseToday: TodayCard = { mode: 'office', band: 'full', dayLabel: '土' };

describe('bandHours', () => {
  it('full / am / pm でレンジが変わる', () => {
    expect(bandHours('full')).toBe('9:00 〜 15:00');
    expect(bandHours('am')).toBe('9:00 〜 12:00');
    expect(bandHours('pm')).toBe('13:00 〜 16:00');
  });
});

describe('buildHeaderDateLabel', () => {
  it('dateISO があれば M月D日(曜) · 打刻', () => {
    expect(
      buildHeaderDateLabel({ ...baseToday, dateISO: '2026-05-02', dayLabel: '土' })
    ).toBe('5月2日(土) · 打刻');
  });

  it('dateISO が無ければ dayLabel のみにフォールバック', () => {
    expect(buildHeaderDateLabel({ ...baseToday, dayLabel: '月' })).toBe(
      '月 · 打刻'
    );
  });
});

describe('timeToMin', () => {
  it('正常な HH:mm を分に変換', () => {
    expect(timeToMin('09:30')).toBe(570);
    expect(timeToMin('0:00')).toBe(0);
    expect(timeToMin('23:59')).toBe(1439);
  });

  it('不正な形式・範囲外は null', () => {
    expect(timeToMin('')).toBeNull();
    expect(timeToMin('9-30')).toBeNull();
    expect(timeToMin('24:00')).toBeNull();
    expect(timeToMin('10:60')).toBeNull();
  });
});

describe('validateTimeEdit', () => {
  const now = 12 * 60; // 12:00

  it('両方空は OK (帰宅は任意)', () => {
    expect(validateTimeEdit('', '', now)).toBeNull();
  });

  it('到着のみで現在以前なら OK', () => {
    expect(validateTimeEdit('09:00', '', now)).toBeNull();
  });

  it('読めない到着/帰宅はそれぞれエラー', () => {
    expect(validateTimeEdit('99:99', '', now)).toBe('到着の時刻が読めません');
    expect(validateTimeEdit('', 'xx', now)).toBe('帰宅の時刻が読めません');
  });

  it('未来時刻は弾く', () => {
    expect(validateTimeEdit('13:00', '', now)).toBe('未来の時刻は記録できません');
    expect(validateTimeEdit('09:00', '13:00', now)).toBe(
      '未来の時刻は記録できません'
    );
  });

  it('帰宅が到着より前ならエラー', () => {
    expect(validateTimeEdit('10:00', '09:00', now)).toBe(
      '帰宅は到着より後にしてください'
    );
  });
});

describe('computeHeroEmoji', () => {
  it('お休みは草', () => {
    expect(
      computeHeroEmoji({ isOff: true, state: 'before', isOffice: true, isHome: false })
    ).toBe('🌿');
  });

  it('未打刻は通所=ドア / 在宅=家', () => {
    expect(
      computeHeroEmoji({ isOff: false, state: 'before', isOffice: true, isHome: false })
    ).toBe('🚪');
    expect(
      computeHeroEmoji({ isOff: false, state: 'before', isOffice: false, isHome: true })
    ).toBe('🏠');
  });

  it('checkedIn は通所=チェック / 在宅=家、checkedOut は月', () => {
    expect(
      computeHeroEmoji({ isOff: false, state: 'checkedIn', isOffice: true, isHome: false })
    ).toBe('✓');
    expect(
      computeHeroEmoji({ isOff: false, state: 'checkedIn', isOffice: false, isHome: true })
    ).toBe('🏠');
    expect(
      computeHeroEmoji({ isOff: false, state: 'checkedOut', isOffice: true, isHome: false })
    ).toBe('🌙');
  });
});
