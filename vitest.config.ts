/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// テスト専用設定。本番ビルドは vite.config.ts を使うので、
// ビルド設定とテスト設定は意図的に分離している。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    // テスト中は外部送信を確実に no-op に固定する。
    // (.env.local 由来の VITE_SHEETS_ENDPOINT がテストへ混入するのを防ぐ)
    env: {
      VITE_SHEETS_ENDPOINT: '',
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
      ],
    },
  },
});
