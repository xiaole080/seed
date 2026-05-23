import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getMonthAttendance,
  recordsToCsv,
  attendanceFilename,
  hasAnyActual,
  downloadCsv,
} from './attendanceExport';
import { DEFAULT_SCHEDULE } from './attendance';
import { upsertAttendance, _resetAttendance } from './store';
import type { AttendanceMonthlyRecord } from './types';

function att(
  date: string,
  over: Partial<AttendanceMonthlyRecord> = {},
): AttendanceMonthlyRecord {
  return {
    localAttendanceId: `att_${date}`,
    date,
    weekday: 'Mon',
    plannedMode: 'office',
    plannedBand: 'full',
    missingClock: false,
    edited: false,
    exportMonth: date.slice(0, 7),
    ...over,
  };
}

beforeEach(() => {
  _resetAttendance();
});

describe('getMonthAttendance', () => {
  it('指定月の全日を返す (2026-05 は 31 日)', () => {
    const rows = getMonthAttendance(DEFAULT_SCHEDULE, 2026, 4);
    expect(rows).toHaveLength(31);
    expect(rows[0].date).toBe('2026-05-01');
    expect(rows[30].date).toBe('2026-05-31');
  });

  it('保存済みの実打刻を予定より優先する', () => {
    upsertAttendance(
      att('2026-05-25', { actualMode: 'office', checkIn: '10:02', checkOut: '15:31' }),
    );
    const rows = getMonthAttendance(DEFAULT_SCHEDULE, 2026, 4);
    const day25 = rows.find((r) => r.date === '2026-05-25');
    expect(day25?.checkIn).toBe('10:02');
    expect(day25?.actualMode).toBe('office');
  });

  it('打刻が無い通所予定日は missingClock=true で予定だけ埋める', () => {
    const rows = getMonthAttendance(DEFAULT_SCHEDULE, 2026, 4);
    // 2026-05-25 は月曜 = 通所予定、打刻なし
    const day25 = rows.find((r) => r.date === '2026-05-25');
    expect(day25?.plannedMode).toBe('office');
    expect(day25?.checkIn).toBeUndefined();
    expect(day25?.missingClock).toBe(true);
    // 2026-05-23 は土曜 = 休み → missingClock=false
    const day23 = rows.find((r) => r.date === '2026-05-23');
    expect(day23?.plannedMode).toBe('off');
    expect(day23?.missingClock).toBe(false);
  });
});

describe('recordsToCsv', () => {
  it('1 行目はヘッダ', () => {
    const csv = recordsToCsv([]);
    expect(csv).toBe(
      'date,weekday,planned_mode,planned_band,actual_mode,check_in,check_out,duration_minutes,missing_clock,edited',
    );
  });

  it('レコードを 1 行/日 に整形する', () => {
    const csv = recordsToCsv([
      att('2026-05-25', {
        actualMode: 'office',
        checkIn: '10:02',
        checkOut: '15:31',
        durationMinutes: 329,
      }),
    ]);
    const lines = csv.split('\n');
    expect(lines[1]).toBe(
      '2026-05-25,Mon,office,full,office,10:02,15:31,329,false,false',
    );
  });

  it('未入力の任意項目は空文字になる', () => {
    const csv = recordsToCsv([
      att('2026-05-01', { plannedBand: undefined, plannedMode: 'off' }),
    ]);
    // planned_band, actual_mode, check_in, check_out, duration が空
    expect(csv.split('\n')[1]).toBe(
      '2026-05-01,Mon,off,,,,,,false,false',
    );
  });

  it('csvEscape: カンマを含む値は引用符でくくる', () => {
    const csv = recordsToCsv([att('2026-05-01', { weekday: 'a,b' })]);
    expect(csv).toContain('"a,b"');
  });

  it('csvEscape: 引用符は二重化する', () => {
    const csv = recordsToCsv([att('2026-05-01', { weekday: 'a"b' })]);
    expect(csv).toContain('"a""b"');
  });
});

describe('attendanceFilename', () => {
  it('ニックネーム無しなら年月のみ', () => {
    expect(attendanceFilename(2026, 4)).toBe('Seed_attendance_2026-05.csv');
  });

  it('ニックネームをファイル名に含める', () => {
    expect(attendanceFilename(2026, 4, 'はる')).toBe(
      'Seed_attendance_はる_2026-05.csv',
    );
  });

  it('ファイル名に使えない文字を除去する', () => {
    expect(attendanceFilename(2026, 4, 'a/b c!')).toBe(
      'Seed_attendance_abc_2026-05.csv',
    );
  });

  it('長いニックネームは 16 文字に切り詰める', () => {
    const name = 'あ'.repeat(40);
    const result = attendanceFilename(2026, 4, name);
    expect(result).toBe(`Seed_attendance_${'あ'.repeat(16)}_2026-05.csv`);
  });

  it('除去後に空になるニックネームは付けない', () => {
    expect(attendanceFilename(2026, 4, '!!!')).toBe(
      'Seed_attendance_2026-05.csv',
    );
  });
});

describe('hasAnyActual', () => {
  it('打刻が 1 件でもあれば true', () => {
    expect(hasAnyActual([att('2026-05-01'), att('2026-05-02', { checkIn: '9:00' })])).toBe(
      true,
    );
  });

  it('打刻が皆無なら false', () => {
    expect(hasAnyActual([att('2026-05-01'), att('2026-05-02')])).toBe(false);
  });
});

describe('downloadCsv', () => {
  it('ダウンロードを発火し object URL を生成する', () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    downloadCsv('test.csv', 'a,b\n1,2');
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('Excel の文字化け防止に UTF-8 BOM 付き Blob を生成する', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadCsv('t.csv', 'x');
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    // 'x' (1 byte) + UTF-8 BOM (EF BB BF = 3 bytes) = 4 bytes
    expect(blob.size).toBe(4);
    expect(blob.type).toContain('utf-8');
  });
});
