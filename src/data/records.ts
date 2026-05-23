import type { RecordPreset } from './types';

// 詳細記録のプリセット (任意項目)
// 仕様 §3.6: 詳細記録は任意。未入力は失敗ではなく単なる未記録として扱う。
export const RECORD_PRESETS: RecordPreset[] = [
  { id: 'sleep',     label: '睡眠',       icon: '🌙', required: false, hint: '入眠・起床・気になること' },
  { id: 'meal',      label: '食事',       icon: '🍙', required: false, hint: '食べたごはん・食事の様子' },
  { id: 'exercise',  label: '運動・活動', icon: '🚶', required: false, hint: '今日の活動' },
  { id: 'condition', label: '体調',       icon: '🌡️', required: false, hint: '気になる体調' },
  { id: 'meds',      label: '服薬',       icon: '💊', required: false, hint: 'お薬' },
];

// 5つすべて既定でON (タップ展開で記録/未記録を選べる)
export const DEFAULT_RECORD_IDS = ['sleep', 'meal', 'exercise', 'condition', 'meds'];
