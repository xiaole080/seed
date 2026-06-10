import { useMemo, useState } from 'react';
import {
  CATEGORIES,
  type Category,
  type CategorySection,
} from '../../data/moods';
import { todayISO } from '../../data/store';
import type { StoredDailyRecord } from '../../data/store';
import type { Mood, PrimaryInfluence } from '../../data/types';
import {
  buildSubmitPayload,
  isToday,
  formatTargetLabel,
  keyOf,
  restoreOtherTexts,
  restoreSelections,
  type MoodSubmitPayload,
  type SelectionMap,
} from '../../data/moodLogForm';

interface UseMoodLogParams {
  initialMood: Mood;
  enabledCategoryIds: string[];
  targetDate?: string;
  initialRecord?: StoredDailyRecord;
  onSubmit?: (payload: MoodSubmitPayload) => void;
}

/**
 * MoodLogScreen のフォーム状態とアクションをまとめたフック。
 * 値の復元・要約・送信整形は moodLogForm.ts の純関数に委譲する。
 */
export function useMoodLog({
  initialMood,
  enabledCategoryIds,
  targetDate,
  initialRecord,
  onSubmit,
}: UseMoodLogParams) {
  const effectiveTarget = targetDate ?? todayISO();
  const todayMode = isToday(effectiveTarget);
  const isEdit = initialRecord != null;

  const [mood, setMood] = useState<Mood>(initialRecord?.mood ?? initialMood);
  const [influences, setInfluences] = useState<Set<PrimaryInfluence>>(
    () => new Set(initialRecord?.primaryInfluence ?? [])
  );
  const [influenceOtherText, setInfluenceOtherText] = useState<string>(
    initialRecord?.influenceOtherText ?? ''
  );

  // 仕様 §2.2 — 「もっと記録する？」トグル。修正時は最初から開く。
  const [showMore, setShowMore] = useState<boolean>(isEdit);

  const [sel, setSel] = useState<SelectionMap>(() =>
    restoreSelections(initialRecord)
  );
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState<string>(initialRecord?.note ?? '');
  // 各カテゴリの「その他」自由入力。キーはカテゴリID。
  const [sectionOtherTexts, setSectionOtherTexts] = useState<
    Record<string, string>
  >(() => restoreOtherTexts(initialRecord));

  // 画面タイトル (T8)
  const screenTitle = todayMode
    ? isEdit
      ? '今日の記録を修正する'
      : '今日の様子を記録する'
    : isEdit
      ? '昨日の記録を修正する'
      : '昨日の様子を記録する';
  const targetLabel = formatTargetLabel(effectiveTarget);

  const enabledCategories = useMemo<Category[]>(
    () => CATEGORIES.filter((c) => enabledCategoryIds.includes(c.id)),
    [enabledCategoryIds]
  );

  const toggleInfluence = (id: PrimaryInfluence) => {
    setInfluences((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setSingle = (cat: Category, sec: CategorySection, optId: string) =>
    setSel((prev) => {
      const k = keyOf(cat, sec);
      return { ...prev, [k]: prev[k] === optId ? null : optId };
    });

  const toggleMulti = (cat: Category, sec: CategorySection, optId: string) =>
    setSel((prev) => {
      const k = keyOf(cat, sec);
      const cur = prev[k];
      const s = new Set(cur instanceof Set ? cur : []);
      if (s.has(optId)) {
        s.delete(optId);
      } else {
        // conditionFlags: 'none' と他フラグの排他制御
        if (cat.id === 'condition' && sec.id === 'conditionFlags') {
          if (optId === 'none') {
            s.clear();
          } else {
            s.delete('none');
          }
        }
        s.add(optId);
      }
      return { ...prev, [k]: s };
    });

  const setTime = (cat: Category, sec: CategorySection, v: string) =>
    setSel((prev) => ({ ...prev, [keyOf(cat, sec)]: v || null }));

  const handleSubmit = () => {
    onSubmit?.(
      buildSubmitPayload({
        mood,
        influences,
        selections: sel,
        note,
        influenceOtherText,
        sectionOtherTexts,
      })
    );
  };

  return {
    todayMode,
    isEdit,
    screenTitle,
    targetLabel,
    enabledCategories,
    mood,
    setMood,
    influences,
    toggleInfluence,
    influenceOtherText,
    setInfluenceOtherText,
    showMore,
    setShowMore,
    sel,
    setSingle,
    toggleMulti,
    setTime,
    open,
    setOpen,
    note,
    setNote,
    sectionOtherTexts,
    setSectionOtherTexts,
    handleSubmit,
  };
}
