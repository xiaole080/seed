// 利用ログの集計と CSV 生成 (docs/usage-log-spec.md §4-T5)。
//
// すべて純関数。localStorage には触らない。
//  - 所要秒数はイベントに保存せず、ここで record_open → record_save の
//    差分秒として算出する (仕様 §2.3)。
//  - CSV の列は type / at / session_id の 3 つのみ (仕様 §5 AC-2)。
//    タイムスタンプは ISO 8601 (UTC) のまま出力する (決定事項 D-8)。

import type { UsageEvent } from './usageLog';

/** 直近 14 日 (now を含む 14 日間) の集計結果。 */
export interface UsageSummary {
  /** record_save の件数 */
  recordSaveCount: number;
  /** app_open の件数 */
  appOpenCount: number;
  /** history_open の件数 */
  historyOpenCount: number;
  /**
   * open→save ペアの差分秒の平均 (四捨五入)。
   * 1800 秒 (30分) 超の外れ値は平均から除外する (決定事項 D-5)。
   * 有効なペアが無いときは null。
   */
  averageRecordSeconds: number | null;
  /**
   * 未完了数 = record_abandon の件数 + save も abandon も無い孤立 record_open
   * の件数 (決定事項 D-2。abandon 済みの open を二重に数えない)。
   */
  incompleteCount: number;
}

/** 平均から除外する外れ値のしきい値 (秒)。決定事項 D-5。 */
export const RECORD_DURATION_OUTLIER_SECONDS = 1800;

const WINDOW_DAYS = 14;

/**
 * 直近 14 日 (now の日を含む 14 日間 = 当日 0:00 の 13 日前以降) の利用集計。
 * 15 日以上前のイベントのみの場合はすべて 0 / null になる。
 */
export function summarizeUsage(
  events: UsageEvent[],
  now: Date = new Date()
): UsageSummary {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (WINDOW_DAYS - 1));
  const startMs = start.getTime();

  const recent = events.filter((e) => {
    const t = Date.parse(e.at);
    return Number.isFinite(t) && t >= startMs;
  });

  let recordSaveCount = 0;
  let appOpenCount = 0;
  let historyOpenCount = 0;
  let abandonCount = 0;

  // sessionId → open/save/abandon の時刻 (同一 ID 複数件は最初の 1 件を採用)
  const sessions = new Map<
    string,
    { openAt?: number; saveAt?: number; abandoned?: boolean }
  >();
  const sessionOf = (id: string) => {
    let s = sessions.get(id);
    if (!s) {
      s = {};
      sessions.set(id, s);
    }
    return s;
  };

  for (const e of recent) {
    if (e.type === 'app_open') appOpenCount++;
    else if (e.type === 'history_open') historyOpenCount++;
    else if (e.type === 'record_save') recordSaveCount++;
    else if (e.type === 'record_abandon') abandonCount++;

    if (e.sessionId) {
      const s = sessionOf(e.sessionId);
      const t = Date.parse(e.at);
      if (e.type === 'record_open' && s.openAt == null) s.openAt = t;
      if (e.type === 'record_save' && s.saveAt == null) s.saveAt = t;
      if (e.type === 'record_abandon') s.abandoned = true;
    }
  }

  // 平均記録時間: open→save ペアの差分秒。1800 秒超は平均から除外。
  const durations: number[] = [];
  let orphanOpenCount = 0;
  for (const s of sessions.values()) {
    if (s.openAt != null && s.saveAt != null) {
      const sec = (s.saveAt - s.openAt) / 1000;
      if (sec >= 0 && sec <= RECORD_DURATION_OUTLIER_SECONDS) {
        durations.push(sec);
      }
    } else if (s.openAt != null && s.saveAt == null && !s.abandoned) {
      // save も abandon も無い孤立 open (タブを閉じた等) は「未完了」扱い
      orphanOpenCount++;
    }
  }
  const averageRecordSeconds =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  return {
    recordSaveCount,
    appOpenCount,
    historyOpenCount,
    averageRecordSeconds,
    incompleteCount: abandonCount + orphanOpenCount,
  };
}

const CSV_HEADERS = ['type', 'at', 'session_id'] as const;

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/**
 * 利用ログを CSV 文字列にする。列は type / at / session_id の 3 つのみ。
 * 記録内容に関わる列は存在しない (仕様 §5 AC-2)。
 */
export function buildUsageLogCsv(events: UsageEvent[]): string {
  const lines: string[] = [CSV_HEADERS.join(',')];
  for (const e of events) {
    lines.push(
      [e.type, e.at, e.sessionId ?? ''].map(csvEscape).join(',')
    );
  }
  return lines.join('\n');
}
