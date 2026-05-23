import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages へのデプロイ用 base パス。
// リポ名 `seed` で配信されるため、本番ビルドだけ `/seed/` をプレフィックス。
// dev サーバ (`npm run dev`) はルート `/` のまま。
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/seed/' : '/',
}))
