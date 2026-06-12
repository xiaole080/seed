import { useEffect, useState } from 'react';
import { MODE_COLOR, isOfficeClosed } from '../../data/attendance';
import type { AttendanceMode, AttendanceState, TodayCard } from '../../data/types';
import {
  buildHeaderDateLabel,
  computeHeroEmoji,
  validateTimeEdit,
} from '../../data/checkInView';

interface UseCheckInScreenParams {
  today: TodayCard;
  state: AttendanceState;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onTimeEdit?: (next: { checkIn?: string; checkOut?: string }) => void;
  onDelete?: () => void;
}

/**
 * CheckInScreen の状態・派生値・アクションをまとめたカスタムフック。
 * 表示は CheckInScreen / checkin 配下のコンポーネントに残す。
 */
export function useCheckInScreen({
  today,
  state,
  onCheckIn,
  onCheckOut,
  onTimeEdit,
  onDelete,
}: UseCheckInScreenParams) {
  const [s, setS] = useState<AttendanceState>(state);
  useEffect(() => setS(state), [state]);

  // 事務所休業日 (土 / 日 / 毎月最終金曜日) は打刻不可。dateISO 無しは false 扱い。
  const officeClosed = today.dateISO != null && isOfficeClosed(today.dateISO);
  const headerDateLabel = buildHeaderDateLabel(today);

  // T6: お休みの日の例外打刻。ローカル state のみ (localStorage には保存しない)。
  const [effectiveMode, setEffectiveMode] = useState<AttendanceMode | null>(
    null
  );
  // today が外側で変わった (日付跨ぎ等) ら例外打刻状態はリセット
  useEffect(() => {
    setEffectiveMode(null);
  }, [today.mode]);

  const planIsOff = today.mode === 'off';
  // 例外打刻に進んだ場合は office 表示として扱う (BUG-1: 打刻済み再訪時も office)。
  const viewMode: AttendanceMode =
    s !== 'before' && planIsOff ? 'office' : (effectiveMode ?? today.mode);
  const isOffice = viewMode === 'office';
  const isHome = viewMode === 'home';
  // 「初期の休み2択画面」を出す条件: 予定が休み × 未選択 × 未打刻。
  const isOff = planIsOff && effectiveMode == null && s === 'before';
  const c = MODE_COLOR[viewMode];

  const inTime = today.checkInTime ?? '— : —';
  const outTime = today.checkOutTime ?? '— : —';

  const heroEmoji = computeHeroEmoji({ isOff, state: s, isOffice, isHome });

  const handleCheckIn = () => {
    setS('checkedIn');
    onCheckIn?.();
  };
  const handleCheckOut = () => {
    setS('checkedOut');
    onCheckOut?.();
  };

  // ── T1-C: 時刻を手で直す (インライン編集) ────────────────────
  const [editing, setEditing] = useState(false);
  const [draftIn, setDraftIn] = useState('');
  const [draftOut, setDraftOut] = useState('');
  const beginEdit = () => {
    setDraftIn(today.checkInTime ?? '');
    setDraftOut(today.checkOutTime ?? '');
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraftIn('');
    setDraftOut('');
  };
  // 編集モードのみバリデーションを評価する (空文字は未入力扱い)。
  const editError = editing
    ? validateTimeEdit(draftIn, draftOut, currentMinutes())
    : null;
  const saveEdit = () => {
    if (editError) return;
    onTimeEdit?.({
      checkIn: draftIn === '' ? undefined : draftIn,
      checkOut: draftOut === '' ? undefined : draftOut,
    });
    setEditing(false);
  };

  // ── T3-B: 今日の打刻を取り消す (インライン確認) ─────────────
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const doDelete = () => {
    onDelete?.();
    setConfirmingDelete(false);
  };

  return {
    s,
    officeClosed,
    headerDateLabel,
    planIsOff,
    viewMode,
    isOffice,
    isHome,
    isOff,
    c,
    inTime,
    outTime,
    heroEmoji,
    handleCheckIn,
    handleCheckOut,
    effectiveMode,
    setEffectiveMode,
    editing,
    draftIn,
    setDraftIn,
    draftOut,
    setDraftOut,
    beginEdit,
    cancelEdit,
    editError,
    saveEdit,
    confirmingDelete,
    setConfirmingDelete,
    doDelete,
  };
}

function currentMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}
