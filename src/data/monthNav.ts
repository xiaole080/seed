// 年・月(0始まり)の前後移動。年跨ぎ (12月→翌1月 / 1月→前年12月) を正規化する純関数。
// YearMonth 系の責務はこのファイルに集約する (history-month-nav-spec §3 / §8)。

import type { DateRange } from './historyStats';

export interface YearMonth {
  year: number;
  /** 0 = 1月, 11 = 12月 */
  monthIndex0: number;
}

/** {year, monthIndex0} を delta か月だけ移動し、年跨ぎを正規化して返す。 */
export function shiftMonth(
  year: number,
  monthIndex0: number,
  delta: number
): YearMonth {
  const d = new Date(year, monthIndex0 + delta, 1);
  return { year: d.getFullYear(), monthIndex0: d.getMonth() };
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * その暦月の 1日〜末日 (両端含む) を DateRange で返す。
 * 末日は new Date(year, monthIndex0 + 1, 0) で算出 (うるう年対応)。
 */
export function monthRange(ym: YearMonth): DateRange {
  const lastDay = new Date(ym.year, ym.monthIndex0 + 1, 0).getDate();
  const mm = pad2(ym.monthIndex0 + 1);
  return {
    start: `${ym.year}-${mm}-01`,
    end: `${ym.year}-${mm}-${pad2(lastDay)}`,
  };
}

/** 「2026年6月」形式 (月はゼロ埋めしない)。 */
export function formatYearMonth(ym: YearMonth): string {
  return `${ym.year}年${ym.monthIndex0 + 1}月`;
}

/** 'YYYY-MM-DD' → {year, monthIndex0}。 */
export function ymFromISO(isoDate: string): YearMonth {
  const [y, m] = isoDate.split('-').map(Number);
  return { year: y, monthIndex0: m - 1 };
}

/** a < b なら負、等しければ 0、a > b なら正。境界判定に使用。 */
export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.monthIndex0 - b.monthIndex0;
}

/**
 * ISO 日付配列 (daily + attendance の全 date を結合して渡す) の
 * 最小値が属する月を返す。空配列なら null (呼び出し側で「今月」にフォールバック)。
 */
export function oldestRecordMonth(dates: string[]): YearMonth | null {
  if (dates.length === 0) return null;
  let min = dates[0];
  for (const d of dates) {
    if (d < min) min = d;
  }
  return ymFromISO(min);
}
