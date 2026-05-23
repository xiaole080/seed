// MoodLogScreen の選択結果 → StoredDailyRecord (端末保存形) への変換。
//
// 仕様 §5 (DailyRecord) と §13.7 (MissingnessFlags) を結合する。
// 未入力の項目は「何も入れない」ではなく
// missingness フラグとして明示的に立てる (「未入力もデータ」)。

import { CATEGORY_BY_ID } from './moods';
import { todayISO, nowISO, type StoredDailyRecord } from './store';
import type {
  ActivityFlag,
  ConditionFlag,
  MealStatus,
  MedicationStatus,
  MissingnessFlags,
  Mood,
  NightAwakenings,
  PrimaryInfluence,
  SleepIssue,
} from './types';

type PlainSelections = Record<string, string | string[] | null>;

export interface BuildDailyArgs {
  mood: Mood;
  primaryInfluence: PrimaryInfluence[];
  selections: PlainSelections;
  /**
   * 自由記述。フォームから渡される。
   * - `undefined` (フィールド自体が渡されなかった): previous.note を温存する。
   * - `""` または空白のみ (ユーザーが明示的にクリア): previous.note を削除する。
   * - 文字列: その内容で上書きする。
   */
  note?: string;
  enabledCategoryIds: string[];
  date?: string;
  /** 既存レコードがあれば createdAt を保持して上書きする */
  previous?: StoredDailyRecord;
  /** 影響要因「その他」自由入力。端末ローカル限定。 */
  influenceOtherText?: string;
  /** 各カテゴリ (sleep/meal/exercise/condition/meds) の「その他」自由入力。 */
  sectionOtherTexts?: Record<string, string>;
  /** 修正保存かどうか (true なら edited フラグを立てる) */
  edited?: boolean;
  /**
   * 記録対象が「今日」か「昨日」か (Home からの遷移時に渡す)。
   * schemaVersion 0.1.0 で StoredDailyRecord に保存される。
   */
  targetDateType?: 'today' | 'yesterday';
}

export function buildDailyRecord(args: BuildDailyArgs): StoredDailyRecord {
  const date = args.date ?? todayISO();
  const sel = args.selections;
  const has = (key: string) => {
    const v = sel[key];
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return v !== '';
  };
  const str = (key: string): string | undefined => {
    const v = sel[key];
    return typeof v === 'string' && v !== '' ? v : undefined;
  };
  const arr = (key: string): string[] => {
    const v = sel[key];
    return Array.isArray(v) ? v : [];
  };

  const otherTexts = args.sectionOtherTexts ?? {};
  const otherTextFor = (key: string): string | undefined => {
    const v = otherTexts[key];
    return v && v.trim() !== '' ? v.slice(0, 100) : undefined;
  };

  // OFF カテゴリの既存データを温存するヘルパ (仕様 §8.5 / §10.5)。
  // ON のカテゴリは選択がなくても undefined にしてよい (skipped 判定で使う)。
  // OFF のカテゴリは UI で触れないので、previous の値があれば残す。
  const enabledHasCategory = (id: string) =>
    args.enabledCategoryIds.includes(id) && CATEGORY_BY_ID[id] != null;

  // --- sleep ---
  let sleep: StoredDailyRecord['sleep'];
  const sleepKeys = ['sleep.bedtime', 'sleep.wakeTime', 'sleep.nightAwakenings', 'sleep.issues'];
  if (sleepKeys.some(has)) {
    sleep = {
      bedtime: str('sleep.bedtime'),
      wakeTime: str('sleep.wakeTime'),
      nightAwakenings: str('sleep.nightAwakenings') as NightAwakenings | undefined,
      sleepIssues: arr('sleep.issues') as SleepIssue[],
      otherText: otherTextFor('sleep'),
    };
  } else if (!enabledHasCategory('sleep')) {
    sleep = args.previous?.sleep;
  }

  // --- meal ---
  let meal: StoredDailyRecord['meal'];
  const mealKeys = ['meal.mealsTaken', 'meal.mealStatus', 'meal.causes'];
  if (mealKeys.some(has)) {
    const mealsTakenArr = arr('meal.mealsTaken');
    meal = {
      mealStatus: str('meal.mealStatus') as MealStatus | undefined,
      mealsTaken: {
        breakfast: mealsTakenArr.includes('breakfast'),
        lunch:     mealsTakenArr.includes('lunch'),
        dinner:    mealsTakenArr.includes('dinner'),
        snack:     mealsTakenArr.includes('snack'),
        hydration: mealsTakenArr.includes('hydration'),
      },
      causes: arr('meal.causes'),
      otherText: otherTextFor('meal'),
    };
  } else if (!enabledHasCategory('meal')) {
    meal = args.previous?.meal;
  }

  // --- exercise ---
  let exercise: StoredDailyRecord['exercise'];
  if (has('exercise.activityFlags')) {
    exercise = {
      activityFlags: arr('exercise.activityFlags') as ActivityFlag[],
      otherText: otherTextFor('exercise'),
    };
  } else if (!enabledHasCategory('exercise')) {
    exercise = args.previous?.exercise;
  }

  // --- condition ---
  let condition: StoredDailyRecord['condition'];
  if (has('condition.conditionFlags')) {
    condition = {
      conditionFlags: arr('condition.conditionFlags') as ConditionFlag[],
      otherText: otherTextFor('condition'),
    };
  } else if (!enabledHasCategory('condition')) {
    condition = args.previous?.condition;
  }

  // --- medication ---
  let medication: StoredDailyRecord['medication'];
  if (has('meds.medicationStatus')) {
    medication = {
      medicationStatus: str('meds.medicationStatus') as MedicationStatus,
      otherText: otherTextFor('meds'),
    };
  } else if (!enabledHasCategory('meds')) {
    medication = args.previous?.medication;
  }

  // --- note (M4: 修正保存で既存 note を意図せず消さない) ---
  // - args.note === undefined: フォームから渡されなかった → previous.note を温存。
  // - args.note が空白のみ: ユーザーが明示的にクリアした → undefined で削除。
  // - args.note が値あり: そのまま保存。
  let finalNote: string | undefined;
  if (args.note === undefined) {
    finalNote = args.previous?.note;
  } else if (args.note.trim() === '') {
    finalNote = undefined;
  } else {
    finalNote = args.note;
  }

  // --- missingness (§13.7) ---
  // 「ユーザが有効化したカテゴリのうち、今日は触らなかったもの」を skipped 扱いに。

  const missingness: MissingnessFlags = {
    noRecord: false,
    skippedMood: false, // mood は必須入力なので常に false
    skippedPrimaryInfluence: args.primaryInfluence.length === 0,
    skippedSleep:      enabledHasCategory('sleep')     && !sleep,
    skippedMeal:       enabledHasCategory('meal')      && !meal,
    skippedExercise:   enabledHasCategory('exercise')  && !exercise,
    skippedCondition:  enabledHasCategory('condition') && !condition,
    skippedMedication: enabledHasCategory('meds')      && !medication,
    skippedAttendance: false, // 別ストアで判定する
    skippedNote:       !finalNote || finalNote.trim() === '',
  };

  const now = nowISO();
  const influenceOther =
    args.influenceOtherText && args.influenceOtherText.trim() !== ''
      ? args.influenceOtherText.slice(0, 100)
      : undefined;
  return {
    localRecordId: args.previous?.localRecordId ?? `daily_${date}_${Date.now()}`,
    date,
    mood: args.mood,
    primaryInfluence: args.primaryInfluence,
    influenceOtherText: influenceOther,
    sleep,
    meal,
    exercise,
    condition,
    medication,
    note: finalNote,
    missingness,
    createdAt: args.previous?.createdAt ?? now,
    updatedAt: now,
    edited: args.edited || args.previous?.edited,
    // 今回の保存で受け取った targetDateType を優先し、なければ previous を温存する。
    targetDateType: args.targetDateType ?? args.previous?.targetDateType,
  };
}
