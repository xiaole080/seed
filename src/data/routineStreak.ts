// Routine のストリーク計算 (CareScreen 3 層構造リデザイン)。
//
// 仕様 (確定方針):
//  - done のみカウントする
//  - rest は連続を維持する (カウントはしない・途切れない)
//  - 対象日外 (isRoutineActiveOn=false) はスキップ
//  - paused: true なら即 0
//  - 「ログ無しの対象日」は今日のみ許容 (今日まだ操作していないだけ)、
//    昨日以降は break する
//  - 最大遡及日数 = 90 日 (それ以上前は無視)

import {
  isRoutineActiveOn,
  loadRoutineLogs,
  type Routine,
  type RoutineLog,
} from './routines';
import type { Schedule } from './types';

/** YYYY-MM-DD → 1 日前の YYYY-MM-DD */
function prevDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/**
 * Routine のストリーク (= 連続達成日数) を返す。
 *
 * `logs` を渡さない場合は localStorage から自動読み込みする。
 */
export function computeRoutineStreak(
  routine: Routine,
  logs: RoutineLog | null,
  schedule: Schedule,
  today: string,
): number {
  if (routine.paused) return 0;

  const all = logs ?? loadRoutineLogs();
  const dayMap = all[routine.id] ?? {};
  let streak = 0;
  let cursor = today;
  let isToday = true;

  for (let i = 0; i < 90; i++) {
    // 対象日外はスキップ (今日でも遡っても同様)
    if (!isRoutineActiveOn(routine, cursor, schedule)) {
      cursor = prevDay(cursor);
      isToday = false;
      continue;
    }

    const state = dayMap[cursor];
    if (state === 'done') {
      streak += 1;
    } else if (state === 'rest') {
      // ひと休み: 連続を途切れさせない、カウントしない
    } else {
      // 対象日かつログ無し
      if (isToday) {
        // 今日はまだ操作してないだけ → break せず昨日基準で続ける
      } else {
        break;
      }
    }
    cursor = prevDay(cursor);
    isToday = false;
  }
  return streak;
}
