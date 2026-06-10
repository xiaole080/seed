// 年・月(0始まり)の前後移動。年跨ぎ (12月→翌1月 / 1月→前年12月) を正規化する純関数。

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
