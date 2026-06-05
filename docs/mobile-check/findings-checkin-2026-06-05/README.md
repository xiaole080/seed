# 打刻カード表示バグ 手動 viewport 確認（2026-06-05）

ui-verifier 未導入のため、ブラウザ自動化なしの手動確認手順。
本ディレクトリにスクショ（PNG）を保存する。修正後分は `after-fix/` に保存する。

## 真因（要約）

スクロール領域（`CheckInScreen.tsx:228`、`flex column` かつ `overflowY:auto`）の中で、
メインカードだけが `overflow:'hidden'` を持つため flex の `min-height` が 0 に解決され、
短い viewport では「唯一潰せる子」として圧縮され帰宅行が見切れていた。状態が進むほど
兄弟要素が増えて超過量が増し、カードがさらに縮んでいた。

## 修正

「スクロール領域内で伸縮してよいのはスペーサー（`flex:1`）だけ」を構造化し、
カード／ヒーロー／ボタン群／フッターに `flexShrink:0` を付与。超過分は `overflowY:auto`
が実際にスクロールするようになった。固定 height・padding 当て・PhoneShell の overflow
変更は行っていない。

## 確認手順

1. `npm run dev` を起動
2. Chrome DevTools の Device Mode で以下 3 viewport を開く
   - iPhone SE … 375 × 667（最も縦が短く、再現しやすい）
   - iPhone 12 … 390 × 844
   - Pixel 5 … 412 × 915
3. 打刻画面に遷移し、以下 3 状態を実際に作る
   - 未打刻（`s === 'before'`）
   - 通所打刻直後（`s === 'checkedIn'`）
   - 帰宅打刻直後（`s === 'checkedOut'`）
4. 各 viewport × 各状態（計 9 パターン）でスクショを撮る
   - 修正前: 本ディレクトリ直下に `before-<viewport>-<state>.png`
   - 修正後: `after-fix/<viewport>-<state>.png`

## 合格条件（9 パターン共通）

- [ ] メインカードの **「帰宅」行（帰アイコン＋「帰宅」ラベル）が常に見えている**
- [ ] カードの高さが **状態（before→checkedIn→checkedOut）で縮んで見えない**
- [ ] 縦が溢れる場合は **スクロールで全要素に到達できる**（潰れて消えない）
- [ ] BottomTabs が最下部に固定表示され、打刻ボタンと重ならない

## 自動テストでの担保

jsdom は実寸を測れずレイアウト圧縮自体は再現できないため、
`src/screens/interactions.test.tsx` に 3 状態で「到着」「帰宅」両行が DOM に存在する
回帰テストを追加（行削除リグレッションを止める）。圧縮の有無は上記の手動目視で確認する。
