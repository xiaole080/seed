// localStorage スキーマの単方向マイグレーション。
//
// 仕様 (Sprint 2026-05-23 Phase 2a):
//  - 起動時に1度だけ `runMigrations()` を呼ぶ。
//  - `seed.schema.version` を新設し、現行バージョンを保存する。
//  - 既存データはすべて 0.0.0 扱いとし、0.1.0 へ持ち上げる。
//  - マイグレーションは「既存データを壊さない」最小手で、未知の version は警告のみ。
//
// 0.0.0 → 0.1.0 の変更点:
//  - StoredDailyRecord.targetDateType (`today` | `yesterday`) を保存対象に追加。
//    既存レコードは持っていないので、`date` とマイグレ実行日との差から
//    補完するか、わからない場合は undefined を維持する (後方互換)。

import { loadJson, saveJson } from '../storage';
import type { StoredDailyRecord } from './store';

/** 現行のスキーマバージョン。新しいマイグレを足したら必ず上げる。 */
export const CURRENT_SCHEMA_VERSION = '0.1.0';

/** schemaVersion を保存する localStorage キー (新設)。 */
export const SCHEMA_VERSION_KEY = 'seed.schema.version';

/** 既存 DailyRecord キー。store.ts と一致させる。 */
const DAILY_KEY = 'seed.daily.v1';

/**
 * 保存済みの schemaVersion を返す。未設定なら '0.0.0'。
 * (= migrations 未導入時代に既に何かを保存しているユーザを表す)
 */
export function getStoredSchemaVersion(): string {
  return loadJson<string>(SCHEMA_VERSION_KEY, '0.0.0');
}

/** schemaVersion を保存する。 */
export function setStoredSchemaVersion(v: string): void {
  saveJson(SCHEMA_VERSION_KEY, v);
}

/** YYYY-MM-DD の2つの日付の差 (日数)。end - start。 */
function daysBetween(start: string, end: string): number {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return Number.NaN;
  const s = Date.UTC(sy, sm - 1, sd);
  const e = Date.UTC(ey, em - 1, ed);
  return Math.round((e - s) / 86400000);
}

function todayISOLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * 0.0.0 → 0.1.0
 *  - 既存 DailyRecord に targetDateType を補完する。
 *    マイグレ実行日との差で 0 日 → 'today'、1 日 → 'yesterday'、それ以外は未設定。
 *    既存値がある場合はそれを尊重する。
 */
function migrateDailyTargetDateType_0_0_0_to_0_1_0(): void {
  try {
    const today = todayISOLocal();
    const raw = loadJson<Record<string, StoredDailyRecord & { targetDateType?: 'today' | 'yesterday' }>>(
      DAILY_KEY,
      {},
    );
    let touched = false;
    for (const [date, rec] of Object.entries(raw)) {
      if (rec == null || typeof rec !== 'object') continue;
      if (rec.targetDateType != null) continue;
      const diff = daysBetween(rec.date ?? date, today);
      if (diff === 0) {
        rec.targetDateType = 'today';
        touched = true;
      } else if (diff === 1) {
        rec.targetDateType = 'yesterday';
        touched = true;
      }
      // 2 日以上前はわからないので undefined のまま (後方互換)。
    }
    if (touched) saveJson(DAILY_KEY, raw);
  } catch {
    // 壊れたデータが混ざっていても本体起動は止めない。
  }
}

/**
 * 起動時に1度だけ呼ぶ。失敗してもアプリ起動を止めない。
 */
export function runMigrations(): void {
  let version: string;
  try {
    version = getStoredSchemaVersion();
  } catch {
    version = '0.0.0';
  }

  if (version === CURRENT_SCHEMA_VERSION) return;

  // 想定外の version (未来のバージョンなど) は警告だけ出して終了する。
  // ダウングレードは想定しない (データを壊すリスクがあるため)。
  if (isAheadOfCurrent(version)) {
    try {
      // eslint-disable-next-line no-console
      console.warn(
        `[seed migrations] stored schemaVersion=${version} is ahead of ${CURRENT_SCHEMA_VERSION}; skipping migrations`,
      );
    } catch {
      // ignore
    }
    return;
  }

  // 0.0.0 → 0.1.0
  if (version === '0.0.0') {
    migrateDailyTargetDateType_0_0_0_to_0_1_0();
    setStoredSchemaVersion('0.1.0');
    return;
  }

  // ここに到達するのは「過去に未来の version を一度書き込んでから戻した」など
  // 想定外のケース。安全側で値だけ揃え、データには触れない。
  setStoredSchemaVersion(CURRENT_SCHEMA_VERSION);
}

/** 単純な semver 比較。a が現行より新しければ true。 */
function isAheadOfCurrent(a: string): boolean {
  const parse = (s: string) => s.split('.').map((n) => Number(n));
  const av = parse(a);
  const cv = parse(CURRENT_SCHEMA_VERSION);
  for (let i = 0; i < Math.max(av.length, cv.length); i++) {
    const x = av[i] ?? 0;
    const y = cv[i] ?? 0;
    if (Number.isNaN(x) || Number.isNaN(y)) return false; // 不正は ahead 扱いしない
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}
