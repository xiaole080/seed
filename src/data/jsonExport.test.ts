// JSON 全データエクスポートのユニットテスト。
//
// 検証ポイント:
//  - `seed.*` で始まるキーのみ集める (= 関係ない他社キーは混入しない)
//  - JSON 値はパースして構造化される
//  - 非 JSON 値 (素の文字列) もそのまま保存される
//  - envelope に schemaVersion / exportedAt が入る
//  - ファイル名は `seed-export-YYYY-MM-DD.json`

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildExportEnvelope,
  collectSeedLocalStorage,
  exportFilename,
} from './jsonExport';

beforeEach(() => {
  localStorage.clear();
});

describe('collectSeedLocalStorage', () => {
  it('seed.* のキーだけを集める', () => {
    localStorage.setItem('seed.app.state.v1', JSON.stringify({ nickname: 'aaa' }));
    localStorage.setItem('seed.daily.v1', JSON.stringify({ '2026-05-23': { mood: 4 } }));
    localStorage.setItem('other-app.key', JSON.stringify({ foo: 1 }));

    const out = collectSeedLocalStorage();
    expect(Object.keys(out).sort()).toEqual(
      ['seed.app.state.v1', 'seed.daily.v1'],
    );
    expect((out['seed.app.state.v1'] as { nickname: string }).nickname).toBe('aaa');
  });

  it('非 JSON の値はそのまま文字列として残す', () => {
    // localStorage に直接非 JSON を入れた場合のフォールバック
    localStorage.setItem('seed.broken', '{ not json');
    const out = collectSeedLocalStorage();
    expect(out['seed.broken']).toBe('{ not json');
  });

  it('storage が空ならからのオブジェクトを返す', () => {
    expect(collectSeedLocalStorage()).toEqual({});
  });
});

describe('buildExportEnvelope', () => {
  it('schemaVersion / exportedAt / data が入る', () => {
    localStorage.setItem('seed.schema.version', JSON.stringify('0.1.0'));
    localStorage.setItem('seed.daily.v1', JSON.stringify({ '2026-05-23': { mood: 4 } }));
    const env = buildExportEnvelope(undefined, new Date('2026-05-23T10:00:00.000Z'));
    expect(env.schemaVersion).toBe('0.1.0');
    expect(env.exportedAt).toBe('2026-05-23T10:00:00.000Z');
    expect(env.data['seed.daily.v1']).toEqual({ '2026-05-23': { mood: 4 } });
  });

  it('schema.version 未設定なら 0.0.0', () => {
    const env = buildExportEnvelope(undefined, new Date('2026-05-23T10:00:00.000Z'));
    expect(env.schemaVersion).toBe('0.0.0');
  });
});

describe('exportFilename', () => {
  it('YYYY-MM-DD でゼロ埋めされる', () => {
    expect(exportFilename(new Date(2026, 4, 9))).toBe('seed-export-2026-05-09.json');
    expect(exportFilename(new Date(2026, 11, 31))).toBe('seed-export-2026-12-31.json');
  });
});

// QA 追加: 自由記述に含まれうる長文・改行・記号・絵文字・スクリプト風文字列が
// JSON エクスポートで崩れずにそのまま保存されることを確認する。
// (UI 表示時は React のテキストノードとしてエスケープされるため XSS にならない)
describe('buildExportEnvelope — 自由記述のエッジケース', () => {
  it('改行・カンマ・引用符・絵文字・script タグを含む note を素通しでラウンドトリップする', () => {
    const dangerous =
      '一行目\n二行目, with comma\n"quoted"\n<script>alert("xss")</script>\n🌱✨😊';
    localStorage.setItem('seed.schema.version', JSON.stringify('0.1.0'));
    localStorage.setItem(
      'seed.daily.v1',
      JSON.stringify({
        '2026-05-23': {
          localRecordId: 'r1',
          date: '2026-05-23',
          mood: 3,
          primaryInfluence: [],
          note: dangerous,
          missingness: {},
          createdAt: '2026-05-23T00:00:00.000Z',
          updatedAt: '2026-05-23T00:00:00.000Z',
        },
      }),
    );
    const env = buildExportEnvelope(undefined, new Date('2026-05-23T10:00:00.000Z'));
    // envelope を JSON シリアライズ → パース しても note が壊れない
    const json = JSON.stringify(env);
    const parsed = JSON.parse(json);
    expect(parsed.data['seed.daily.v1']['2026-05-23'].note).toBe(dangerous);
  });

  it('100KB を超える長文 note でもクラッシュしない (端末ローカル限定)', () => {
    const long = 'あ'.repeat(50_000); // 50,000 文字
    localStorage.setItem(
      'seed.daily.v1',
      JSON.stringify({
        '2026-05-23': { note: long, mood: 3, primaryInfluence: [], date: '2026-05-23' },
      }),
    );
    const env = buildExportEnvelope(undefined, new Date('2026-05-23T10:00:00.000Z'));
    const stored = (env.data['seed.daily.v1'] as Record<string, { note: string }>)[
      '2026-05-23'
    ];
    expect(stored.note.length).toBe(50_000);
  });

  it('seed.* 以外のキー (他アプリ / トラッキング系) は絶対に含めない', () => {
    localStorage.setItem('ga_session', 'tracker-1234');
    localStorage.setItem('_ym_uid', '0987');
    localStorage.setItem('other-app.private', 'secret');
    localStorage.setItem('seed.daily.v1', JSON.stringify({}));
    const env = buildExportEnvelope(undefined, new Date('2026-05-23T10:00:00.000Z'));
    const keys = Object.keys(env.data);
    for (const k of keys) {
      expect(k.startsWith('seed.')).toBe(true);
    }
    expect(keys).not.toContain('ga_session');
    expect(keys).not.toContain('_ym_uid');
    expect(keys).not.toContain('other-app.private');
  });
});

// P-3 対応: 端末識別子・未送信キュー・シード済みフラグは本人の記録ではないため
// JSON エクスポートに混ぜない (共有時に Sheets 側ログとの突合リスクを下げる)。
describe('collectSeedLocalStorage — 端末識別子と内部キーの除外 (P-3)', () => {
  it('seed.clientId はエクスポート対象から外す', () => {
    localStorage.setItem('seed.clientId', JSON.stringify('client-xyz'));
    localStorage.setItem('seed.daily.v1', JSON.stringify({ '2026-05-23': { mood: 3 } }));
    const out = collectSeedLocalStorage();
    expect(out).not.toHaveProperty('seed.clientId');
    expect(out).toHaveProperty('seed.daily.v1');
  });

  it('seed.outbox.v1 (未送信ペイロード) はエクスポート対象から外す', () => {
    localStorage.setItem(
      'seed.outbox.v1',
      JSON.stringify([{ kind: 'mood', payload: { mood: 3 } }]),
    );
    localStorage.setItem('seed.daily.v1', JSON.stringify({}));
    const out = collectSeedLocalStorage();
    expect(out).not.toHaveProperty('seed.outbox.v1');
  });

  it('seed.history.synced.v1 (シード済みフラグ) はエクスポート対象から外す', () => {
    localStorage.setItem('seed.history.synced.v1', JSON.stringify(true));
    localStorage.setItem('seed.daily.v1', JSON.stringify({}));
    const out = collectSeedLocalStorage();
    expect(out).not.toHaveProperty('seed.history.synced.v1');
  });

  it('buildExportEnvelope の data にも除外キーは現れない', () => {
    localStorage.setItem('seed.clientId', JSON.stringify('client-xyz'));
    localStorage.setItem('seed.outbox.v1', JSON.stringify([]));
    localStorage.setItem('seed.history.synced.v1', JSON.stringify(true));
    localStorage.setItem('seed.daily.v1', JSON.stringify({}));
    const env = buildExportEnvelope(undefined, new Date('2026-05-23T10:00:00.000Z'));
    const keys = Object.keys(env.data);
    expect(keys).not.toContain('seed.clientId');
    expect(keys).not.toContain('seed.outbox.v1');
    expect(keys).not.toContain('seed.history.synced.v1');
    expect(keys).toContain('seed.daily.v1');
  });
});
