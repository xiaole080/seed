// HistoryScreen 用の、UI に依存しないラベル解決と表示用文字列の組み立て。
// 統計値そのものは historyStats.ts、ここは「表示モデル化」を担当する純関数群。

import { MOODS, PRIMARY_INFLUENCES, CATEGORY_BY_ID } from './moods';
import { RECORD_PRESETS } from './records';
import { SUMMARY_COPY, RANGE_TERM } from './historyCopy';
import type { HistoryRange } from './historyStats';
import type { StoredDailyRecord } from './store';
import type {
  ActivityFlag,
  AttendanceMonthlyRecord,
  ConditionFlag,
  MealStatus,
  MedicationStatus,
  NightAwakenings,
  SleepIssue,
} from './types';

// 詳細記録カテゴリの label/icon を CATEGORIES のサブ質問選択肢から引くための補助。
export function optionLabelMap(
  categoryId: string,
  sectionId: string
): Record<string, { label: string; icon?: string }> {
  const cat = CATEGORY_BY_ID[categoryId];
  const section = cat?.sections.find((s) => s.id === sectionId);
  const out: Record<string, { label: string; icon?: string }> = {};
  for (const o of section?.options ?? []) {
    out[o.id] = { label: o.label, icon: o.icon };
  }
  return out;
}

export const SLEEP_ISSUE_LABELS = optionLabelMap('sleep', 'issues');
export const MEAL_STATUS_LABELS = optionLabelMap('meal', 'mealStatus');
export const ACTIVITY_LABELS = optionLabelMap('exercise', 'activityFlags');
export const CONDITION_LABELS = optionLabelMap('condition', 'conditionFlags');
export const MED_STATUS_LABELS = optionLabelMap('meds', 'medicationStatus');

export const NIGHT_AWAKENING_LABEL: Record<NightAwakenings, string> = {
  none: '夜中に起きなかった',
  once: '夜中に1回起きた',
  multiple: '夜中に2回以上起きた',
};

export const INFLUENCE_BY_ID = Object.fromEntries(
  PRIMARY_INFLUENCES.map((p) => [p.id, p])
);

export const PRESET_BY_ID = Object.fromEntries(
  RECORD_PRESETS.map((p) => [p.id, p])
);

/** yyyy-mm-dd → yyyy/MM/DD (ゼロ埋め)。 */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}

/** サマリー一言を組み立てる。記録ゼロ・月次・通常で文言を切り替える。 */
export function buildSummaryText(
  overview: { recordedDays: number; averageMood: number | null },
  range: HistoryRange
): string {
  if (overview.recordedDays === 0) return SUMMARY_COPY.noRecords;
  if (range === 'month') {
    return SUMMARY_COPY.monthlyReview(
      overview.recordedDays,
      overview.averageMood
    );
  }
  return SUMMARY_COPY.recorded(RANGE_TERM[range], overview.recordedDays);
}

export interface HiddenItem {
  id: string;
  label: string;
  days: number;
}

/** OFF にしている記録項目のうち、過去データが残っているものを列挙する (T13)。 */
export function computeHiddenItems(
  recordIds: string[],
  records: StoredDailyRecord[]
): HiddenItem[] {
  const out: HiddenItem[] = [];
  const checkOff = (
    id: 'sleep' | 'meal' | 'exercise' | 'condition' | 'meds',
    label: string,
    has: (r: StoredDailyRecord) => boolean
  ) => {
    if (recordIds.includes(id)) return;
    const days = records.filter(has).length;
    if (days > 0) out.push({ id, label, days });
  };
  checkOff('sleep', '睡眠', (r) => r.sleep != null);
  checkOff('meal', '食事', (r) => r.meal != null);
  checkOff('exercise', '運動・活動', (r) => r.exercise != null);
  checkOff('condition', '体調', (r) => r.condition != null);
  checkOff('meds', '服薬', (r) => r.medication != null);
  return out;
}

export interface TimelineRowView {
  moodObj: (typeof MOODS)[number] | null;
  lines: string[];
  otherTexts: { label: string; text: string }[];
  attendanceLine: string | null;
  hasNote: boolean;
  hasExpandable: boolean;
}

/**
 * 日付つき時系列 1 行ぶんの表示モデルを組み立てる (T12)。
 * 自由記述・その他欄は折りたたみ対象として otherTexts/hasNote に分離し、
 * 一覧本文 (lines) には露出させない (§10)。
 */
export function buildTimelineRowView(
  record: StoredDailyRecord | undefined,
  attendance: AttendanceMonthlyRecord | undefined,
  recordIds: string[]
): TimelineRowView {
  const hasNote = !!record?.note && record.note.trim() !== '';
  const otherTexts: { label: string; text: string }[] = [];
  if (record?.influenceOtherText) {
    otherTexts.push({
      label: '影響していそうなこと',
      text: record.influenceOtherText,
    });
  }
  if (record?.sleep?.otherText && recordIds.includes('sleep')) {
    otherTexts.push({ label: '睡眠', text: record.sleep.otherText });
  }
  if (record?.meal?.otherText && recordIds.includes('meal')) {
    otherTexts.push({ label: '食事', text: record.meal.otherText });
  }
  if (record?.exercise?.otherText && recordIds.includes('exercise')) {
    otherTexts.push({ label: '運動・活動', text: record.exercise.otherText });
  }
  if (record?.condition?.otherText && recordIds.includes('condition')) {
    otherTexts.push({ label: '体調', text: record.condition.otherText });
  }
  if (record?.medication?.otherText && recordIds.includes('meds')) {
    otherTexts.push({ label: '服薬', text: record.medication.otherText });
  }
  const hasExpandable = hasNote || otherTexts.length > 0;

  const moodObj = record
    ? (MOODS.find((m) => m.v === record.mood) ?? MOODS[2])
    : null;

  const lines: string[] = [];
  if (record) {
    if (record.primaryInfluence?.length) {
      const labels = record.primaryInfluence
        .map((id) => INFLUENCE_BY_ID[id]?.label ?? id)
        .slice(0, 3);
      lines.push(`影響していそうなこと: ${labels.join('・')}`);
    }
    if (recordIds.includes('sleep') && record.sleep) {
      const parts: string[] = [];
      if (record.sleep.bedtime) parts.push(`入眠 ${record.sleep.bedtime}`);
      if (record.sleep.wakeTime) parts.push(`起床 ${record.sleep.wakeTime}`);
      if (record.sleep.sleepIssues?.length) {
        const lbl =
          SLEEP_ISSUE_LABELS[record.sleep.sleepIssues[0] as SleepIssue]
            ?.label ?? record.sleep.sleepIssues[0];
        parts.push(lbl);
      }
      if (parts.length) lines.push(`睡眠: ${parts.join(' / ')}`);
    }
    if (recordIds.includes('meal') && record.meal?.mealStatus) {
      const lbl =
        MEAL_STATUS_LABELS[record.meal.mealStatus as MealStatus]?.label ??
        record.meal.mealStatus;
      lines.push(`食事: ${lbl}`);
    }
    if (
      recordIds.includes('exercise') &&
      record.exercise?.activityFlags?.length
    ) {
      const lbl =
        ACTIVITY_LABELS[record.exercise.activityFlags[0] as ActivityFlag]
          ?.label ?? record.exercise.activityFlags[0];
      lines.push(`運動・活動: ${lbl}`);
    }
    if (
      recordIds.includes('condition') &&
      record.condition?.conditionFlags?.length
    ) {
      const lbl =
        CONDITION_LABELS[record.condition.conditionFlags[0] as ConditionFlag]
          ?.label ?? record.condition.conditionFlags[0];
      lines.push(`体調: ${lbl}`);
    }
    if (recordIds.includes('meds') && record.medication?.medicationStatus) {
      const lbl =
        MED_STATUS_LABELS[
          record.medication.medicationStatus as MedicationStatus
        ]?.label ?? record.medication.medicationStatus;
      lines.push(`服薬: ${lbl}`);
    }
  }

  let attendanceLine: string | null = null;
  if (attendance) {
    if (attendance.checkIn || attendance.checkOut) {
      attendanceLine = `通所: ${attendance.checkIn ?? '—'} - ${attendance.checkOut ?? '—'}`;
    } else if (attendance.plannedMode && attendance.plannedMode !== 'off') {
      attendanceLine = '通所: 未打刻';
    }
  }

  return { moodObj, lines, otherTexts, attendanceLine, hasNote, hasExpandable };
}
