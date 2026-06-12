// CareScreen 用の、UI に依存しない計算・変換。
// 表示コンポーネントから純粋ロジックを切り離し、単体テストできるようにする。

import { MILESTONES, getMilestone } from './stages';
import type { Milestone } from './types';
import type { Routine } from './routines';

export interface RelationshipProgress {
  /** 現在のマイルストーン */
  milestone: Milestone;
  /** 次のマイルストーンのラベル (最大到達時は null) */
  nextLabel: string | null;
  /** 進捗バーの区間開始日 */
  segStart: number;
  /** 進捗バーの区間終了日 */
  segEnd: number;
  /** 区間内の進捗率 (0〜100) */
  segPct: number;
  /** 次のマイルストーンまでの残り日数 (最大到達時は 0) */
  remaining: number;
  /** 最大マイルストーンに到達済みか */
  isMax: boolean;
}

/**
 * 累計記録日数から「鳥との関係」進捗を導出する。
 * CareScreen の RelationshipSection 表示に使う値をまとめて返す純関数。
 */
export function computeRelationshipProgress(
  totalDays: number
): RelationshipProgress {
  const milestone = getMilestone(totalDays);
  const nextMilestone =
    milestone.next != null
      ? MILESTONES.find((m) => m.days === milestone.next)
      : null;
  const segStart = milestone.days;
  const segEnd = milestone.next ?? Math.max(milestone.days + 1, totalDays);
  const segPct =
    milestone.next != null
      ? Math.min(
          100,
          Math.max(0, ((totalDays - segStart) / (segEnd - segStart)) * 100)
        )
      : 100;
  const remaining =
    milestone.next != null ? Math.max(0, milestone.next - totalDays) : 0;

  return {
    milestone,
    nextLabel: nextMilestone?.label ?? null,
    segStart,
    segEnd,
    segPct,
    remaining,
    isMax: milestone.next == null,
  };
}

/**
 * ルーティンを「ひと休み中でないもの → ひと休み中」の順に並び替える。
 * 各グループ内の元の順序は保つ (T6 確定方針: paused は最下部)。
 */
export function sortRoutinesByActiveFirst(routines: Routine[]): Routine[] {
  const active = routines.filter((r) => !r.paused);
  const paused = routines.filter((r) => r.paused);
  return [...active, ...paused];
}
