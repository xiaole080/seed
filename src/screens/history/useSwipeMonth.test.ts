// detectSwipe (純関数) のテスト (history-month-nav-spec T6)。

import { describe, it, expect } from 'vitest';
import { detectSwipe } from './useSwipeMonth';

describe('detectSwipe', () => {
  it('左スワイプ (dx=-60, dy=10) は次の月', () => {
    expect(detectSwipe(-60, 10)).toBe('next');
  });

  it('右スワイプ (dx=+60, dy=10) は前の月', () => {
    expect(detectSwipe(60, 10)).toBe('prev');
  });

  it('垂直成分が大きい (dx=-60, dy=40) なら null (縦スクロール優先)', () => {
    expect(detectSwipe(-60, 40)).toBeNull();
  });

  it('閾値未満 (dx=-30) なら null', () => {
    expect(detectSwipe(-30, 0)).toBeNull();
  });

  it('境界条件: |dx| = 48 ちょうどは発火する', () => {
    expect(detectSwipe(-48, 0)).toBe('next');
    expect(detectSwipe(48, 0)).toBe('prev');
  });

  it('|dx| = |dy| * 2 ちょうど (水平優位でない) は null', () => {
    expect(detectSwipe(-60, 30)).toBeNull();
  });

  // §5-11: 閾値ひとつ手前 (dx=-47) は発火しない
  it('|dx| = 47 (閾値 -1) は null', () => {
    expect(detectSwipe(-47, 0)).toBeNull();
    expect(detectSwipe(47, 0)).toBeNull();
  });

  // §5-11: dy が負 (下方向スクロール) でも垂直成分判定が正しく働く
  it('dy が負でも垂直成分が大きければ null (下方向スクロール誤発火なし)', () => {
    expect(detectSwipe(-60, -40)).toBeNull();
    expect(detectSwipe(60, -40)).toBeNull();
  });

  // §5-11: dy が負でも水平優位なら発火する
  it('dy が負でも水平優位なら発火する', () => {
    expect(detectSwipe(-60, -10)).toBe('next');
    expect(detectSwipe(60, -10)).toBe('prev');
  });

  // §5-11: dx=0 は null
  it('dx=0 は null (動かしていない)', () => {
    expect(detectSwipe(0, 0)).toBeNull();
  });
});
