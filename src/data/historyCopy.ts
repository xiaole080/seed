// きろく画面のサマリー / 空状態 文言を 1ファイルに集約する。
//
// 目的: privacy-reviewer / product-manager が文言を一望してレビューできること。
// 方針 (HISTORY_PERSONALIZATION.md T2):
//  - 利用者を責めない。未記録は中立に扱う。
//  - 禁止語を使わない:
//    責める語  「記録できていません」「継続できていません」「さぼっています」
//              「改善が必要です」「悪化しています」 など
//    医療診断語「うつ傾向」「双極傾向」「症状が悪化」「治療が必要」
//              「再発リスク」「危険状態」 など
//  - 「分析」より「振り返り」のトーン。良し悪しの断定をしない。
//
// ※ ここは文言テーブルのみ。ロジックや副作用は持たない。

import type { HistoryRange } from './historyStats';

/** 期間モードの表示ラベル */
export const RANGE_LABEL: Record<HistoryRange, string> = {
  '7d': '7日',
  '14d': '14日',
  month: '今月',
};

/** サマリー文の中で使う「期間」の言い回し */
export const RANGE_TERM: Record<HistoryRange, string> = {
  '7d': 'この7日',
  '14d': 'この14日',
  month: '今月',
};

// ── サマリー一言 (期間タブ直下の1行) ────────────────────────
export const SUMMARY_COPY = {
  /** 期間内に記録がまったく無いとき */
  noRecords: 'まだ記録がありません。気が向いたときに記録してみてください。',
  /** 記録はあるが日数を肯定的に伝える (term=期間, days=記録日数) */
  recorded: (term: string, days: number) =>
    `${term}は ${days}日 記録できています。`,
  /** 睡眠の記録が少なく傾向が見えにくいとき (判断を保留する中立文) */
  sleepSparse: '睡眠の記録が少ないため、まだ傾向は見えにくいです。',
  /** 「今月」モードの月末振り返り (days=記録日数, avg=平均 or null) */
  monthlyReview: (days: number, avg: number | null) =>
    avg != null
      ? `今月は ${days}日 記録できました。記録した日の気分の平均は ${avg} でした。`
      : `今月は ${days}日 記録できました。気分の記録がそろうと、振り返りやすくなります。`,
} as const;

// ── 空状態 (各セクションでデータが無いとき) ─────────────────
export const EMPTY_COPY = {
  mood: 'まだ気分の記録がありません。',
  influence: 'まだ気分に関係することの記録がありません。',
  attendance: 'まだ通所の記録がありません。',
  sleep: 'まだ睡眠の記録がありません。',
  meal: 'まだ食事の記録がありません。',
  exercise: 'まだ運動・活動の記録がありません。',
  condition: 'まだ体調の記録がありません。',
  meds: 'まだ服薬の記録がありません。',
  /** recordIds が空のとき */
  noRecordItems: '表示する記録項目が選ばれていません。',
} as const;

// ── セクション見出し ────────────────────────────────────────
export const SECTION_TITLE = {
  mood: '気分の うつりかわり',
  influence: '最近、気分に関係していそうなこと',
  attendance: '通所のリズム',
  sleep: '睡眠のようす',
  meal: '食事のようす',
  exercise: '運動・活動のようす',
  condition: '体調のようす',
  meds: '服薬のようす',
  recent: 'さいきんのきろく',
} as const;

// ── 通所ステータスの表示ラベル (断定しない) ──────────────────
export const ATTEND_STATUS_LABEL = {
  attended: '通所済み',
  planned: '通所予定',
  off: '休み',
  unclocked: '未打刻',
} as const;

// ── 自由記述まわり ──────────────────────────────────────────
export const NOTE_COPY = {
  /** 折りたたみを開くトリガー */
  open: 'メモを読む',
  /** 折りたたみを閉じるトリガー */
  close: 'メモを閉じる',
  /** note が無い日 */
  none: 'この日のメモはありません。',
} as const;
