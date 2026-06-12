import type { AppState } from '../../data/appState';
import { diffMinutes } from '../../data/appState';
import type {
  AttendanceMonthlyRecord,
  AttendanceState,
  ClosedDayActivity,
  TodayCard,
} from '../../data/types';
import {
  deleteAttendance,
  getAttendance,
  nowHHmm,
  scheduleSlotFor,
  setClosedDayActivity,
  todayISO,
  upsertAttendance,
  weekdayEnFor,
} from '../../data/store';
import { logCheckIn, logCheckOut } from '../../api/sheets';

interface UseAttendanceActionsParams {
  state: AppState;
  today: TodayCard;
  update: (patch: Partial<AppState>) => void;
  bumpStore: () => void;
}

/**
 * 通所打刻まわりのアクション (A1/A3/T1-C/T3-B/案X)。
 * 端末ストアへの書き込みと Sheets ログ送信を行い、状態は親の update/bumpStore へ委譲する。
 */
export function useAttendanceActions({
  state,
  today,
  update,
  bumpStore,
}: UseAttendanceActionsParams) {
  const ensureTodayAttendance = (): AttendanceMonthlyRecord => {
    const date = todayISO();
    const existing = getAttendance(date);
    if (existing) return existing;
    const slot = scheduleSlotFor(date, state.schedule);
    const exportMonth = date.slice(0, 7); // YYYY-MM
    const rec: AttendanceMonthlyRecord = {
      localAttendanceId: `att_${date}`,
      date,
      weekday: weekdayEnFor(date),
      plannedMode: slot?.mode ?? 'off',
      plannedBand: slot?.band,
      actualMode: undefined,
      checkIn: undefined,
      checkOut: undefined,
      durationMinutes: undefined,
      // 予定が休みでなく実打刻もまだ → 未打刻フラグ true
      missingClock: (slot?.mode ?? 'off') !== 'off',
      edited: false,
      exportMonth,
    };
    upsertAttendance(rec);
    return rec;
  };

  const handleCheckIn = () => {
    update({ attendanceState: 'checkedIn' });
    const time = nowHHmm();
    const rec = ensureTodayAttendance();
    // T6/T7: 予定が休み (off) の日でも「やっぱり通所する」で進入したら例外打刻。
    // actualMode は 'office' を入れる (plannedMode='off' + actualMode='office' で識別)。
    const actual: TodayCard['mode'] =
      today.mode === 'off' ? 'office' : today.mode;
    upsertAttendance({
      ...rec,
      actualMode: actual,
      checkIn: time,
      missingClock: false,
    });
    bumpStore();
    logCheckIn(
      { mode: actual, band: today.band, state: 'checkedIn', time },
      state.nickname
    );
  };

  const handleCheckOut = () => {
    update({ attendanceState: 'checkedOut' });
    const time = nowHHmm();
    const rec = ensureTodayAttendance();
    const checkIn = rec.checkIn;
    const durationMinutes =
      checkIn != null ? diffMinutes(checkIn, time) : undefined;
    // T6/T7: 退室時も例外打刻 (planned=off) の場合は actualMode='office' に揃える。
    const actual: TodayCard['mode'] =
      rec.actualMode ?? (today.mode === 'off' ? 'office' : today.mode);
    upsertAttendance({
      ...rec,
      actualMode: actual,
      checkOut: time,
      durationMinutes,
      missingClock: rec.checkIn == null, // 入室時刻が無いまま退室は未打刻扱い
    });
    bumpStore();
    logCheckOut(
      { mode: actual, band: today.band, state: 'checkedOut', time },
      state.nickname
    );
  };

  // T1-C: 「時刻を手で直す」インライン編集の保存。Sheets への再送は行わない (§13.2)。
  const handleTimeEdit = (next: { checkIn?: string; checkOut?: string }) => {
    const rec = ensureTodayAttendance();
    const checkIn = next.checkIn;
    const checkOut = next.checkOut;
    const durationMinutes =
      checkIn != null && checkOut != null
        ? diffMinutes(checkIn, checkOut)
        : undefined;
    upsertAttendance({
      ...rec,
      checkIn,
      checkOut,
      durationMinutes,
      missingClock: checkIn == null,
      edited: true,
    });
    const nextState: AttendanceState =
      checkOut != null ? 'checkedOut' : checkIn != null ? 'checkedIn' : 'before';
    update({ attendanceState: nextState });
    bumpStore();
  };

  // T3-B: 今日の打刻を丸ごと取り消す。Sheets 既送信ぶんはここでは取り消せない (T3-C)。
  const handleDeleteToday = () => {
    deleteAttendance(todayISO());
    update({ attendanceState: 'before' });
    bumpStore();
  };

  // 案 X: 事務所休業日の「軽い記録」を localStorage にだけ保存 (Sheets/CSV へ流さない)。
  const handleClosedDayActivity = (value: ClosedDayActivity) => {
    setClosedDayActivity(todayISO(), value);
    bumpStore();
  };

  return {
    handleCheckIn,
    handleCheckOut,
    handleTimeEdit,
    handleDeleteToday,
    handleClosedDayActivity,
  };
}
