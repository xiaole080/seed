# Sprint 現状調査メモ（2026-05-23）

SPRINT_PROMPT.md の §1-1 に基づく事前調査。

## 1. 既存実装のサマリ

- 直近完了：20260523.md 仕様書の T1〜T13（+ プライバシー指摘 H1/H2/M4/L1 修正）。`npm run build` クリーン、`npm test` 236 件グリーン。
- localStorage キー：`seed.daily.v1` / `seed.attendance.v1` / `seed.app.state.v1` / `seed.consent.v1` / `seed.care.goals.v1` / `seed.egg` / `seed.outbox.v1` / `seed.clientId` / `seed.history.synced.v1` / `seed.app.phase.v1`
- 外部送信：`src/api/sheets.ts` で `sanitizeMoodPayload` / `sanitizeTaskPayload` のホワイトリスト方式。自由記述・その他欄は構造的に送信不可（テスト済み）
- viewport：`<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">` あり
- PWA メタ：`apple-mobile-web-app-capable=yes`, `theme-color=#7FA982`, `manifest.webmanifest`, `apple-touch-icon` あり
- PhoneShell：`width: 100% / height: 100%`、`overflow: hidden`。レスポンシブの土台はある

## 2. SPRINT_PROMPT.md 要件ごとの達成チェック

### Phase 1 — スマホ実機対応・致命バグ修正

- [ ?] iPhone SE (375) / iPhone (390) / Android (412) で横スクロールなし — **未確認**（PhoneShell は `width: 100%` だが、screens 内の inline style に固定 width 値がないかは要走査）
- [ ?] ボタンタップ領域 44×44px 以上 — **未確認**（LoginScreen のボタンは h=52、ConsentScreen は h=56 で OK だが他は要走査）
- [ ?] 自由記述 textarea がキーボードで隠れない — **未確認**（MoodLogScreen の note 欄、HomeScreen の inline 入力など）
- [✅] ホームから「今日記録 / 昨日記録 / きろく / ケア / じぶん」遷移 — **達成済み**（HomeScreen + BottomTabs）
- [✅] T6〜T13 機能が壊れていない — **達成済み**（236 件テストグリーン）

### Phase 2 — データ保全・バックアップ

- [✅] `recordDate` 保存 — `StoredDailyRecord.date: 'YYYY-MM-DD'` で達成済み
- [✅] `createdAt` 保持 / `updatedAt` のみ更新 — `dailyMapper.ts` で達成済み
- [✅] 今日分・昨日分の混入なし — T7 で `date` ベース upsert により達成済み
- [❌] `testerId` — **未対応**（`LoginScreen` の `nickname` はあるが「テスター識別子」概念は未導入）
- [❌] `targetDateType` (`today`/`yesterday`) — **未保存**（フォーム遷移時は判定するが、`StoredDailyRecord` には保存していない）
- [❌] `schemaVersion` — **未対応**
- [❌] `src/data/migrations.ts` — **未存在**
- [❌] JSON 全データエクスポート — **未対応**（CSV は通所のみ既存）
- [✅] 未記録を欠席扱いしない — T12 で `未打刻` / `記録なし` 表示に分離済み

### Phase 3 — アップデートしやすい構造

- [△] ラベルベタ書きの集約 — `src/data/copy.ts` は未存在（`historyCopy.ts` はある）。20260523.md 実装での新規追加文言は各 screen に inline で書かれている。**部分対応**
- [❌] `CHANGELOG.md` — **未存在**
- [❌] `TESTING.md` — **未存在**
- [△] `README.md` の 5 人テスト向け章 — 既存 README 未確認（要差分追加）

### Phase 4 — 研究・倫理の最低限整備

- [✅] 医療診断ではない明示 — ConsentScreen に「医療的な診断はしません」あり
- [△] 緊急時の相談窓口 — ConsentScreen に「じぶん画面に相談先カード」とあり、`CrisisSupportCard` 実装あり。**ConsentScreen 本体で緊急窓口の具体名がない**（じぶん画面の CrisisSupportCard へ誘導）
- [△] 個人名・施設名を書かない注意 — MoodLogScreen の「その他」欄補足にはある（`個人名・施設名などを書きすぎないでください`）。ConsentScreen 本体にはない
- [❌] 入力は任意 — 明示文言が ConsentScreen にない（実装上は任意だが文言なし）
- [△] 自由記述欄の注意文 — note 欄に「書きたくないことは書かなくてよい」「緊急相談に使わない」の明示は**未確認**（MoodLogScreen の note 周辺要確認）
- [✅] `researchConsent` 初期値 `false`（相当） — `ConsentState.researchConsent` は `'notAsked' | 'declined' | 'accepted'` で初期 `'notAsked'`、研究目的の送信パスは存在しない
- [❌] README に「研究利用には別途同意・倫理審査が必要」 — **未追記**
- [✅] 自由記述が HistoryScreen 一覧に露出していない — T12 で折りたたみ表示済み

## 3. 未達タスクの優先度（指示書の§2 ゴール順）

| 優先度 | タスク | 推定工数 | 備考 |
|---|---|---|---|
| 1 (5人がスマホで使える) | Phase 1 全項目 | 中 | 横スクロール走査・タップ領域走査・textarea/キーボード対策・モバイル DevTools スクショ |
| 1 | デプロイ URL 発行 | 小 | ユーザーに方式確認後 |
| 2 (データが消えない) | schemaVersion 導入 + migrations.ts | 中 | 既存 236 件テスト維持しつつ移行ロジック追加 |
| 2 | testerId 導入 | 小 | LoginScreen の nickname 流用（本名禁止注意文追加）、`seed.app.state.v1` に格納 |
| 2 | targetDateType 保存 | 小 | `StoredDailyRecord` 拡張 + dailyMapper 修正 + migrations |
| 2 | JSON 全データエクスポート | 小 | ProfileScreen に「データを書き出す」ボタン、blob download |
| 3 (アップデートしやすい) | CHANGELOG.md 新規 | 小 | 0.1.0 で今回の変更を記載 |
| 3 | TESTING.md 新規 | 小 | 起動方法・テスト URL・testerId 一覧・既知の未対応 |
| 3 | README.md 更新 | 小 | 5 人テスト向け章 |
| 4 (研究・倫理) | ConsentScreen 文言補強 | 小 | 緊急窓口・個人名禁止・入力任意 |
| 4 | 自由記述注意文（note 欄） | 小 | MoodLogScreen の note 周辺 |
| 4 | README に研究利用注意 | 小 | 1 行 |

## 4. 既存集約済み（再リファクタしない）

- 選択肢：`src/data/moods.ts`（CATEGORIES）に完全集約済み
- 記録項目：`src/data/records.ts`（recordIds + customs）
- 通所：`src/data/attendance.ts` + `attendanceExport.ts`
- 外部送信ホワイトリスト：`src/api/sheets.ts`（`ALLOWED_SELECTION_KEYS` は `moods.ts` から動的生成）
- これらは**再集約しない**

## 5. デプロイ方針（ユーザー確認必要）

候補：
1. **Vercel**（推奨）— `vercel deploy`、無料、HTTPS自動、URL を 5 人に配るだけ
2. **GitHub Pages** — `vite.config.ts` の `base` 設定が必要
3. **Netlify** — `dist/` をドラッグ&ドロップ

Google Drive は HTML 直接ホスティング不可（旧 Web ホスティング機能廃止済み）。

## 6. testerId 方式（ユーザー確認必要）

候補：
1. **既存 LoginScreen の nickname 流用**（推奨）— 「本名は使わないでください」注意文を追加するだけで完了
2. **固定リスト `tester-01`〜`tester-05` から選ぶ**
3. **自由入力（先頭 `tester-` 任意）**

データ分離：仕様書は「データ構造上は分ける」と書いているため、**storage キーに testerId をプレフィックスとして含める**（例：`seed.daily.v1.tester-01`）or **`StoredDailyRecord` に `testerId` フィールドを足す**のどちらか。前者だと既存 5 人分が完全分離、後者だと 1 端末複数 testerId が可能。**ユーザーに確認**。
