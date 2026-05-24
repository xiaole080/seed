// 端末側の日別レコード / 通所ログの永続化 (localStorage)。
//
// 仕様 §5 / §13.2 Phase 1:
//  - 日別記録は端末に保存し、振り返り / CSV出力 / Missingness算出 の元にする。
//  - 通所データはセルフケア記録とは別ストアに分離する (§4.1)。
//  - JSON シリアライズ可能な平易な構造のみ。Set/Date は使わない。

import { loadJson, saveJson } from '../storage';
import type {
  AttendanceMode,
  AttendanceMonthlyRecord,
  ConditionFlag,
  ActivityFlag,
  MealStatus,
  MedicationStatus,
  MissingnessFlags,
  Mood,
  NightAwakenings,
  PrimaryInfluence,
  Schedule,
  SleepIssue,
  TimeBand,
} from './types';
import { DAYS } from './attendance';

// ── キー ──────────────────────────────────────────────────────
const DAILY_KEY      = 'seed.daily.v1';
const ATTENDANCE_KEY = 'seed.attendance.v1';
/** ケア画面のローカル目標保存キー。T2 で追加。 */
export const CARE_GOALS_KEY = 'seed.care.goals.v1';

// ── DailyRecord (端末専用の保存形) ────────────────────────────
// 仕様 §5.1 DailyRecord に対応。MissingnessFlags も同梱して
// 「未入力もデータ」(§13.7) を素直に表現する。
export interface StoredDailyRecord {
  localRecordId: string;
  date: string;          // YYYY-MM-DD
  mood: Mood;
  primaryInfluence: PrimaryInfluence[];
  /** 影響要因「その他」を選んだ時の自由入力。端末ローカル限定 (§9.5)。 */
  influenceOtherText?: string;
  sleep?: {
    bedtime?: string;
    wakeTime?: string;
    nightAwakenings?: NightAwakenings;
    sleepIssues?: SleepIssue[];
    /** その他選択時の自由入力。端末ローカル限定。 */
    otherText?: string;
  };
  meal?: {
    mealStatus?: MealStatus;
    mealsTaken: {
      breakfast?: boolean;
      lunch?: boolean;
      dinner?: boolean;
      snack?: boolean;
      hydration?: boolean;
    };
    causes?: string[];
    /** その他選択時の自由入力。端末ローカル限定。 */
    otherText?: string;
  };
  exercise?: {
    activityFlags: ActivityFlag[];
    /** その他選択時の自由入力。端末ローカル限定。 */
    otherText?: string;
  };
  condition?: {
    conditionFlags: ConditionFlag[];
    /** その他選択時の自由入力。端末ローカル限定。 */
    otherText?: string;
  };
  medication?: {
    medicationStatus: MedicationStatus;
    /** その他選択時の自由入力。端末ローカル限定。 */
    otherText?: string;
  };
  note?: string;          // 自由記述 (端末ローカル限定, §13.8)
  missingness: MissingnessFlags;
  createdAt: string;
  updatedAt: string;
  /** 記録を修正したかどうか (今日/昨日の修正導線で true)。 */
  edited?: boolean;
  /**
   * 記録時にユーザが選んだ対象日タイプ。
   * 'today' = 今日として記録 / 'yesterday' = 昨日として記録。
   * schemaVersion 0.1.0 で追加。既存データはマイグレーションで補完される。
   */
  targetDateType?: 'today' | 'yesterday';
}

// ── DailyRecord API ───────────────────────────────────────────

// 旧 DailyRecord 形式 → 現行 StoredDailyRecord への薄い読み替え。
// 仕様 §4.3 互換読み込み。旧データを壊さず、読み取り時のみ正規化する。
// 既知の旧フィールド: moodScore, primaryInfluences, details.{sleep|meal|exercise|condition|medication}, notes.privateNote
type LegacyDaily = Partial<StoredDailyRecord> & {
  moodScore?: Mood;
  primaryInfluences?: PrimaryInfluence[];
  details?: {
    sleep?: StoredDailyRecord['sleep'];
    meal?: StoredDailyRecord['meal'];
    exercise?: StoredDailyRecord['exercise'];
    condition?: StoredDailyRecord['condition'];
    medication?: StoredDailyRecord['medication'];
  };
  notes?: { privateNote?: string };
};

function normalizeStored(raw: LegacyDaily, dateKey: string): StoredDailyRecord {
  const mood: Mood = (raw.mood ?? raw.moodScore ?? 3) as Mood;
  const primaryInfluence: PrimaryInfluence[] =
    raw.primaryInfluence ?? raw.primaryInfluences ?? [];
  const note = raw.note ?? raw.notes?.privateNote;
  const sleep = raw.sleep ?? raw.details?.sleep;
  const meal = raw.meal ?? raw.details?.meal;
  const exercise = raw.exercise ?? raw.details?.exercise;
  const condition = raw.condition ?? raw.details?.condition;
  const medication = raw.medication ?? raw.details?.medication;

  const defaultMissing: MissingnessFlags = {
    noRecord: false,
    skippedMood: false,
    skippedPrimaryInfluence: primaryInfluence.length === 0,
    skippedSleep: sleep == null,
    skippedMeal: meal == null,
    skippedExercise: exercise == null,
    skippedCondition: condition == null,
    skippedMedication: medication == null,
    skippedAttendance: false,
    skippedNote: !note || note.trim() === '',
  };

  // P-6 対応: 不正な値を保持しないように型ガードする。
  // 'today' / 'yesterday' 以外は undefined に正規化する。
  const targetDateType: StoredDailyRecord['targetDateType'] =
    raw.targetDateType === 'today' || raw.targetDateType === 'yesterday'
      ? raw.targetDateType
      : undefined;

  return {
    localRecordId: raw.localRecordId ?? `daily_${dateKey}_legacy`,
    date: raw.date ?? dateKey,
    mood,
    primaryInfluence,
    influenceOtherText: raw.influenceOtherText,
    sleep,
    meal,
    exercise,
    condition,
    medication,
    note,
    missingness: raw.missingness ?? defaultMissing,
    createdAt: raw.createdAt ?? raw.updatedAt ?? new Date(0).toISOString(),
    updatedAt: raw.updatedAt ?? new Date(0).toISOString(),
    edited: raw.edited,
    targetDateType,
  };
}

function readDailies(): Record<string, StoredDailyRecord> {
  const raw = loadJson<Record<string, LegacyDaily>>(DAILY_KEY, {});
  const out: Record<string, StoredDailyRecord> = {};
  for (const [date, rec] of Object.entries(raw)) {
    if (rec == null) continue;
    out[date] = normalizeStored(rec, date);
  }
  return out;
}

function writeDailies(map: Record<string, StoredDailyRecord>) {
  saveJson(DAILY_KEY, map);
}

export function upsertDailyRecord(rec: StoredDailyRecord): void {
  const map = readDailies();
  map[rec.date] = { ...rec, updatedAt: new Date().toISOString() };
  writeDailies(map);
}

export function getDailyRecord(date: string): StoredDailyRecord | undefined {
  return readDailies()[date];
}

export function listDailyRecords(): StoredDailyRecord[] {
  return Object.values(readDailies()).sort((a, b) =>
    a.date < b.date ? -1 : 1,
  );
}

/** 記録があったユニーク日数 (同じ日に何度 submit してもカウント1) */
export function countRecordedDays(): number {
  return Object.keys(readDailies()).length;
}

/**
 * 今日まで連続して記録があった日数 (今日まだ記録が無い場合、
 * 昨日まで連続していたぶんを返す → 「1日サボったら即0」にならない)。
 */
export function currentStreak(): number {
  const map = readDailies();
  if (Object.keys(map).length === 0) return 0;
  const today = new Date();
  // 今日に記録があるならスタートは今日、無ければ昨日から
  let cursor = new Date(today);
  if (!map[isoFromDate(cursor)]) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    if (map[isoFromDate(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ── AttendanceLog API ─────────────────────────────────────────

function readAttendance(): Record<string, AttendanceMonthlyRecord> {
  return loadJson<Record<string, AttendanceMonthlyRecord>>(ATTENDANCE_KEY, {});
}

function writeAttendance(map: Record<string, AttendanceMonthlyRecord>) {
  saveJson(ATTENDANCE_KEY, map);
}

export function upsertAttendance(rec: AttendanceMonthlyRecord): void {
  const map = readAttendance();
  map[rec.date] = rec;
  writeAttendance(map);
}

export function getAttendance(date: string): AttendanceMonthlyRecord | undefined {
  return readAttendance()[date];
}

export function listAttendanceByMonth(
  yyyyMM: string,
): AttendanceMonthlyRecord[] {
  return Object.values(readAttendance())
    .filter((r) => r.date.startsWith(yyyyMM))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ── 補助: 日付/曜日 ───────────────────────────────────────────

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function nowHHmm(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function thisMonth(): { year: number; monthIndex0: number } {
  const d = new Date();
  return { year: d.getFullYear(), monthIndex0: d.getMonth() };
}

const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function weekdayEnFor(date: string): string {
  const [y, m, day] = date.split('-').map(Number);
  return WEEKDAY_EN[new Date(y, m - 1, day).getDay()];
}

export function scheduleSlotFor(
  date: string,
  schedule: Schedule,
): { mode: AttendanceMode; band: TimeBand } | undefined {
  const [y, m, day] = date.split('-').map(Number);
  const jsDow = new Date(y, m - 1, day).getDay();
  // DAYS = ['月','火','水','木','金','土','日'] → 0=月..6=日
  const i = (jsDow + 6) % 7;
  return schedule[i];
}

// ── 全削除 (A6) ───────────────────────────────────────────────

export function deleteAllLocalData(): void {
  try {
    // Seed が触る既知のキーを一括削除。
    // (※ Sheets 上のデータはユーザーから別途依頼してもらう)
    const keys = [
      DAILY_KEY,
      ATTENDANCE_KEY,
      CARE_GOALS_KEY,
      'seed.app.state.v1',
      'seed.app.phase.v1',
      'seed.outbox.v1',
      'seed.history.synced.v1',
      'seed.consent.v1',
      'seed.clientId',
      // EggCustomizeScreen が独自に書き込むキー (鳥の名前など自由入力を含む可能性)
      'seed.egg',
      // schemaVersion 0.1.0 で追加: マイグレ済み状態も全削除でリセットする
      'seed.schema.version',
      // schemaVersion 0.2.0 で追加: 天気キャッシュ (座標 + snapshot)
      'seed.weather.v1',
    ];
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // private mode / quota — 何もしない
  }
}

// ── デバッグ補助 ──────────────────────────────────────────────

export function _resetDaily(): void {
  try {
    localStorage.removeItem(DAILY_KEY);
  } catch {
    // ignore
  }
}
export function _resetAttendance(): void {
  try {
    localStorage.removeItem(ATTENDANCE_KEY);
  } catch {
    // ignore
  }
}

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

// DAYS の再エクスポートはせず、必要なところで attendance.ts から取る。
void DAYS;
