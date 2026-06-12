// 利用ログ (docs/usage-log-spec.md)。
//
// 「アプリがどう使われているか」だけを端末内 (localStorage) に記録する。
//  - 記録するのはイベント種類 + ISO タイムスタンプ + 相関用 sessionId のみ。
//  - 気分・睡眠・服薬・通所・自由記述・記録対象日・ニックネーム等の
//    健康データ/個人データは、いかなる形でもイベントに含めない (仕様 §2.2)。
//  - 外部送信は一切しない。書き出しは UsageLogCard の明示コピーのみ。
//  - 健康データ (seed.daily.v1 等) とは完全に別キーで保存する (仕様 §3)。

import { loadJson, saveJson } from '../storage';

/** localStorage キー。deleteAllLocalData() の keys 配列にも含める (リポジトリ規約)。 */
export const USAGE_LOG_KEY = 'seed.usagelog.v1';

/** 容量ガード: 件数上限。超過時は古いものから FIFO で破棄 (決定事項 D-4)。 */
export const USAGE_LOG_MAX_EVENTS = 2000;

/** 確定した 5 種のみ。行動プロファイリング抑制のため追加しない (仕様 §6-7)。 */
export type UsageEventType =
  | 'app_open'
  | 'record_open'
  | 'record_save'
  | 'record_abandon'
  | 'history_open';

/**
 * 利用ログ 1 件。フィールドはこの 3 つ **のみ** (仕様 §2.2)。
 * 記録内容 (mood / note 等) を構造的に持てないようにしている。
 */
export interface UsageEvent {
  type: UsageEventType;
  /** ISO 8601 (UTC)。new Date().toISOString() */
  at: string;
  /** record_* のみ。open/save/abandon を相関させる一時 ID。 */
  sessionId?: string;
}

const EVENT_TYPES: readonly UsageEventType[] = [
  'app_open',
  'record_open',
  'record_save',
  'record_abandon',
  'history_open',
];

function isUsageEventType(v: unknown): v is UsageEventType {
  return (
    typeof v === 'string' && (EVENT_TYPES as readonly string[]).includes(v)
  );
}

// store.ts と同等の nowISO。store.ts から import すると
// store → usageLog → store の循環参照になるためここで定義する。
function nowISO(): string {
  return new Date().toISOString();
}

/**
 * 保存済みイベントを返す。
 * 不正データ (配列でない / type 不明 / at が文字列でない) は読み捨て、
 * 有効分のみを type/at/sessionId の 3 フィールドに正規化して返す。
 */
export function listUsageEvents(): UsageEvent[] {
  const raw = loadJson<unknown>(USAGE_LOG_KEY, []);
  if (!Array.isArray(raw)) return [];
  const out: UsageEvent[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue;
    const { type, at, sessionId } = item as Record<string, unknown>;
    if (!isUsageEventType(type) || typeof at !== 'string') continue;
    const ev: UsageEvent = { type, at };
    if (typeof sessionId === 'string') ev.sessionId = sessionId;
    out.push(ev);
  }
  return out;
}

/**
 * イベントを 1 件追記する。at は現在時刻 (ISO 8601)。
 * 2000 件を超えるぶんは古いものから破棄する。
 * private mode では saveJson 側の try/catch により黙って no-op になる。
 */
export function appendUsageEvent(
  type: UsageEventType,
  sessionId?: string
): void {
  const events = listUsageEvents();
  const ev: UsageEvent = { type, at: nowISO() };
  if (sessionId != null) ev.sessionId = sessionId;
  events.push(ev);
  const trimmed =
    events.length > USAGE_LOG_MAX_EVENTS
      ? events.slice(events.length - USAGE_LOG_MAX_EVENTS)
      : events;
  saveJson(USAGE_LOG_KEY, trimmed);
}

/** ログを全削除する (UsageLogCard の「ログを全削除」用)。 */
export function clearUsageLog(): void {
  try {
    localStorage.removeItem(USAGE_LOG_KEY);
  } catch {
    // private mode — 何もしない
  }
}

// ── 記録セッション補助 ───────────────────────────────────────

/**
 * sessionId の発番。crypto.randomUUID が無い環境では
 * タイムスタンプ + 乱数でフォールバックする。
 * 端末・個人を識別しない一時 ID で、セッションをまたいで再利用しない。
 */
function newSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** record_open を記録し、相関用の sessionId を返す。 */
export function beginRecordSession(): string {
  const sessionId = newSessionId();
  appendUsageEvent('record_open', sessionId);
  return sessionId;
}

/**
 * 記録セッションの終了 (save / abandon) を記録する。
 * 同一 sessionId が既に save / abandon 済みなら no-op
 * (save 後のルート離脱で abandon が二重記録されるのを防ぐ)。
 */
export function endRecordSession(
  sessionId: string,
  outcome: 'save' | 'abandon'
): void {
  if (!sessionId) return;
  const ended = listUsageEvents().some(
    (e) =>
      e.sessionId === sessionId &&
      (e.type === 'record_save' || e.type === 'record_abandon')
  );
  if (ended) return;
  appendUsageEvent(outcome === 'save' ? 'record_save' : 'record_abandon', sessionId);
}
