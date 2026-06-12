// CheckInScreen 用の、UI に依存しない計算・変換。
// 時刻パースと編集バリデーション、ヘッダー文言、ヒーロー絵文字の導出をまとめる。

import type { AttendanceState, TodayCard } from './types';

/** 時間帯バンドの表示用レンジ文字列。 */
export function bandHours(band: TodayCard['band']): string {
  if (band === 'full') return '9:00 〜 15:00';
  if (band === 'am') return '9:00 〜 12:00';
  return '13:00 〜 16:00';
}

/**
 * ヘッダーの日付ラベルを組み立てる。
 * dateISO があれば「M月D日(曜) · 打刻」、無ければ dayLabel のみにフォールバック。
 */
export function buildHeaderDateLabel(today: TodayCard): string {
  if (!today.dateISO) return `${today.dayLabel ?? ''} · 打刻`.trim();
  const [, m, d] = today.dateISO.split('-').map(Number);
  return `${m}月${d}日(${today.dayLabel}) · 打刻`;
}

/** "HH:mm" を 0〜1439 の分に変換。形式・範囲が不正なら null。 */
export function timeToMin(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * 時刻手入力のバリデーション。問題があればエラー文言、無ければ null。
 * 空文字は「未入力」として個別チェックを通す (帰宅は任意)。
 * nowMin は「現在時刻の分」を呼び出し側から渡す (純関数に保つため)。
 */
export function validateTimeEdit(
  draftIn: string,
  draftOut: string,
  nowMin: number
): string | null {
  const inMin = draftIn === '' ? null : timeToMin(draftIn);
  const outMin = draftOut === '' ? null : timeToMin(draftOut);
  if (draftIn !== '' && inMin === null) return '到着の時刻が読めません';
  if (draftOut !== '' && outMin === null) return '帰宅の時刻が読めません';
  if (inMin != null && inMin > nowMin) return '未来の時刻は記録できません';
  if (outMin != null && outMin > nowMin) return '未来の時刻は記録できません';
  if (inMin != null && outMin != null && outMin < inMin)
    return '帰宅は到着より後にしてください';
  return null;
}

export interface HeroEmojiInput {
  isOff: boolean;
  state: AttendanceState;
  isOffice: boolean;
  isHome: boolean;
}

/** 状態と表示モードからヒーロー絵文字を導出する。 */
export function computeHeroEmoji({
  isOff,
  state,
  isOffice,
  isHome,
}: HeroEmojiInput): string {
  if (isOff) return '🌿';
  if (state === 'before') return isOffice ? '🚪' : isHome ? '🏠' : '🌿';
  if (state === 'checkedIn') return isOffice ? '✓' : '🏠';
  return '🌙';
}
