// 全データ JSON エクスポート (Sprint 2026-05-23 Phase 2d)。
//
// プライバシー方針:
//  - 本人操作・本人端末内の処理のみ。fetch は使わない。
//  - localStorage の `seed.*` キーを集めて 1 つの JSON にまとめ、Blob としてダウンロードする。
//  - 自由記述・その他欄も含まれるため、共有先には注意。
//    UI 側で「あなたの端末で書き出します。外には送られません」を明示する。

/**
 * `seed.*` で始まる全 localStorage キーを集めて 1 つのプレーン JSON に詰める。
 *  - 値は JSON.parse できれば構造化、そうでなければ素の文字列のまま入れる。
 *  - 純粋関数 (引数 storage を渡せばテストしやすい)。
 */
export interface JsonExportEnvelope {
  schemaVersion: string;
  exportedAt: string;
  /** localStorage のキー名 → 中身 (構造化 or 文字列) */
  data: Record<string, unknown>;
}

/**
 * P-3 対応: 利用者の記録としては不要かつ共有時に Sheets 側ログとの突合リスクを
 * 上げてしまうキーは、JSON エクスポートから明示的に除外する。
 *  - `seed.clientId`           : 端末識別子 (送信ログとの突合に使われうる)
 *  - `seed.outbox.v1`          : 未送信ペイロードのキュー (本人の記録ではない一時データ)
 *  - `seed.history.synced.v1`  : シード済みフラグ (本人の記録ではない内部状態)
 */
const EXPORT_EXCLUDE_KEYS: ReadonlySet<string> = new Set([
  'seed.clientId',
  'seed.outbox.v1',
  'seed.history.synced.v1',
]);

export function collectSeedLocalStorage(
  storage: Pick<Storage, 'length' | 'key' | 'getItem'> = localStorage,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k == null || !k.startsWith('seed.')) continue;
    if (EXPORT_EXCLUDE_KEYS.has(k)) continue;
    const raw = storage.getItem(k);
    if (raw == null) continue;
    try {
      out[k] = JSON.parse(raw);
    } catch {
      out[k] = raw;
    }
  }
  return out;
}

export function buildExportEnvelope(
  storage?: Pick<Storage, 'length' | 'key' | 'getItem'>,
  now: Date = new Date(),
): JsonExportEnvelope {
  const data = collectSeedLocalStorage(storage);
  const schemaVersion =
    typeof data['seed.schema.version'] === 'string'
      ? (data['seed.schema.version'] as string)
      : '0.0.0';
  return {
    schemaVersion,
    exportedAt: now.toISOString(),
    data,
  };
}

/** `seed-export-YYYY-MM-DD.json` のファイル名を返す。 */
export function exportFilename(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `seed-export-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(
    now.getDate(),
  )}.json`;
}

/**
 * ブラウザでダウンロードを発火させる。テストでは呼ばないこと (DOM 副作用あり)。
 */
export function downloadJson(filename: string, payload: unknown): void {
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // private mode / quota — 静かに失敗
  }
}
