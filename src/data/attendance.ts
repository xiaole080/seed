import type {
  AttendanceMode,
  AttendanceMonthlyRecord,
  Schedule,
  TimeBand,
} from './types';

export const DAYS = ['月', '火', '水', '木', '金', '土', '日'] as const;

export const MODE_LABEL: Record<AttendanceMode, string> = {
  office: '通所',
  home:   '在宅',
  off:    '休み',
};

export const MODE_COLOR: Record<
  AttendanceMode,
  { bg: string; fg: string; soft: string }
> = {
  office: { bg: '#7FA982',     fg: '#fff',    soft: '#E3EDDC' },
  home:   { bg: '#E8B873',     fg: '#fff',    soft: '#F5DDB0' },
  off:    { bg: 'transparent', fg: '#5A6A5C', soft: '#F0EEE9' },
};

export const BAND_LABEL: Record<TimeBand, string> = {
  full: '一日',
  am:   '午前のみ',
  pm:   '午後のみ',
};

export const DEFAULT_SCHEDULE: Schedule = {
  0: { mode: 'office', band: 'full' },
  1: { mode: 'office', band: 'full' },
  2: { mode: 'home',   band: 'am' },
  3: { mode: 'office', band: 'full' },
  4: { mode: 'office', band: 'pm' },
  5: { mode: 'off',    band: 'full' },
  6: { mode: 'off',    band: 'full' },
};

/**
 * 例外打刻 (休み予定の日に実際に打刻した) を判定するヘルパー。
 * 予定が `off` + 実打刻が記録されている (actualMode が undefined でない) 場合に true。
 * 集計や支援員側の確認に使う。
 */
export function isExceptionalCheckIn(rec: AttendanceMonthlyRecord): boolean {
  return rec.plannedMode === 'off' && rec.actualMode != null;
}

/**
 * 事務所の休業日判定 (Sprint 2026-05-24 / バグ修正① 確定方針)。
 *  - 土曜・日曜 → 常に休業
 *  - 毎月の「最終金曜日」→ 休業
 *  - 上記以外 → 営業日
 *
 * 「最終金曜日」は「その金曜の 7 日後が翌月かどうか」で判定する
 * (= その月に同じ金曜は次がない)。祝日特別扱いはしない (一律「事務所休業日」表示)。
 *
 * dateISO は YYYY-MM-DD 形式。タイムゾーンずれを避けるため、UTC ではなく
 * ローカル日付として new Date(`${dateISO}T00:00:00`) で解釈する。
 */
export function isOfficeClosed(dateISO: string): boolean {
  const d = new Date(`${dateISO}T00:00:00`);
  const dow = d.getDay(); // 0=Sun, 5=Fri, 6=Sat
  if (dow === 0 || dow === 6) return true;
  if (dow === 5) {
    const next = new Date(d);
    next.setDate(d.getDate() + 7);
    return next.getMonth() !== d.getMonth();
  }
  return false;
}
