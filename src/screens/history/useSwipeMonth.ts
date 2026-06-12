import { useRef } from 'react';
import type { TouchEvent } from 'react';

// 横スワイプでの月移動 (history-month-nav-spec T6 / §2.3)。
//  - 補助操作。矢印ボタン (MonthNavHeader) だけでも成立する独立実装。
//  - 縦スクロールとの衝突回避: |dx| >= 48px かつ |dx| > |dy| * 2 のみ発火。
//  - 境界越え (今月 / 最古月) は呼び出し側の goPrev/goNext のガードで no-op。

/** スワイプ閾値: 水平移動量の最小値 (px) */
const MIN_DX = 48;

/**
 * 移動量から月移動の向きを判定する純関数。
 *  - 左スワイプ (dx < 0) = 次の月 / 右スワイプ (dx > 0) = 前の月。
 *  - 閾値未満・垂直成分が支配的なら null (縦スクロール優先)。
 */
export function detectSwipe(dx: number, dy: number): 'prev' | 'next' | null {
  if (Math.abs(dx) < MIN_DX) return null;
  if (Math.abs(dx) <= Math.abs(dy) * 2) return null;
  return dx < 0 ? 'next' : 'prev';
}

/**
 * touchstart〜touchend の単一ジェスチャでスワイプ判定する touch ハンドラを返す。
 * マルチタッチは無視する。
 */
export function useSwipeMonth(onPrev: () => void, onNext: () => void) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) {
      // マルチタッチが始まったらこのジェスチャは無効化する
      startRef.current = null;
      return;
    }
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const start = startRef.current;
    startRef.current = null;
    if (!start || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    const dir = detectSwipe(t.clientX - start.x, t.clientY - start.y);
    if (dir === 'prev') onPrev();
    else if (dir === 'next') onNext();
  };

  const onTouchCancel = () => {
    startRef.current = null;
  };

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
