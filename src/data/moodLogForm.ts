// MoodLogScreen 用の、UI に依存しないフォーム値の復元・要約・送信ペイロード組み立て。

import { todayISO } from './store';
import type { StoredDailyRecord } from './store';
import type { Category, CategorySection } from './moods';
import type { Mood, PrimaryInfluence } from './types';

/**
 * セクションの値は単一文字列・複数(Set)・時刻文字列・null のいずれか。
 * 保存キーは `${categoryId}.${sectionId}` という複合キー。
 */
export type SelectionValue = string | null | Set<string>;
export type SelectionMap = Record<string, SelectionValue>;

export interface MoodSubmitPayload {
  mood: Mood;
  primaryInfluence: PrimaryInfluence[];
  selections: SelectionMap;
  note: string;
  influenceOtherText?: string;
  sectionOtherTexts: Record<string, string>;
}

/** category と section から複合キーを作る。 */
export function keyOf(cat: Category, sec: CategorySection): string {
  return `${cat.id}.${sec.id}`;
}

/** 対象日が今日かどうか。 */
export function isToday(target: string): boolean {
  return target === todayISO();
}

/** 対象日の表示ラベル "5月23日(土)" を返す。 */
export function formatTargetLabel(target: string): string {
  const [y, m, d] = target.split('-').map(Number);
  if (!y || !m || !d) return target;
  const dt = new Date(y, m - 1, d);
  const w = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()];
  return `${m}月${d}日(${w})`;
}

/** initialRecord から SelectionMap を構築する (修正時のフォーム復元)。 */
export function restoreSelections(
  rec: StoredDailyRecord | undefined
): SelectionMap {
  if (!rec) return {};
  const out: SelectionMap = {};
  if (rec.sleep) {
    if (rec.sleep.bedtime) out['sleep.bedtime'] = rec.sleep.bedtime;
    if (rec.sleep.wakeTime) out['sleep.wakeTime'] = rec.sleep.wakeTime;
    if (rec.sleep.nightAwakenings)
      out['sleep.nightAwakenings'] = rec.sleep.nightAwakenings;
    if (rec.sleep.sleepIssues?.length)
      out['sleep.issues'] = new Set(rec.sleep.sleepIssues);
  }
  if (rec.meal) {
    const taken = rec.meal.mealsTaken;
    const arr: string[] = [];
    if (taken?.breakfast) arr.push('breakfast');
    if (taken?.lunch) arr.push('lunch');
    if (taken?.dinner) arr.push('dinner');
    if (taken?.snack) arr.push('snack');
    if (taken?.hydration) arr.push('hydration');
    if (arr.length) out['meal.mealsTaken'] = new Set(arr);
    if (rec.meal.mealStatus) out['meal.mealStatus'] = rec.meal.mealStatus;
    if (rec.meal.causes?.length) out['meal.causes'] = new Set(rec.meal.causes);
  }
  if (rec.exercise?.activityFlags?.length) {
    out['exercise.activityFlags'] = new Set(rec.exercise.activityFlags);
  }
  if (rec.condition?.conditionFlags?.length) {
    out['condition.conditionFlags'] = new Set(rec.condition.conditionFlags);
  }
  if (rec.medication?.medicationStatus) {
    out['meds.medicationStatus'] = rec.medication.medicationStatus;
  }
  return out;
}

/** initialRecord から各セクションの otherText を復元する。 */
export function restoreOtherTexts(
  rec: StoredDailyRecord | undefined
): Record<string, string> {
  if (!rec) return {};
  const out: Record<string, string> = {};
  if (rec.sleep?.otherText) out['sleep'] = rec.sleep.otherText;
  if (rec.meal?.otherText) out['meal'] = rec.meal.otherText;
  if (rec.exercise?.otherText) out['exercise'] = rec.exercise.otherText;
  if (rec.condition?.otherText) out['condition'] = rec.condition.otherText;
  if (rec.medication?.otherText) out['meds'] = rec.medication.otherText;
  return out;
}

/** カテゴリにひとつでも入力があるか。 */
export function isCategoryFilled(cat: Category, sel: SelectionMap): boolean {
  return cat.sections.some((sec) => {
    const v = sel[keyOf(cat, sec)];
    if (v instanceof Set) return v.size > 0;
    return v != null && v !== '';
  });
}

/** カテゴリの選択内容を 1 行の要約文字列にまとめる。 */
export function summarizeCategory(cat: Category, sel: SelectionMap): string {
  const parts: string[] = [];
  for (const sec of cat.sections) {
    const v = sel[keyOf(cat, sec)];
    if (v == null) continue;
    if (sec.type === 'single' && typeof v === 'string') {
      const o = sec.options?.find((o) => o.id === v);
      if (o) parts.push(o.label);
    } else if (sec.type === 'multi' && v instanceof Set && v.size) {
      const labels =
        sec.options?.filter((o) => v.has(o.id)).map((o) => o.label) ?? [];
      if (labels.length) {
        parts.push(
          labels.length <= 2
            ? labels.join('・')
            : `${labels[0]} ほか${labels.length - 1}`
        );
      }
    } else if (sec.type === 'time' && typeof v === 'string') {
      parts.push(v);
    }
  }
  return parts.join(' / ');
}

/**
 * 送信ペイロードを組み立てる。
 * 仕様 §3.6: 未入力は失敗ではない。その他自由入力は端末ローカル限定 (§9.5) で
 * 100 文字に丸め、空欄は落とす。外部送信からの除外は sanitize 側の責務。
 */
export function buildSubmitPayload(args: {
  mood: Mood;
  influences: Set<PrimaryInfluence>;
  selections: SelectionMap;
  note: string;
  influenceOtherText: string;
  sectionOtherTexts: Record<string, string>;
}): MoodSubmitPayload {
  const cleanOtherTexts: Record<string, string> = {};
  for (const [k, v] of Object.entries(args.sectionOtherTexts)) {
    if (v && v.trim() !== '') cleanOtherTexts[k] = v.slice(0, 100);
  }
  return {
    mood: args.mood,
    primaryInfluence: Array.from(args.influences),
    selections: args.selections,
    note: args.note,
    influenceOtherText: args.influenceOtherText.trim()
      ? args.influenceOtherText.slice(0, 100)
      : undefined,
    sectionOtherTexts: cleanOtherTexts,
  };
}
