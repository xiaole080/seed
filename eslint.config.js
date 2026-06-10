import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// ESLint 9 フラットコンフィグ。
// typescript-eslint + react-hooks を中心に、Prettier と競合する整形系ルールは
// eslint-config-prettier で無効化（整形は Prettier に一任）。
export default tseslint.config(
  // 生成物・依存・設定ファイルは Lint 対象外
  {
    ignores: ['dist', 'coverage', 'node_modules', 'gas'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // `_` 始まりの引数・変数は「意図的に未使用」を表す既存の慣習なので許可
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // console は原則控える。意図的な箇所は既存の eslint-disable で明示済み
      'no-console': 'warn',
      // 日本語 UI コピー内の全角スペースは表示上の意図があるため許可
      'no-irregular-whitespace': [
        'error',
        { skipStrings: true, skipTemplates: true, skipJSXText: true },
      ],
    },
  },
  // テスト・設定系ファイルは Node グローバルも許可
  {
    files: [
      '**/*.{test,spec}.{ts,tsx}',
      'src/test/**',
      'vite.config.ts',
      'vitest.config.ts',
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  // 設定ファイルは Vite/Vitest 流儀の triple-slash 参照を許可
  {
    files: ['*.config.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  // 整形系ルールは Prettier に委譲（最後に置いて競合ルールを無効化）
  prettier
);
