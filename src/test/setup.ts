// Vitest 共通セットアップ。
// - jest-dom のカスタムマッチャ (toBeInTheDocument 等) を有効化
// - jsdom 未実装の URL.createObjectURL / revokeObjectURL をスタブ
// - 各テスト後に DOM・localStorage・env/global スタブをリセット

import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom は Blob URL を実装していない。CSV ダウンロード処理を
// テストから安全に呼べるように差し替える。
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:seed-mock'),
  writable: true,
  configurable: true,
});
Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

// テストは実ネットワークへ出てはならない (機微な健康データの保護)。
// 通信を伴うテストは必ず vi.stubGlobal('fetch', ...) で明示的にスタブすること。
// スタブし忘れたテストが無防備に実通信しないよう、既定の fetch は即座に失敗させる。
globalThis.fetch = (() => {
  throw new Error(
    'テスト中のネットワークアクセスは禁止されています。' +
      'fetch を使うテストは vi.stubGlobal("fetch", ...) で明示的にスタブしてください。',
  );
}) as typeof fetch;

afterEach(() => {
  cleanup();
  // テスト間で localStorage を持ち越さない (記録データの汚染防止)
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
