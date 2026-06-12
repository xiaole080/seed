import { useMemo, useState } from 'react';
import {
  listDailyRecords,
  listAttendanceByMonth,
  listAllAttendance,
  todayISO,
} from '../../data/store';
import type { StoredDailyRecord } from '../../data/store';
import {
  monthsInRange,
  datesInRange,
  filterDailyByRange,
  filterAttendanceByRange,
  rangeOverview,
} from '../../data/historyStats';
import {
  shiftMonth,
  monthRange,
  formatYearMonth,
  ymFromISO,
  compareYearMonth,
  oldestRecordMonth,
  type YearMonth,
} from '../../data/monthNav';
import { buildSummaryText } from '../../data/historyView';

/**
 * HistoryScreen のデータ読み込みと月単位ナビゲーションをまとめたフック
 * (history-month-nav-spec T4)。
 * localStorage の読み取りのみ (書き込み・外部送信はしない)。
 *  - 初期表示は常に今月。上限 = 今月 / 下限 = データ最古月。
 */
export function useHistoryScreen() {
  const today = useMemo(() => todayISO(), []);
  const todayYm = useMemo(() => ymFromISO(today), [today]);
  const [ym, setYm] = useState<YearMonth>(todayYm);

  // localStorage 読み取りは1回だけ。月切替は下の useMemo で再計算する。
  const allDaily = useMemo<StoredDailyRecord[]>(() => listDailyRecords(), []);

  // データ最古月 (daily + attendance の両方)。無ければ今月にフォールバック。
  const oldestYm = useMemo<YearMonth>(() => {
    const dates = [
      ...allDaily.map((d) => d.date),
      ...listAllAttendance().map((a) => a.date),
    ];
    const oldest = oldestRecordMonth(dates);
    // 未来日しか無い壊れデータでも今月より先へは下げない
    if (oldest == null || compareYearMonth(oldest, todayYm) > 0) {
      return todayYm;
    }
    return oldest;
  }, [allDaily, todayYm]);

  const canGoPrev = compareYearMonth(oldestYm, ym) < 0;
  const canGoNext = compareYearMonth(ym, todayYm) < 0;

  const goPrev = () => {
    if (canGoPrev) setYm(shiftMonth(ym.year, ym.monthIndex0, -1));
  };
  const goNext = () => {
    if (canGoNext) setYm(shiftMonth(ym.year, ym.monthIndex0, +1));
  };

  const dateRange = useMemo(() => monthRange(ym), [ym]);

  // 時系列に未来日を出さない: 今月のみ「今日」でクランプする (§2.1)。
  const timelineDates = useMemo(() => {
    const all = datesInRange(dateRange);
    return compareYearMonth(ym, todayYm) === 0
      ? all.filter((d) => d <= today)
      : all;
  }, [dateRange, ym, todayYm, today]);

  const daily = useMemo(
    () => filterDailyByRange(allDaily, dateRange),
    [allDaily, dateRange]
  );

  // 通所ストアは月単位取得 → レンジが触れる月をすべて読み、レンジで再フィルタ。
  const attendance = useMemo(() => {
    const merged = monthsInRange(dateRange).flatMap((m) =>
      listAttendanceByMonth(m)
    );
    return filterAttendanceByRange(merged, dateRange);
  }, [dateRange]);

  const overview = useMemo(
    () => rangeOverview(daily, attendance),
    [daily, attendance]
  );

  const summaryText = useMemo(
    () => buildSummaryText(overview, ym, todayYm),
    [overview, ym, todayYm]
  );

  return {
    ym,
    headerLabel: formatYearMonth(ym),
    canGoPrev,
    canGoNext,
    goPrev,
    goNext,
    dateRange,
    timelineDates,
    daily,
    attendance,
    overview,
    summaryText,
  };
}
