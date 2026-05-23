import type { Mood, PrimaryInfluence } from './types';

export interface MoodFace {
  v: Mood;
  face: string;
  label: string;
}

// 仕様 §2.3 — 5段階のきもち
export const MOODS: MoodFace[] = [
  { v: 1, face: '😣', label: 'とてもつらい' },
  { v: 2, face: '😔', label: '少ししんどい' },
  { v: 3, face: '😐', label: 'ふつう' },
  { v: 4, face: '🙂', label: 'まあまあ' },
  { v: 5, face: '😊', label: 'よい' },
];

// 仕様 §2.4 — 一番影響していそうなこと (multi-select)
export interface PrimaryInfluenceOption {
  id: PrimaryInfluence;
  label: string;
  icon: string;
}

export const PRIMARY_INFLUENCES: PrimaryInfluenceOption[] = [
  { id: 'sleep',               label: '睡眠',          icon: '🌙' },
  { id: 'fatigue',             label: '疲れ',          icon: '😮‍💨' },
  { id: 'physical_condition',  label: '体調',          icon: '🌡️' },
  { id: 'pain',                label: '痛み',          icon: '🩹' },
  { id: 'meal',                label: '食事',          icon: '🍙' },
  { id: 'weather_pressure',    label: '天気・気圧',    icon: '🌦️' },
  { id: 'going_out',           label: '外出',          icon: '🚶' },
  { id: 'housework',           label: '家事',          icon: '🧹' },
  { id: 'family',              label: '家族',          icon: '👨‍👩‍👧' },
  { id: 'friends',             label: '友人',          icon: '🧑‍🤝‍🧑' },
  { id: 'supporter_workplace', label: '支援員・職場',  icon: '💼' },
  { id: 'sns',                 label: 'SNS',           icon: '📱' },
  { id: 'attendance',          label: '通所',          icon: '🚃' },
  { id: 'work_study',          label: '仕事・勉強',    icon: '📚' },
  { id: 'money',               label: 'お金',          icon: '💰' },
  { id: 'future_anxiety',      label: '将来の不安',    icon: '🌫️' },
  { id: 'unknown',             label: '理由がわからない', icon: '❔' },
  { id: 'rumination',          label: '考えごと',      icon: '💭' },
  { id: 'low_confidence',      label: '自信がない',    icon: '🪞' },
  { id: 'other',               label: 'その他',        icon: '✨' },
];

// 詳細記録 (§3.1〜3.5) — 各カテゴリは複数のサブ質問を持つ
export interface CategoryOption {
  id: string;
  label: string;
  icon?: string;
}

export type SectionType = 'single' | 'multi' | 'time';

export interface CategorySection {
  id: string;
  title?: string;
  type: SectionType;
  options?: CategoryOption[];
  // multi-section の時、特定の選択肢が選ばれた時だけ表示するためのキー
  showWhen?: { sectionId: string; values: string[] };
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  summaryHint: string;
  sections: CategorySection[];
}

// 仕様 §3.1 睡眠
const SLEEP_CATEGORY: Category = {
  id: 'sleep',
  label: '睡眠',
  icon: '🌙',
  summaryHint: '入眠・起床・気になること',
  sections: [
    { id: 'bedtime',  title: '入眠時刻（任意）', type: 'time' },
    { id: 'wakeTime', title: '起床時刻（任意）', type: 'time' },
    {
      id: 'nightAwakenings',
      title: '夜中に起きた',
      type: 'single',
      options: [
        { id: 'none',     label: 'なし' },
        { id: 'once',     label: '1回' },
        { id: 'multiple', label: '2回以上' },
      ],
    },
    {
      id: 'issues',
      title: '気になること（複数選択OK）',
      type: 'multi',
      options: [
        { id: 'difficulty_falling_asleep', label: '寝つきにくい',  icon: '😣' },
        { id: 'woke_up_during_night',      label: '途中で起きた',  icon: '😪' },
        { id: 'early_morning_awake',       label: '早く目が覚めた', icon: '🌄' },
        { id: 'bad_dreams',                label: '夢見が悪い',    icon: '💭' },
        { id: 'day_night_reversal',        label: '昼夜逆転ぎみ',  icon: '🌗' },
        { id: 'daytime_sleepiness',        label: '日中眠い',      icon: '😴' },
        { id: 'other',                     label: 'その他、気になったこと', icon: '✨' },
      ],
    },
  ],
};

// 仕様 §3.2 食事
const MEAL_CATEGORY: Category = {
  id: 'meal',
  label: '食事',
  icon: '🍙',
  summaryHint: '食べたごはん・食事の様子',
  sections: [
    {
      id: 'mealsTaken',
      title: 'とれた食事',
      type: 'multi',
      options: [
        { id: 'breakfast', label: 'あさ', icon: '🌅' },
        { id: 'lunch',     label: 'ひる', icon: '🍱' },
        { id: 'dinner',    label: 'ばん', icon: '🌙' },
        { id: 'snack',     label: '間食', icon: '🍪' },
        { id: 'hydration', label: '水分', icon: '💧' },
      ],
    },
    {
      id: 'mealStatus',
      title: '食事はどうでしたか？',
      type: 'single',
      options: [
        { id: 'normal',        label: '食べられた',   icon: '🙂' },
        { id: 'less',          label: '少なめ',       icon: '🥄' },
        { id: 'too_much',      label: '食べすぎた',   icon: '🍽️' },
        { id: 'low_appetite',  label: '食欲がない',   icon: '😔' },
      ],
    },
    {
      id: 'causes',
      title: 'その原因とおもわれるのは？（任意）',
      type: 'multi',
      // 食べられた以外を選んだ時だけ表示
      showWhen: { sectionId: 'mealStatus', values: ['less', 'too_much', 'low_appetite'] },
      options: [
        { id: 'tired',          label: 'つかれていた',   icon: '😮‍💨' },
        { id: 'unwell',         label: '体調が悪かった', icon: '🌡️' },
        { id: 'low_mood',       label: '気分がしずんでいた', icon: '🌧️' },
        { id: 'busy',           label: '忙しかった',     icon: '⏱️' },
        { id: 'no_appetite',    label: '食欲がなかった', icon: '🥄' },
        { id: 'cant_prepare',   label: '用意できなかった', icon: '🍳' },
        { id: 'overate_stress', label: 'ストレスで食べすぎた', icon: '🍫' },
        { id: 'other',          label: 'その他',         icon: '✨' },
      ],
    },
  ],
};

// 仕様 §3.3 運動・活動
const EXERCISE_CATEGORY: Category = {
  id: 'exercise',
  label: '運動・活動',
  icon: '🚶',
  summaryHint: '今日の活動',
  sections: [
    {
      id: 'activityFlags',
      title: '今日の活動は？（複数選択OK）',
      type: 'multi',
      options: [
        { id: 'went_out',           label: '外に出た',       icon: '🚪' },
        { id: 'walk',               label: '散歩',           icon: '🚶' },
        { id: 'stretch',            label: 'ストレッチ',     icon: '🧘' },
        { id: 'housework',          label: '家事',           icon: '🧹' },
        { id: 'attended_facility',  label: '通所した',       icon: '🚃' },
        { id: 'hardly_moved',       label: 'ほぼ動けなかった', icon: '🛋️' },
        { id: 'other',              label: 'その他、気になったこと', icon: '✨' },
      ],
    },
  ],
};

// 仕様 §3.4 体調
const CONDITION_CATEGORY: Category = {
  id: 'condition',
  label: '体調',
  icon: '🌡️',
  summaryHint: '体調で気になること',
  sections: [
    {
      id: 'conditionFlags',
      title: '体調で気になることは？（複数選択OK）',
      type: 'multi',
      options: [
        { id: 'fatigue',     label: 'だるい',     icon: '😪' },
        { id: 'headache',    label: '頭痛',       icon: '🤕' },
        { id: 'stomachache', label: '腹痛',       icon: '🤢' },
        { id: 'dizziness',   label: 'めまい',     icon: '🌀' },
        { id: 'nausea',      label: '吐き気',     icon: '🤮' },
        { id: 'palpitation', label: '動悸',       icon: '💓' },
        { id: 'tension',     label: '緊張',       icon: '😰' },
        { id: 'cold_like',   label: '風邪っぽい', icon: '🤧' },
        { id: 'none',        label: '特になし',   icon: '✨' },
        { id: 'other',       label: 'その他、気になったこと', icon: '✨' },
      ],
    },
  ],
};

// 仕様 §3.5 服薬
const MEDICATION_CATEGORY: Category = {
  id: 'meds',
  label: '服薬',
  icon: '💊',
  summaryHint: 'お薬',
  sections: [
    {
      id: 'medicationStatus',
      title: '服薬はどうでしたか？',
      type: 'single',
      options: [
        { id: 'as_planned',           label: '予定どおり',     icon: '✅' },
        { id: 'partially_missed',     label: '一部忘れた',     icon: '🔸' },
        { id: 'missed_all',           label: '全部忘れた',     icon: '💭' },
        { id: 'no_medication_today',  label: '今日は服薬なし', icon: '—'  },
        { id: 'other',                label: 'その他、気になったこと', icon: '✨' },
      ],
    },
  ],
};

export const CATEGORIES: Category[] = [
  SLEEP_CATEGORY,
  MEAL_CATEGORY,
  EXERCISE_CATEGORY,
  CONDITION_CATEGORY,
  MEDICATION_CATEGORY,
];

export const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);
