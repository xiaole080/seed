# seed

就労移行支援の利用者向けセルフケアアプリ MVP。
体調を記録すると、画面の鳥が反応する設計を目指します。

## 技術スタック

- React 18 + Vite + TypeScript
- Tailwind CSS v3
- フォント: Zen Maru Gothic（Google Fonts）
- バックエンド: 後日 Google Apps Script の Web アプリエンドポイントと連携予定（現在はモック）

## 動かし方

前提: Node.js 18 以上 / npm

```bash
# 1. 依存をインストール
npm install

# 2. 開発サーバーを起動（http://localhost:5173 が開きます）
npm run dev

# 3. 本番ビルド
npm run build

# 4. ビルド結果のプレビュー
npm run preview

# 5. テスト
npm run test          # 一度だけ実行
npm run test:watch    # 変更を監視して再実行
npm run coverage      # カバレッジ付きで実行
```

## テスト

Vitest + Testing Library。テストは対象ファイルの隣に `*.test.ts(x)` で置いています。

- **データ/ロジック層**（`src/data` ほぼ100%カバー）— 記録の保存・連続日数・Missingness・通所CSV・気分マッパなど
- **`src/api/sheets.test.ts`** — Google Sheets 連携。「自由記述 note を外部送信しない（仕様 §13.8）」を検証
- **画面テスト** — 全画面のスモーク + 同意・ログイン・気分記録・打刻の操作

テストは実ネットワークへ出ません。`vitest.config.ts` で `VITE_SHEETS_ENDPOINT` を空に固定し、
`src/test/setup.ts` の既定 `fetch` は通信を試みると即失敗します（通信するテストは `vi.stubGlobal` で明示スタブ）。

## デザイン方針

- パステル調の淡い緑（moss）とクリーム色を基調
- 角は丸く、影はやわらかく
- 丸ゴシック（Zen Maru Gothic）
- 「失敗を責めない」「使わない日があってもキャラが弱らない」表現

色・影・角丸は `tailwind.config.js` の `theme.extend` に集約しています。

## 進行中のステージ

- [x] **Stage 1**: プロジェクト初期化 / Tailwind / テーマ / フォント
- [x] **Stage 2**: ログイン画面（ニックネーム入力 → localStorage 保存）
- [x] **Stage 3**: ホーム画面（鳥キャラ + 「気分を記録する」ボタン）
- [x] **Stage 4**: GAS Web App 経由で Google Sheets へ書き込み (下記参照)

## スプレッドシート連携

気分記録 / 通所打刻 / ちいさな目標の達成 / 設定変更 を Google Sheets に書き込みます。
端末がデータの真実、シートはバックアップ・集計用。送信失敗してもアプリの動作は止まりません。

### セットアップ

1. **シート作成**: 受け皿用のスプレッドシートを新規作成。シート名は何でも OK
2. **GAS 貼り付け**: メニュー「拡張機能」→「Apps Script」を開き、`gas/Code.gs` の中身をまるごとコピペ
3. **SHEET_ID 設定**: スプレッドシートURL の `/d/` と `/edit` の間の文字列を `SHEET_ID` 定数に書き込む
4. **デプロイ**: 「デプロイ」→「新しいデプロイ」→ 種類 = ウェブアプリ
   - 次のユーザーとして実行: 自分
   - アクセスできるユーザー: 全員
5. **URL を貼る**: 表示された Web App URL を `.env.local` に書く

   ```bash
   cp .env.example .env.local
   # 中の VITE_SHEETS_ENDPOINT に貼る
   ```

6. `npm run dev` を再起動して、気分を1件記録 → スプレッドシートに行が増えれば成功

### シート構成 (自動生成)

GAS 側が初回の書き込みで以下のタブを自動で作ります。

| タブ              | 何が入るか                    |
| ----------------- | ----------------------------- |
| `mood_logs`       | 気分の記録 (mood + カテゴリ + ひとこと) |
| `attendance`      | 通所打刻・帰宅打刻              |
| `tasks`           | ちいさな目標の達成 / 解除       |
| `settings_changes`| ニックネーム・地域などの変更    |

### セキュリティ

URL を知っている人なら誰でも書き込める状態になります。個人で使う想定。
共有する前に `gas/Code.gs` の `SHARED_SECRET` を設定してアプリ側にも揃えると安全です (任意)。

`VITE_SHEETS_ENDPOINT` を未設定のままにすると、送信は no-op になります（開発・テスト用）。

## 5 人テスト向け

5 人テストを実施する際の手順・参加者への案内・既知の制限は [`TESTING.md`](TESTING.md) を参照してください。

### 配布手順（要約）

1. 本リポジトリを GitHub の `seed` という名前のリポジトリに push する
2. Settings → Pages → Source を **GitHub Actions** に変更
3. main 向けの push があると `.github/workflows/deploy.yml` が `dist/` を Pages へデプロイする
4. 発行された URL（`https://<account>.github.io/seed/`）を参加者に渡す

詳細は [`TESTING.md`](TESTING.md) の「デプロイ手順」を参照。

### 参加者への注意

- **testerId は本名を使わないでください**。ニックネームを「じぶん」画面で testerId として表示します。
- **データはあなたの端末にだけ残ります**。気分・睡眠・食事・体調・服薬・自由記述は外部送信されません。
- 通所打刻と気分の概要のみ、配布者が Sheets 連携を設定している場合は送信対象になります（自由記述・その他欄は構造的に除外）。
- 「じぶん」画面で「データを書き出す（JSON）」「データを消す」がいつでもできます。

### 研究利用について

本 MVP は**セルフケアの使い勝手を確認する 5 人テスト**を主目的とします。
**研究利用には別途同意・倫理審査が必要です**。本アプリのデータをそのまま研究データとして使うことはできません。

### バグ報告

バグや気になった点は配布者にお知らせください。報告先（プレースホルダ）: `<配布者の連絡先>`

## ディレクトリ構成（予定）

```
seed/
├── README.md
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig*.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── routes/        # 画面（Stage 2 以降）
    ├── components/    # Bird, SoftButton など（Stage 3 以降）
    ├── hooks/         # useNickname など（Stage 2 以降）
    └── api/           # mock.ts（Stage 4）
```
