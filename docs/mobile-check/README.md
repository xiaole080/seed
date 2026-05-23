# モバイル UI 確認手順

スマートフォン実機でのレイアウト・タップ領域・キーボード挙動を確認するためのチェックリスト。
Sprint 2026-05-23 Phase 1 の受け入れ条件に対応する。

## 1. 環境

### 簡易確認（推奨）

Chrome DevTools のモバイルエミュレーションで以下 3 サイズを順に確認する。

| 端末名         | width × height | 用途               |
| -------------- | -------------- | ------------------ |
| iPhone SE      | 375 × 667      | 一番狭い iOS       |
| iPhone 12 Pro  | 390 × 844      | 標準的な iOS       |
| Pixel 7 / 5    | 412 × 915      | Android 代表       |

DevTools → デバイスツールバー（Ctrl/Cmd + Shift + M）→ プリセットから選択。

### 実機確認（任意・QA フェーズ）

GitHub Pages のテスト URL を Safari / Chrome で開く。
ホーム画面に追加（PWA 起動）も別途確認する。

## 2. チェック項目

### 2.1 横スクロールが出ないこと

- 各画面を最後までスクロールし、横方向にコンテンツが切れていないか確認。
- 特に `position: 'absolute'` を使う `BackgroundLeaves` などが端から切れていないか。

### 2.2 ボタンタップ領域 44 × 44 px 以上

- ヘッダの戻るボタン（MoodLogScreen / CheckInScreen）
- 月送りボタン（ProfileScreen の通所 CSV エクスポート）
- ホームの「今日／昨日の様子を記録する」ボタン
- ボトムタブの 5 つのアイコン
- 同意画面の「同意して はじめる」ボタン
- 削除確認内の「やめる／はい、消します」ボタン

### 2.3 textarea / input が iOS Safari で zoom しないこと

`font-size: 16px` 以上であることを目視確認する。代表的な箇所:

- LoginScreen のニックネーム入力（`fontSize: 16` ✅）
- MoodLogScreen の自由記述 textarea（`fontSize: 14` ⚠ 必要に応じて 16 に上げる）
- ProfileScreen のニックネーム編集欄（`fontSize: 17` ✅）
- 「その他」自由入力欄（`fontSize: 13` ⚠）

Phase 1 では既存挙動を尊重し触っていない箇所がある。実機で zoom が発生していたら追加修正する。

### 2.4 キーボードが自由記述欄を隠さないこと

- MoodLogScreen の note を開いてフォーカスしたとき、入力欄がキーボードで隠れないか。
- iOS Safari と Android Chrome で確認する。

### 2.5 PhoneShell の枠が実機幅に追従していること

- `src/index.css` の `@media (max-width: 480px)` で `.phone-frame` が `width: 100vw` になっている。
- 320px〜480px のモバイル幅では枠の余白が出ない（フルブリード）。
- 481px 以上の PC では `max-width: 390px` のスマホ枠で中央表示される。

## 3. スクリーンショットの保管

Phase 1 のスクリーンショットは QA フェーズで以下に置く想定（任意）。

```
docs/mobile-check/
  iphone-se/        # 375 × 667
  iphone-12/        # 390 × 844
  pixel-7/          # 412 × 915
```

ファイル名の例:

- `home-375.png` / `home-390.png` / `home-412.png` (ホーム画面の 3 サイズ)
- `mood-390.png` (気分記録画面)
- `history-412.png` (きろく画面)
- `<screen-name>-<状態>.png` 形式 (例: `home-default.png`, `mood-submit.png`)

> 注: 2026-05-23 時点では、QA 環境がスクリーンショット保存可能な GUI 環境に
> なかったため、本ディレクトリには手順チェックリストのみが置かれています。
> 取得は配布者が手元の Chrome DevTools で行ってください。

## 4. 確認チェックリスト (QA フェーズで埋める)

dev サーバ (`npm run dev` → http://localhost:5174/) で各サイズを開き、
次の各項目について **OK / NG** を記録する。

### 4.1 375 px (iPhone SE)

- [ ] ホーム — 横スクロールバーが出ない
- [ ] ホーム — 「今日の様子を記録する」ボタンが画面内に収まる
- [ ] 気分記録 — 影響要因チップが折り返されて切れない
- [ ] 気分記録 — 自由記述 textarea の右端が見切れない
- [ ] きろく — 期間タブ (7日/14日/今月) が 1 行で収まる
- [ ] じぶん — 「データを書き出す（JSON）」ボタンが押せる
- [ ] 同意画面 — 「同意して はじめる」ボタンが画面内に収まる

### 4.2 390 px (iPhone 12 Pro)

- [ ] 上記すべて
- [ ] textarea にフォーカスしたとき iOS Safari が zoom in しない (実機のみ)

### 4.3 412 px (Pixel 7 / Android)

- [ ] 上記すべて
- [ ] BottomTabs の 5 つのアイコンが等間隔で並ぶ

## 4. 既知の補足

- ボトムタブの個別タップ領域は `BottomTabs` 内で確保しているため、ここでは個別に検査しない。
- `BackgroundLeaves` は装飾要素で z-index を絞っており、当たり判定とは独立。
