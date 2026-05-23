// Google Sheets backend (via GAS Web App).
//
// 端末のユーザーが「気分の記録」「通所打刻」などを行うたびに、
// このファイルの post 関数が GAS Web App エンドポイントへ JSON を投げます。
//
// 設計の前提:
// - 端末がデータの真実、シートはバックアップ・集計用
// - 通信失敗・オフラインでも記録は失われない (localStorage キューに退避)
// - VITE_SHEETS_ENDPOINT が未設定なら何もしない (開発中・テスト中)
// - GAS は CORS の都合で Content-Type を text/plain にして
//   body に JSON を文字列として詰める
//
// アーキ:
//   logXxx() → postEvent() → outbox に push → tryFlushOutbox()
//   起動時 / online イベント時 / 新規 push 時に flush 試行。
//   成功した行だけ outbox から除去。失敗時は残して次のチャンスを待つ。

import type {
  AttendanceState,
  Mood,
  PrimaryInfluence,
  TodayCard,
} from '../data/types';
import { HISTORY_14, MEDS_VALUE, SLEEP_VALUE } from '../data/history';
import { CATEGORIES } from '../data/moods';

// selections の許可キー (H2: 真のホワイトリスト方式)。
// moods.ts の Category 定義から `${categoryId}.${sectionId}` で導出する。
// 未知キー (`unknownFreeText` 等) や `otherText` 系は通さない。
// `sleep.legacy` は syncHistoryOnce が使う履歴シード専用のキー。
const ALLOWED_SELECTION_KEYS: ReadonlySet<string> = new Set([
  ...CATEGORIES.flatMap((cat) =>
    cat.sections.map((sec) => `${cat.id}.${sec.id}`),
  ),
  'sleep.legacy',
]);

const ENDPOINT = import.meta.env.VITE_SHEETS_ENDPOINT as string | undefined;

const CLIENT_ID_KEY = 'seed.clientId';
const OUTBOX_KEY = 'seed.outbox.v1';
const HISTORY_SEED_KEY = 'seed.history.synced.v1';

function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = crypto.randomUUID
        ? crypto.randomUUID()
        : `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export type SheetEventType =
  | 'mood'
  | 'checkin'
  | 'checkout'
  | 'task'
  | 'settings';

export interface SheetEvent<P = unknown> {
  type: SheetEventType;
  ts: string;
  client: string;
  nickname?: string;
  payload: P;
}

// ── Outbox ────────────────────────────────────────────────────

function readOutbox(): SheetEvent[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as SheetEvent[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(events: SheetEvent[]): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(events));
  } catch {
    // quota — ignore (worst case: lose this event)
  }
}

function pushOutbox(event: SheetEvent): void {
  const outbox = readOutbox();
  outbox.push(event);
  writeOutbox(outbox);
}

let flushInFlight = false;

async function tryFlushOutbox(): Promise<void> {
  if (!ENDPOINT) return;
  if (flushInFlight) return;
  flushInFlight = true;
  try {
    let outbox = readOutbox();
    if (outbox.length === 0) return;
    // eslint-disable-next-line no-console
    console.info('[sheets] flushing outbox', outbox.length);

    while (outbox.length > 0) {
      const event = outbox[0];
      const ok = await trySend(event);
      if (!ok) {
        // 1件でも失敗したら以降は次のチャンスに任せる (順序を保つ)
        // eslint-disable-next-line no-console
        console.warn('[sheets] flush stopped, remaining:', outbox.length);
        return;
      }
      // 送信成功した分だけ削る (途中で別 logXxx が追記してる可能性があるので、毎回 read)
      outbox = readOutbox();
      outbox.shift();
      writeOutbox(outbox);
    }
    // eslint-disable-next-line no-console
    console.info('[sheets] outbox drained');
  } finally {
    flushInFlight = false;
  }
}

async function trySend(event: SheetEvent): Promise<boolean> {
  if (!ENDPOINT) return false;
  try {
    // eslint-disable-next-line no-console
    console.info('[sheets] →', event.type, event);
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(event),
      redirect: 'follow',
      keepalive: true,
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn('[sheets] ← HTTP', res.status);
      return false;
    }
    const text = await _safeText(res);
    // eslint-disable-next-line no-console
    console.info('[sheets] ←', event.type, res.status, text);
    // GAS は 200 でも {"ok":false,...} を返すことがある (auth / SHEET_ID 等)
    if (text.includes('"ok":false')) {
      return false;
    }
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[sheets] send failed', event.type, err);
    return false;
  }
}

async function _safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return '<no body>';
  }
}

// ── 公開 API ───────────────────────────────────────────────────

async function postEvent<P>(
  type: SheetEventType,
  payload: P,
  nickname?: string,
): Promise<void> {
  if (!ENDPOINT) {
    // eslint-disable-next-line no-console
    console.info(
      '[sheets] VITE_SHEETS_ENDPOINT が未設定です。' +
        '.env.local を作成して dev server を再起動してください',
      { type, payload },
    );
    return;
  }
  const event: SheetEvent<P> = {
    type,
    ts: new Date().toISOString(),
    client: getClientId(),
    nickname,
    payload,
  };
  pushOutbox(event);
  void tryFlushOutbox();
}

// 起動時に App.tsx から1回呼ぶ (在庫があれば送信トライ)
export function flushOutboxOnce(): void {
  void tryFlushOutbox();
}

// online に戻ったら自動 flush (モジュール初回 import 時に1度だけ登録)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // eslint-disable-next-line no-console
    console.info('[sheets] back online — flushing');
    void tryFlushOutbox();
  });
}

// テスト用 / デバッグ用
export const sheetsConfigured = !!ENDPOINT;

export function getOutboxSize(): number {
  return readOutbox().length;
}

// ── 必須 ───────────────────────────────────────────────────────

export interface MoodLogPayload {
  mood: Mood;
  primaryInfluence: PrimaryInfluence[];
  // 任意の詳細記録 (キーは `${categoryId}.${sectionId}`)
  selections: Record<string, string | string[] | null>;
  // note は端末ローカル限定 (§13.8) — Sheets には送らない
}

/**
 * 外部送信前に必ず通すホワイトリストフィルタ (T11 / §9.5 / H2)。
 * - トップレベルは mood / primaryInfluence / selections のみ通す。
 * - selections は `ALLOWED_SELECTION_KEYS` に含まれるキーだけ通す
 *   (未知キー `unknownFreeText`, `userMemo` 等が混入しても捨てる)。
 * - 値の型は `string | string[] | number | null` のみ許可。
 *   オブジェクト・関数・その他は型ガードで捨てる。
 */
export function sanitizeMoodPayload(payload: MoodLogPayload): MoodLogPayload {
  const cleanSelections: Record<string, string | string[] | null> = {};
  for (const [k, v] of Object.entries(payload.selections ?? {})) {
    if (!ALLOWED_SELECTION_KEYS.has(k)) continue;
    if (v === null) {
      cleanSelections[k] = null;
      continue;
    }
    if (typeof v === 'string') {
      cleanSelections[k] = v;
      continue;
    }
    if (typeof v === 'number') {
      cleanSelections[k] = String(v);
      continue;
    }
    if (Array.isArray(v) && v.every((item) => typeof item === 'string')) {
      cleanSelections[k] = v;
      continue;
    }
    // オブジェクト・関数・undefined などは落とす
  }
  return {
    mood: payload.mood,
    primaryInfluence: payload.primaryInfluence,
    selections: cleanSelections,
  };
}

export function logMood(payload: MoodLogPayload, nickname?: string) {
  // 二重防衛: 呼び出し側で除外していても、ここで必ず otherText / note を除去する。
  return postEvent('mood', sanitizeMoodPayload(payload), nickname);
}

export interface CheckInPayload {
  mode: TodayCard['mode'];
  band: TodayCard['band'];
  state: AttendanceState;
  time?: string;
}

export function logCheckIn(payload: CheckInPayload, nickname?: string) {
  return postEvent('checkin', payload, nickname);
}

export function logCheckOut(payload: CheckInPayload, nickname?: string) {
  return postEvent('checkout', payload, nickname);
}

// ── できれば ───────────────────────────────────────────────────

export interface TaskEventPayload {
  taskId: string;
  impact: 'basic' | 'effort';
  done: boolean;
}

/**
 * 外部送信前に必ず通すホワイトリストフィルタ (H1)。
 * - 自由文 (`name` / `text` / `memo` 等) を絶対に通さない。
 * - 許可キー (`taskId` / `impact` / `done`) だけを抜き出す。
 * - 呼び出し側が誤って自由文を載せても、ここで確実に落とす二重防衛。
 */
export function sanitizeTaskPayload(
  payload: Record<string, unknown>,
): TaskEventPayload {
  const rawTaskId = payload['taskId'];
  const rawImpact = payload['impact'];
  const rawDone = payload['done'];
  return {
    taskId: typeof rawTaskId === 'string' ? rawTaskId : '',
    impact: rawImpact === 'effort' ? 'effort' : 'basic',
    done: rawDone === true,
  };
}

export function logTask(
  payload: TaskEventPayload | Record<string, unknown>,
  nickname?: string,
) {
  // 二重防衛: name / text などの自由文が混入していても sanitize で除去する。
  return postEvent(
    'task',
    sanitizeTaskPayload(payload as Record<string, unknown>),
    nickname,
  );
}

export interface SettingsEventPayload {
  field:
    | 'nickname'
    | 'region'
    | 'recordIds'
    | 'schedule'
    | 'eggSpecies'
    | 'eggTrait'
    | 'eggName'
    | 'showWhisper';
  value: unknown;
}

export function logSettings(payload: SettingsEventPayload, nickname?: string) {
  return postEvent('settings', payload, nickname);
}

// ── 既存履歴の初回シード ──────────────────────────────────────
// アプリ起動時に1度だけ、既存の (モック) 14日分の履歴をスプレッドシートへ送る。
// 端末ごとに localStorage で「送信済みフラグ」を立てて重複送信を防ぐ。
// シード行は outbox を経由せず直接送信 (順序保証より「全部送れたか」が重要)。

const SLEEP_LABEL: Record<keyof typeof SLEEP_VALUE, string> = {
  good: 'good',
  normal: 'normal',
  shallow: 'shallow',
  bad: 'bad',
  oversleep: 'oversleep',
};
const MEDS_LABEL: Record<keyof typeof MEDS_VALUE, string> = {
  all: 'all',
  partial: 'partial',
  forgot: 'forgot',
  none: 'none',
};

export async function syncHistoryOnce(nickname?: string): Promise<void> {
  if (!ENDPOINT) return;
  try {
    if (localStorage.getItem(HISTORY_SEED_KEY)) return;
  } catch {
    return;
  }
  // eslint-disable-next-line no-console
  console.info('[sheets] seeding 14-day history →', HISTORY_14.length, 'rows');

  let okCount = 0;
  let failCount = 0;

  for (const d of HISTORY_14) {
    const ts = _daysAgoIso(d.dayOffset, '09:30:00');
    const moodPayload: MoodLogPayload = {
      mood: d.mood,
      primaryInfluence: [],
      selections: {
        'sleep.legacy':    SLEEP_LABEL[d.sleep],
        'meal.mealsTaken': d.tags.filter((t) =>
          ['breakfast', 'lunch', 'dinner', 'snack'].includes(t),
        ),
        'exercise.activityFlags': d.tags.filter((t) =>
          ['walk', 'stretch', 'commute', 'house', 'rest'].includes(t),
        ),
        'condition.conditionFlags':   [],
        'meds.medicationStatus':      MEDS_LABEL[d.meds],
      },
    };
    if (await _seedPost('mood', ts, moodPayload, nickname)) okCount++;
    else failCount++;
    if (d.attended) {
      const checkin: CheckInPayload = { mode: 'office', band: 'full', state: 'checkedIn', time: '9:42' };
      const checkout: CheckInPayload = { mode: 'office', band: 'full', state: 'checkedOut', time: '15:08' };
      if (await _seedPost('checkin', _daysAgoIso(d.dayOffset, '09:42:00'), checkin, nickname)) okCount++;
      else failCount++;
      if (await _seedPost('checkout', _daysAgoIso(d.dayOffset, '15:08:00'), checkout, nickname)) okCount++;
      else failCount++;
    }
  }

  if (okCount > 0 && failCount === 0) {
    try {
      localStorage.setItem(HISTORY_SEED_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    // eslint-disable-next-line no-console
    console.info('[sheets] seed done', { ok: okCount });
  } else {
    // eslint-disable-next-line no-console
    console.warn('[sheets] seed incomplete — フラグは立てません', {
      ok: okCount,
      fail: failCount,
    });
  }
}

function _daysAgoIso(daysAgo: number, hhmmss = '09:00:00'): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const [h, m, s] = hhmmss.split(':').map(Number);
  d.setHours(h, m, s, 0);
  return d.toISOString();
}

async function _seedPost<P>(
  type: SheetEventType,
  ts: string,
  payload: P,
  nickname?: string,
): Promise<boolean> {
  const event: SheetEvent<P> = {
    type,
    ts,
    client: getClientId(),
    nickname,
    payload,
  };
  return trySend(event);
}

// 強制再送信用 (デバッグ): localStorage のフラグをクリアして再シード
export function resetHistorySeed(): void {
  try {
    localStorage.removeItem(HISTORY_SEED_KEY);
  } catch {
    // ignore
  }
}
