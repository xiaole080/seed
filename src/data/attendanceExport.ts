// 仕様 §4.3 / §13.2 Phase 3: 月末通所ファイル出力
//
// セルフケア記録 (気分・体調・服薬・自由記述) は含めない。
// 通所予定 + 実打刻 をマージして CSV 1行/日 を出力する。

import { DAYS } from './attendance';
import { listAttendanceByMonth } from './store';
import type {
  AttendanceMonthlyRecord,
  Schedule,
} from './types';

const HEADERS = [
  'date',
  'weekday',
  'planned_mode',
  'planned_band',
  'actual_mode',
  'check_in',
  'check_out',
  'duration_minutes',
  'missing_clock',
  'edited',
] as const;

const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

/**
 * 指定月の AttendanceMonthlyRecord[] を取得する。
 * - 端末に保存済みの実打刻があれば優先 (actualMode / check_in/out / duration)
 * - 無い日は schedule から planned だけ埋める
 */
export function getMonthAttendance(
  schedule: Schedule,
  year: number,
  monthIndex0: number,
): AttendanceMonthlyRecord[] {
  const yyyyMM = `${year}-${pad2(monthIndex0 + 1)}`;
  const stored = new Map(
    listAttendanceByMonth(yyyyMM).map((r) => [r.date, r]),
  );

  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const out: AttendanceMonthlyRecord[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${yyyyMM}-${pad2(day)}`;
    if (stored.has(date)) {
      out.push(stored.get(date)!);
      continue;
    }
    const d = new Date(year, monthIndex0, day);
    const jsDow = d.getDay();
    const scheduleIndex = (jsDow + 6) % 7;
    const slot = schedule[scheduleIndex];
    if (!slot) continue;

    out.push({
      localAttendanceId: `att_${date}`,
      date,
      weekday: WEEKDAY_EN[jsDow],
      plannedMode: slot.mode,
      plannedBand: slot.band,
      actualMode: undefined,
      checkIn: undefined,
      checkOut: undefined,
      durationMinutes: undefined,
      missingClock: slot.mode !== 'off',
      edited: false,
      exportMonth: yyyyMM,
    });
  }
  return out;
}

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function recordsToCsv(records: AttendanceMonthlyRecord[]): string {
  const lines: string[] = [HEADERS.join(',')];
  for (const r of records) {
    lines.push(
      [
        r.date,
        r.weekday,
        r.plannedMode,
        r.plannedBand ?? '',
        r.actualMode ?? '',
        r.checkIn ?? '',
        r.checkOut ?? '',
        r.durationMinutes ?? '',
        r.missingClock,
        r.edited,
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  return lines.join('\n');
}

/** 利用者識別子をファイル名に含める (支援員側で複数人ぶん集めても衝突しない) */
export function attendanceFilename(
  year: number,
  monthIndex0: number,
  nickname?: string,
): string {
  const ym = `${year}-${pad2(monthIndex0 + 1)}`;
  const safe = (nickname ?? '').replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 16);
  return safe
    ? `Seed_attendance_${safe}_${ym}.csv`
    : `Seed_attendance_${ym}.csv`;
}

/** 打刻が一件もない月か (CSV出してもほぼ空の警告に使う) */
export function hasAnyActual(records: AttendanceMonthlyRecord[]): boolean {
  return records.some((r) => r.checkIn != null || r.checkOut != null);
}

/** ブラウザでファイルをダウンロードさせる */
export function downloadCsv(filename: string, csv: string): void {
  // UTF-8 BOM 付与で Excel での文字化けを防ぐ
  const blob = new Blob(['﻿' + csv], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { DAYS };
