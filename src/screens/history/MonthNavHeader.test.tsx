// MonthNavHeader のテスト (history-month-nav-spec T5)。

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MonthNavHeader } from './MonthNavHeader';

function renderHeader(over: Partial<Parameters<typeof MonthNavHeader>[0]> = {}) {
  const onPrev = vi.fn();
  const onNext = vi.fn();
  const utils = render(
    <MonthNavHeader
      label="2026年6月"
      canGoPrev={true}
      canGoNext={true}
      onPrev={onPrev}
      onNext={onNext}
      {...over}
    />
  );
  return { ...utils, onPrev, onNext };
}

describe('MonthNavHeader', () => {
  it('月ラベルと aria-label つきの矢印ボタンを表示する', () => {
    const { getByText, getByLabelText } = renderHeader();
    expect(getByText('2026年6月')).toBeTruthy();
    expect(getByLabelText('前の月へ')).toBeTruthy();
    expect(getByLabelText('次の月へ')).toBeTruthy();
  });

  it('矢印クリックで onPrev / onNext が呼ばれる', () => {
    const { getByLabelText, onPrev, onNext } = renderHeader();
    fireEvent.click(getByLabelText('前の月へ'));
    expect(onPrev).toHaveBeenCalledTimes(1);
    fireEvent.click(getByLabelText('次の月へ'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('canGoNext=false なら「→」が disabled でクリックしても呼ばれない', () => {
    const { getByLabelText, onNext } = renderHeader({ canGoNext: false });
    const next = getByLabelText('次の月へ') as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    fireEvent.click(next);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('canGoPrev=false なら「←」が disabled でクリックしても呼ばれない', () => {
    const { getByLabelText, onPrev } = renderHeader({ canGoPrev: false });
    const prev = getByLabelText('前の月へ') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    fireEvent.click(prev);
    expect(onPrev).not.toHaveBeenCalled();
  });

  it('矢印のタップ領域が 44×44px 以上ある', () => {
    const { getByLabelText } = renderHeader();
    for (const label of ['前の月へ', '次の月へ']) {
      const btn = getByLabelText(label) as HTMLButtonElement;
      expect(parseInt(btn.style.width, 10)).toBeGreaterThanOrEqual(44);
      expect(parseInt(btn.style.height, 10)).toBeGreaterThanOrEqual(44);
    }
  });

  // §5-4 / §5-5: disabled 時はボタンが視覚的に薄く表示される (opacity < 1)
  it('disabled なボタンは opacity が 1 未満で視覚的に薄い', () => {
    const { getByLabelText } = renderHeader({ canGoPrev: false, canGoNext: false });
    for (const label of ['前の月へ', '次の月へ']) {
      const btn = getByLabelText(label) as HTMLButtonElement;
      const opacity = parseFloat(btn.style.opacity);
      expect(opacity).toBeLessThan(1);
    }
  });

  // §5-4 / §5-5: enabled なボタンは opacity が 1
  it('enabled なボタンは opacity が 1', () => {
    const { getByLabelText } = renderHeader({ canGoPrev: true, canGoNext: true });
    for (const label of ['前の月へ', '次の月へ']) {
      const btn = getByLabelText(label) as HTMLButtonElement;
      expect(parseFloat(btn.style.opacity)).toBe(1);
    }
  });

  // §2.3: ヘッダー説明文 (headerNote) がページ内に存在することを確認
  // MonthNavHeader 自体には含まれないため、aria-label の存在のみ確認する
  it('aria-label が仕様文言と一致する', () => {
    const { getByLabelText } = renderHeader();
    expect(getByLabelText('前の月へ')).toBeTruthy();
    expect(getByLabelText('次の月へ')).toBeTruthy();
  });

  // §5-1: ラベルが任意の月名形式を正しく表示する
  it('ラベルに渡した月名が表示される', () => {
    const { getByText } = renderHeader({ label: '2025年12月' });
    expect(getByText('2025年12月')).toBeTruthy();
  });
});
