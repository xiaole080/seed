// きろく画面のパーソナライズ用 純ロジック。
//
// すべて副作用のない純関数 (引数で受け取った配列だけを参照する)。
// localStorage の読み取り・書き込み・外部送信は一切行わない。
// 入力は HistoryScreen 側で store.ts の listDailyRecords() /
// listAttendanceByMonth() から取得して渡す。
//
// qa-tester が単体テストするため、テストしやすい純関数のみを export する。

import type {
  ActivityFlag,
  AttendanceMonthlyRecord,
  ConditionFlag,
  MealStatus,
  MedicationStatus,
  Mood,
  NightAwakenings,
  PrimaryInfluence,
  SleepIssue,
} from './types';
import type { StoredDailyRecord } from './store';

// ── 期間モード ───────────────────────────────────────────────
export type HistoryRange = '7d' | '14d' | 'month';

export interface DateRange {
  /** 期間開始日 (含む) YYYY-MM-DD */
  start: string;
  /** 期間終了日 (含む) YYYY-MM-DD */
  end: string;
}

// ── 日付ユーティリティ (副作用なし) ──────────────────────────

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function isoFromYMD(y: number, m1: number, d: number): string {
  // m1 は 1 始まり月
  const dt = new Date(y, m1 - 1, d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

/** ISO 文字列を起点に offsetDays 日ずらした ISO を返す */
export function shiftISO(isoDate: string, offsetDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return isoFromYMD(y, m, d + offsetDays);
}

/**
 * 期間モードと「今日」から日付レンジを算出する。
 *  - 7d / 14d : 今日を含む過去 7 / 14 日。
 *  - month    : 当月 1 日 〜 今日。
 */
export function rangeFor(mode: HistoryRange, todayISODate: string): DateRange {
  if (mode === 'month') {
    const [y, m] = todayISODate.split('-').map(Number);
    return { start: isoFromYMD(y, m, 1), end: todayISODate };
  }
  const span = mode === '7d' ? 7 : 14;
  return { start: shiftISO(todayISODate, -(span - 1)), end: todayISODate };
}

/** date が [start, end] (両端含む) に入るか */
export function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

/** 期間内のすべての日付を YYYY-MM-DD で列挙する (昇順) */
export function datesInRange(range: DateRange): string[] {
  const out: string[] = [];
  let cur = range.start;
  // 上限を仕様の最大 (今月 = 31日) より少し余裕を見て 366 で打ち切る
  for (let i = 0; i < 366; i++) {
    out.push(cur);
    if (cur >= range.end) break;
    cur = shiftISO(cur, 1);
  }
  return out;
}

/** レンジが触れる "YYYY-MM" の一覧 (通所ストアは月単位取得のため) */
export function monthsInRange(range: DateRange): string[] {
  const months: string[] = [];
  let [y, m] = range.start.split('-').map(Number);
  const [ey, em] = range.end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${pad2(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

// ── 期間フィルタ ─────────────────────────────────────────────

/** 期間内の日別記録だけを日付昇順で返す */
export function filterDailyByRange(
  records: StoredDailyRecord[],
  range: DateRange,
): StoredDailyRecord[] {
  return records
    .filter((r) => inRange(r.date, range))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** 期間内の通所記録だけを日付昇順で返す (重複日は後勝ちで1件に集約) */
export function filterAttendanceByRange(
  records: AttendanceMonthlyRecord[],
  range: DateRange,
): AttendanceMonthlyRecord[] {
  const byDate: Record<string, AttendanceMonthlyRecord> = {};
  for (const r of records) {
    if (inRange(r.date, range)) byDate[r.date] = r;
  }
  return Object.values(byDate).sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ── 記録した日数 / 気分 ──────────────────────────────────────

/** 期間内で記録があったユニーク日数 */
export function countRecordedDaysInRange(records: StoredDailyRecord[]): number {
  return new Set(records.map((r) => r.date)).size;
}

export interface MoodPoint {
  date: string;
  mood: Mood;
}

/**
 * 気分が「記録された」日だけを時系列で返す。
 *  - missingness.skippedMood === true の日は除外。
 *  - mood が 1〜5 の範囲外なら除外 (壊れたデータ対策)。
 * 未記録日は要素として返さない (0/3 などで補完しない)。
 */
export function moodSeries(records: StoredDailyRecord[]): MoodPoint[] {
  return records
    .filter((r) => !r.missingness?.skippedMood)
    .filter((r) => r.mood >= 1 && r.mood <= 5)
    .map((r) => ({ date: r.date, mood: r.mood }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * 記録した日の平均気分。未記録日を 0 扱いしない。
 * 記録が 0 件なら null を返す (NaN を返さない / 呼び出し側で「—」表示)。
 */
export function averageMood(records: StoredDailyRecord[]): number | null {
  const series = moodSeries(records);
  if (series.length === 0) return null;
  const sum = series.reduce((acc, p) => acc + p.mood, 0);
  return Math.round((sum / series.length) * 10) / 10;
}

// ── 影響要因ランキング ───────────────────────────────────────

export interface InfluenceCount {
  id: PrimaryInfluence;
  count: number;
}

/**
 * primaryInfluence を全記録分フラット化して頻度集計。
 * 頻度降順、同数は最初に出現した順 (安定ソート)。
 */
export function influenceRanking(
  records: StoredDailyRecord[],
): InfluenceCount[] {
  const counts: Record<string, number> = {};
  const order: PrimaryInfluence[] = [];
  for (const r of records) {
    for (const inf of r.primaryInfluence ?? []) {
      if (!(inf in counts)) {
        counts[inf] = 0;
        order.push(inf);
      }
      counts[inf] += 1;
    }
  }
  return order
    .map((id) => ({ id, count: counts[id] }))
    .sort((a, b) => b.count - a.count);
}

// ── 通所リズム ───────────────────────────────────────────────

export type AttendanceDayStatus =
  | 'attended' // 通所 / 在宅で実績あり
  | 'planned' // 予定はあるが実績未確定
  | 'off' // 予定が休み
  | 'unclocked'; // 予定ありで打刻欠落

export interface AttendanceDay {
  date: string;
  status: AttendanceDayStatus;
  plannedMode: AttendanceMonthlyRecord['plannedMode'];
  actualMode?: AttendanceMonthlyRecord['actualMode'];
  checkIn?: string;
  checkOut?: string;
}

/**
 * 通所レコード 1件の状態を分類する。
 * 「欠席」「休んだ」と断定せず、打刻欠落は 'unclocked' とする。
 */
export function classifyAttendance(
  rec: AttendanceMonthlyRecord,
): AttendanceDayStatus {
  const planned = rec.plannedMode ?? 'off';
  const hasActual =
    rec.actualMode != null || rec.checkIn != null || rec.checkOut != null;
  if (hasActual) return 'attended';
  if (planned === 'off') return 'off';
  if (rec.missingClock) return 'unclocked';
  return 'planned';
}

export interface AttendanceSummary {
  days: AttendanceDay[];
  attended: number;
  planned: number;
  off: number;
  unclocked: number;
}

/** 期間内の通所レコードを状態分類してまとめる */
export function attendanceSummary(
  records: AttendanceMonthlyRecord[],
): AttendanceSummary {
  const days: AttendanceDay[] = records
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((r) => ({
      date: r.date,
      status: classifyAttendance(r),
      plannedMode: r.plannedMode,
      actualMode: r.actualMode,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
    }));
  const summary: AttendanceSummary = {
    days,
    attended: 0,
    planned: 0,
    off: 0,
    unclocked: 0,
  };
  for (const d of days) summary[d.status] += 1;
  return summary;
}

// ── 記録項目別の傾向集計 ─────────────────────────────────────

/** 汎用: 文字列配列の頻度を降順で集計 (安定ソート) */
export function frequency<T extends string>(
  values: T[],
): { id: T; count: number }[] {
  const counts: Record<string, number> = {};
  const order: T[] = [];
  for (const v of values) {
    if (!(v in counts)) {
      counts[v] = 0;
      order.push(v);
    }
    counts[v] += 1;
  }
  return order
    .map((id) => ({ id, count: counts[id] }))
    .sort((a, b) => b.count - a.count);
}

/** "HH:mm" 群の平均時刻を "HH:mm" で返す。1件も無ければ null */
export function averageTime(times: (string | undefined)[]): string | null {
  const mins: number[] = [];
  for (const t of times) {
    if (!t) continue;
    const [h, m] = t.split(':').map(Number);
    // コロン無し "12" や 空白 "   " では m が undefined になり、
    // h * 60 + undefined = NaN になる。合算結果が NaN なら除外する。
    const total = h * 60 + m;
    if (Number.isNaN(total)) continue;
    mins.push(total);
  }
  if (mins.length === 0) return null;
  const avg = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length);
  return `${pad2(Math.floor(avg / 60) % 24)}:${pad2(avg % 60)}`;
}

export interface SleepStats {
  recordedDays: number;
  avgBedtime: string | null;
  avgWakeTime: string | null;
  issues: { id: SleepIssue; count: number }[];
  awakenings: { id: NightAwakenings; count: number }[];
}

/** 睡眠の傾向集計。記録がある日のみを母数にする。 */
export function sleepStats(records: StoredDailyRecord[]): SleepStats {
  const withSleep = records.filter((r) => r.sleep != null);
  const issues: SleepIssue[] = [];
  const awakenings: NightAwakenings[] = [];
  for (const r of withSleep) {
    for (const i of r.sleep?.sleepIssues ?? []) issues.push(i);
    if (r.sleep?.nightAwakenings) awakenings.push(r.sleep.nightAwakenings);
  }
  return {
    recordedDays: withSleep.length,
    avgBedtime: averageTime(withSleep.map((r) => r.sleep?.bedtime)),
    avgWakeTime: averageTime(withSleep.map((r) => r.sleep?.wakeTime)),
    issues: frequency(issues),
    awakenings: frequency(awakenings),
  };
}

export interface MealStats {
  recordedDays: number;
  statuses: { id: MealStatus; count: number }[];
}

/** 食事の傾向集計。mealStatus を記録できた日のみ母数。 */
export function mealStats(records: StoredDailyRecord[]): MealStats {
  const withMeal = records.filter((r) => r.meal != null);
  const statuses: MealStatus[] = [];
  for (const r of withMeal) {
    if (r.meal?.mealStatus) statuses.push(r.meal.mealStatus);
  }
  return { recordedDays: withMeal.length, statuses: frequency(statuses) };
}

export interface ExerciseStats {
  recordedDays: number;
  activities: { id: ActivityFlag; count: number }[];
}

/** 運動・活動の傾向集計。activityFlags の頻度。 */
export function exerciseStats(records: StoredDailyRecord[]): ExerciseStats {
  const withEx = records.filter((r) => r.exercise != null);
  const flags: ActivityFlag[] = [];
  for (const r of withEx) {
    for (const f of r.exercise?.activityFlags ?? []) flags.push(f);
  }
  return { recordedDays: withEx.length, activities: frequency(flags) };
}

export interface ConditionStats {
  recordedDays: number;
  flags: { id: ConditionFlag; count: number }[];
}

/** 体調の傾向集計。conditionFlags の頻度 (「特になし」も中立に数える)。 */
export function conditionStats(records: StoredDailyRecord[]): ConditionStats {
  const withCond = records.filter((r) => r.condition != null);
  const flags: ConditionFlag[] = [];
  for (const r of withCond) {
    for (const f of r.condition?.conditionFlags ?? []) flags.push(f);
  }
  return { recordedDays: withCond.length, flags: frequency(flags) };
}

export interface MedicationStats {
  recordedDays: number;
  statuses: { id: MedicationStatus; count: number }[];
}

/**
 * 服薬の傾向集計。medicationStatus の分布のみ。
 * 薬名・用量などは StoredDailyRecord に存在せず、ここでも扱わない。
 */
export function medicationStats(
  records: StoredDailyRecord[],
): MedicationStats {
  const withMed = records.filter((r) => r.medication != null);
  const statuses: MedicationStatus[] = [];
  for (const r of withMed) {
    if (r.medication?.medicationStatus) {
      statuses.push(r.medication.medicationStatus);
    }
  }
  return { recordedDays: withMed.length, statuses: frequency(statuses) };
}

// ── サマリー判定用の軽い指標 ─────────────────────────────────

export interface RangeOverview {
  recordedDays: number;
  moodCount: number;
  averageMood: number | null;
  sleepRecordedDays: number;
  attendedDays: number;
  influenceTop: PrimaryInfluence | null;
}

/** サマリー文の選択に使う、期間全体の軽い指標をまとめて返す */
export function rangeOverview(
  daily: StoredDailyRecord[],
  attendance: AttendanceMonthlyRecord[],
): RangeOverview {
  const series = moodSeries(daily);
  const att = attendanceSummary(attendance);
  const inf = influenceRanking(daily);
  return {
    recordedDays: countRecordedDaysInRange(daily),
    moodCount: series.length,
    averageMood: averageMood(daily),
    sleepRecordedDays: daily.filter((r) => r.sleep != null).length,
    attendedDays: att.attended,
    influenceTop: inf.length > 0 ? inf[0].id : null,
  };
}
