import { useMemo, useState } from 'react';
import {
  listDailyRecords,
  listAttendanceByMonth,
  todayISO,
} from '../../data/store';
import type { StoredDailyRecord } from '../../data/store';
import {
  rangeFor,
  monthsInRange,
  filterDailyByRange,
  filterAttendanceByRange,
  rangeOverview,
  type HistoryRange,
} from '../../data/historyStats';
import { buildSummaryText } from '../../data/historyView';

/**
 * HistoryScreen のデータ読み込みと期間切替をまとめたフック。
 * localStorage の読み取りのみ (書き込み・外部送信はしない)。
 */
export function useHistoryScreen(initialRange: HistoryRange) {
  const [range, setRange] = useState<HistoryRange>(initialRange);

  // localStorage 読み取りは1回だけ。期間切替は下の useMemo で再計算する。
  const allDaily = useMemo<StoredDailyRecord[]>(() => listDailyRecords(), []);
  const today = useMemo(() => todayISO(), []);

  const dateRange = useMemo(() => rangeFor(range, today), [range, today]);

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
    () => buildSummaryText(overview, range),
    [overview, range]
  );

  return {
    range,
    setRange,
    dateRange,
    daily,
    attendance,
    overview,
    summaryText,
  };
}
