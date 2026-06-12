// useHistoryScreen の月単位ナビゲーションのテスト (history-month-nav-spec T4)。
// localStorage は store.ts 経由で seed し、読み取り専用であることを前提にする。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  upsertDailyRecord,
  upsertAttendance,
  _resetDaily,
  _resetAttendance,
  type StoredDailyRecord,
} from '../../data/store';
import type { AttendanceMonthlyRecord, MissingnessFlags } from '../../data/types';
import { useHistoryScreen } from './useHistoryScreen';

const NO_MISSING: MissingnessFlags = {
  noRecord: false,
  skippedMood: false,
  skippedPrimaryInfluence: false,
  skippedSleep: false,
  skippedMeal: false,
  skippedExercise: false,
  skippedCondition: false,
  skippedMedication: false,
  skippedAttendance: false,
  skippedNote: false,
};

function daily(date: string): StoredDailyRecord {
  return {
    localRecordId: `r_${date}`,
    date,
    mood: 4,
    primaryInfluence: [],
    missingness: { ...NO_MISSING },
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  };
}

function att(date: string): AttendanceMonthlyRecord {
  return {
    localAttendanceId: `att_${date}`,
    date,
    weekday: 'Mon',
    plannedMode: 'office',
    checkIn: '09:00',
    missingClock: false,
    edited: false,
    exportMonth: date.slice(0, 7),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  // 今日 = 2026-06-12 (今月 = 2026年6月)
  vi.setSystemTime(new Date(2026, 5, 12, 10, 0, 0));
  _resetDaily();
  _resetAttendance();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useHistoryScreen — 月単位ナビゲーション', () => {
  it('初期表示は今月で「次の月」へは進めない', () => {
    upsertDailyRecord(daily('2026-06-10'));
    const { result } = renderHook(() => useHistoryScreen());
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 5 });
    expect(result.current.headerLabel).toBe('2026年6月');
    expect(result.current.canGoNext).toBe(false);
  });

  it('最古月 (2026-03) まで戻ると canGoPrev=false で goPrev は無視される', () => {
    upsertDailyRecord(daily('2026-03-15'));
    upsertDailyRecord(daily('2026-06-10'));
    const { result } = renderHook(() => useHistoryScreen());

    act(() => result.current.goPrev()); // 5月
    act(() => result.current.goPrev()); // 4月
    act(() => result.current.goPrev()); // 3月
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 2 });
    expect(result.current.canGoPrev).toBe(false);

    act(() => result.current.goPrev()); // 境界外 → 無視
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 2 });
  });

  it('通所記録だけの月も最古月の判定対象になる', () => {
    upsertAttendance(att('2026-04-06'));
    upsertDailyRecord(daily('2026-06-10'));
    const { result } = renderHook(() => useHistoryScreen());
    act(() => result.current.goPrev()); // 5月
    expect(result.current.canGoPrev).toBe(true);
    act(() => result.current.goPrev()); // 4月 (通所のみの月)
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 3 });
    expect(result.current.canGoPrev).toBe(false);
    expect(result.current.attendance.map((a) => a.date)).toEqual([
      '2026-04-06',
    ]);
  });

  it('年跨ぎ: 2026年1月から goPrev すると 2025年12月になる', () => {
    vi.setSystemTime(new Date(2026, 0, 15, 10, 0, 0)); // 今日 = 2026-01-15
    upsertDailyRecord(daily('2025-12-01'));
    const { result } = renderHook(() => useHistoryScreen());
    act(() => result.current.goPrev());
    expect(result.current.ym).toEqual({ year: 2025, monthIndex0: 11 });
    expect(result.current.headerLabel).toBe('2025年12月');
  });

  it('データ0件なら今月のみ表示で両方向とも移動不可', () => {
    const { result } = renderHook(() => useHistoryScreen());
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 5 });
    expect(result.current.canGoPrev).toBe(false);
    expect(result.current.canGoNext).toBe(false);
    expect(result.current.summaryText).toContain('まだ記録がありません');
  });

  it('今月の timelineDates は今日まで (未来日を含まない)', () => {
    upsertDailyRecord(daily('2026-06-10'));
    const { result } = renderHook(() => useHistoryScreen());
    const dates = result.current.timelineDates;
    expect(dates[0]).toBe('2026-06-01');
    expect(dates[dates.length - 1]).toBe('2026-06-12');
    expect(dates).not.toContain('2026-06-13');
  });

  it('過去月の timelineDates は 1日〜末日の全日', () => {
    upsertDailyRecord(daily('2026-05-10'));
    const { result } = renderHook(() => useHistoryScreen());
    act(() => result.current.goPrev()); // 2026年5月
    const dates = result.current.timelineDates;
    expect(dates).toHaveLength(31);
    expect(dates[0]).toBe('2026-05-01');
    expect(dates[dates.length - 1]).toBe('2026-05-31');
  });

  it('過去の空月でもクラッシュせず「この月の記録はありません。」', () => {
    upsertDailyRecord(daily('2026-04-10'));
    upsertDailyRecord(daily('2026-06-10'));
    const { result } = renderHook(() => useHistoryScreen());
    act(() => result.current.goPrev()); // 5月 (記録なし)
    expect(result.current.summaryText).toBe('この月の記録はありません。');
    expect(result.current.overview.recordedDays).toBe(0);
    // 空月でも前後移動は可能 (§2.5)
    expect(result.current.canGoPrev).toBe(true);
    expect(result.current.canGoNext).toBe(true);
  });

  // §5-6: 年跨ぎ逆方向 — 12月から goNext すると翌年1月になる
  it('年跨ぎ逆方向: 2025年12月から goNext すると 2026年1月になる', () => {
    // 今日 = 2026-06-12 のまま。最古データを 2025-12 に置き、12月まで戻ってから goNext。
    upsertDailyRecord(daily('2025-12-01'));
    const { result } = renderHook(() => useHistoryScreen());
    // 今月(6月)から 6ステップ戻って 2025-12月へ
    act(() => result.current.goPrev()); // 5月
    act(() => result.current.goPrev()); // 4月
    act(() => result.current.goPrev()); // 3月
    act(() => result.current.goPrev()); // 2月
    act(() => result.current.goPrev()); // 1月
    act(() => result.current.goPrev()); // 2025-12月
    expect(result.current.ym).toEqual({ year: 2025, monthIndex0: 11 });
    expect(result.current.headerLabel).toBe('2025年12月');
    // 下限なのでこれ以上後退できない
    expect(result.current.canGoPrev).toBe(false);
    // 翌月(2026-1)へ goNext できる (境界内)
    expect(result.current.canGoNext).toBe(true);
    act(() => result.current.goNext()); // 2026年1月
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 0 });
    expect(result.current.headerLabel).toBe('2026年1月');
  });

  // §5-8: 月末日数の違い — うるう年 2月(2024-02)の timelineDates が 29日
  it('うるう年 2024-02 の timelineDates は 29日分', () => {
    vi.setSystemTime(new Date(2026, 5, 12, 10, 0, 0)); // 今日 = 2026-06-12
    upsertDailyRecord(daily('2024-02-15'));
    const { result } = renderHook(() => useHistoryScreen());
    // 2024-02 まで一気に移動するのは大変なので、
    // dateRange から monthRange を使って直接検証する代わりに
    // 実際に 2024-02 まで移動して timelineDates 長さを確認する
    // (28ステップ移動: 2026-06 -> 2024-02 = 28ヶ月前)
    for (let i = 0; i < 28; i++) {
      act(() => result.current.goPrev());
    }
    expect(result.current.ym).toEqual({ year: 2024, monthIndex0: 1 });
    expect(result.current.timelineDates).toHaveLength(29);
    expect(result.current.timelineDates[0]).toBe('2024-02-01');
    expect(result.current.timelineDates[28]).toBe('2024-02-29');
  });

  // §5-8: 月末日数の違い — 平年 2月(2026-02)の timelineDates が 28日
  it('平年 2026-02 の timelineDates は 28日分', () => {
    upsertDailyRecord(daily('2026-02-10'));
    const { result } = renderHook(() => useHistoryScreen());
    // 2026-06 → 2026-02 まで 4ステップ
    act(() => result.current.goPrev()); // 5月
    act(() => result.current.goPrev()); // 4月
    act(() => result.current.goPrev()); // 3月
    act(() => result.current.goPrev()); // 2月
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 1 });
    expect(result.current.timelineDates).toHaveLength(28);
    expect(result.current.timelineDates[0]).toBe('2026-02-01');
    expect(result.current.timelineDates[27]).toBe('2026-02-28');
  });

  // §5-10: スワイプと矢印の併用 — 状態が矛盾しない
  it('goPrev と goNext を混用しても状態が矛盾しない', () => {
    upsertDailyRecord(daily('2026-03-01'));
    upsertDailyRecord(daily('2026-06-10'));
    const { result } = renderHook(() => useHistoryScreen());
    // 今月から2ステップ後退
    act(() => result.current.goPrev()); // 5月
    act(() => result.current.goPrev()); // 4月
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 3 });
    // 2ステップ前進 → 今月に戻る
    act(() => result.current.goNext()); // 5月
    act(() => result.current.goNext()); // 6月 (今月)
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 5 });
    expect(result.current.canGoNext).toBe(false);
  });

  // §5-7: localStorage が破損している(空オブジェクトではなく不正 JSON)ときの初期表示
  it('localStorage の daily キーが壊れた JSON でも今月を表示しクラッシュしない', () => {
    localStorage.setItem('seed.daily.v1', '{broken json');
    // storage.ts の loadJson はエラー時に defaultValue を返す設計なのでクラッシュしない
    expect(() => renderHook(() => useHistoryScreen())).not.toThrow();
    const { result } = renderHook(() => useHistoryScreen());
    // 今月が表示され、データ0件相当の挙動
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 5 });
    expect(result.current.canGoPrev).toBe(false);
    expect(result.current.canGoNext).toBe(false);
    localStorage.removeItem('seed.daily.v1');
  });

  // §5-3 + §5-4: 空月でも境界が正しく、前後移動可能
  it('記録0件の過去月でサマリーが空月文言で、前後への移動が両方可能', () => {
    // 最古月=3月、空月=5月、今月=6月
    upsertDailyRecord(daily('2026-03-10'));
    upsertDailyRecord(daily('2026-06-05'));
    const { result } = renderHook(() => useHistoryScreen());
    act(() => result.current.goPrev()); // 5月 (記録なし = 空月)
    expect(result.current.summaryText).toBe('この月の記録はありません。');
    // 空月でも前後両方に移動可能
    expect(result.current.canGoPrev).toBe(true); // 3月・4月がある
    expect(result.current.canGoNext).toBe(true); // 6月がある
    act(() => result.current.goPrev()); // 4月 (記録なし = 空月)
    expect(result.current.canGoPrev).toBe(true); // 3月がある
    act(() => result.current.goPrev()); // 3月 (最古月)
    expect(result.current.canGoPrev).toBe(false); // 下限
  });

  // §5-9: 今月が月の1日の場合 timelineDates が1日だけ (未来日ゼロ)
  it('今日が月の1日なら timelineDates は1件だけ (当日のみ)', () => {
    vi.setSystemTime(new Date(2026, 5, 1, 8, 0, 0)); // 今日 = 2026-06-01
    upsertDailyRecord(daily('2026-06-01'));
    const { result } = renderHook(() => useHistoryScreen());
    const dates = result.current.timelineDates;
    expect(dates).toHaveLength(1);
    expect(dates[0]).toBe('2026-06-01');
    expect(dates).not.toContain('2026-06-02');
  });

  // §5-12: 通所記録のみある月 (daily=0件) の最古月判定 + 通所データ確認
  it('通所記録のみある月を最古月として認識し、その月の通所データが参照できる', () => {
    // daily は 6月、attendance だけ 2026-02 にある
    upsertDailyRecord(daily('2026-06-10'));
    upsertAttendance(att('2026-02-14'));
    const { result } = renderHook(() => useHistoryScreen());
    // 最古月は 2026-02 のはず
    // 今月から 4ステップ戻る: 5月→4月→3月→2月
    act(() => result.current.goPrev()); // 5月
    act(() => result.current.goPrev()); // 4月
    act(() => result.current.goPrev()); // 3月
    act(() => result.current.goPrev()); // 2月
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 1 });
    expect(result.current.canGoPrev).toBe(false); // 最古月
    // 2月の通所データが取れる
    expect(result.current.attendance.map((a) => a.date)).toContain('2026-02-14');
    // daily は0件 → サマリーは空月文言
    expect(result.current.summaryText).toBe('この月の記録はありません。');
  });

  // §5-7 / T4: 未来日しかないデータは今月を下限にして canGoPrev=false
  it('未来日のみの壊れたデータは最古月を今月にフォールバックしてクラッシュしない', () => {
    // 未来日を直接 localStorage に書き込む
    localStorage.setItem(
      'seed.daily.v1',
      JSON.stringify({
        '2099-01-01': {
          localRecordId: 'r_future',
          date: '2099-01-01',
          mood: 3,
          primaryInfluence: [],
          missingness: {
            noRecord: false, skippedMood: false, skippedPrimaryInfluence: false,
            skippedSleep: false, skippedMeal: false, skippedExercise: false,
            skippedCondition: false, skippedMedication: false,
            skippedAttendance: false, skippedNote: false,
          },
          createdAt: '2026-06-12T00:00:00.000Z',
          updatedAt: '2026-06-12T00:00:00.000Z',
        },
      })
    );
    expect(() => renderHook(() => useHistoryScreen())).not.toThrow();
    const { result } = renderHook(() => useHistoryScreen());
    // 今月のまま (未来日を最古月に採用しない)
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 5 });
    expect(result.current.canGoPrev).toBe(false);
    localStorage.removeItem('seed.daily.v1');
  });

  // §5-5: 今月表示中に goNext を複数回呼んでも今月を超えない
  it('今月表示中に goNext を複数回呼んでも今月のまま', () => {
    const { result } = renderHook(() => useHistoryScreen());
    expect(result.current.canGoNext).toBe(false);
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    expect(result.current.ym).toEqual({ year: 2026, monthIndex0: 5 });
    expect(result.current.canGoNext).toBe(false);
  });
});
