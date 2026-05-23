# 5時間スプリント指示書 — 体調記録MVPを5人テスト可能なスマホ安定版にする

> **このファイルは Claude Code に丸ごと貼り付けて渡すためのプロンプトです。**
> 先頭の「最初にやること」を必ず守ってから着手してください。

---

## 0. 前提（必ず読むこと）

### 技術スタック
- Vite + React 18 + TypeScript + Tailwind v3
- データ保存: `localStorage`（`src/storage.ts`）
- バックエンド: Google Apps Script 経由で Google Sheets に任意エクスポート（`gas/Code.gs`）
- テスト: Vitest + Testing Library

### コマンド
- `npm run dev` … 開発サーバ（http://localhost:5173）
- `npm run build` … 本番ビルド（`tsc -b && vite build`）
- `npm run test` … テスト1回
- `npm run coverage` … カバレッジ付き

### このリポジトリの開発フロー（**CLAUDE.md の規約に従うこと**）
データ・記録項目・外部送信・同意・自由記述に関わる変更は、`.claude/agents/` の subagent を**必ずこの順番で呼ぶ**：

1. `product-manager` — 仕様を読み、タスク分解と受け入れ条件を作る
2. `frontend-engineer` — 最小差分で実装
3. `qa-tester` — lint / build / test 実行 + エッジケース確認
4. `privacy-reviewer` — 個人データ取り扱いの監査（コード変更なし）

**省略禁止のケース**: 外部送信・保存先変更・記録項目変更・自由記述・同意導線・CSV/Sheets エクスポート項目変更。

軽微な修正（タイポ・コメント・スタイル微調整など、保存先・送信・記録項目に影響しないもの）はフロー省略可。

---

## 1. 最初にやること（実装着手前に必須）

**いきなりコードを書かない**。次の順で調査と計画を出す。

### 1-1. 現状調査（30分以内）
以下を `Read` / `Grep` / `Glob` で確認し、調査メモを `docs/sprint-status.md` に書く：

- `src/data/types.ts`, `src/data/records.ts`, `src/data/moods.ts`, `src/data/store.ts`, `src/data/history.ts`, `src/data/dailyMapper.ts`, `src/data/attendance.ts`, `src/data/attendanceExport.ts` の現状（**選択肢と記録項目は既に集約されている可能性が高い**）
- `src/screens/` 全画面の存在確認（HomeScreen, MoodLogScreen, CheckInScreen, HistoryScreen, ProfileScreen, ConsentScreen, LoginScreen, RecordItemsSetupScreen, CareScreen など）
- 既存の同意画面（ConsentScreen）の文言
- 既存の自由記述の扱い（一覧に露出していないか）
- `localStorage` に保存しているキーと構造
- 既存テストの一覧と網羅範囲

調査メモには「**指示書の各要件について、既存実装で達成済みか／未達か**」を1行ずつチェックリスト形式で書く。

### 1-2. デプロイ方針の決定（重要・先に決める）
ユーザー（らくさん）から指示された候補は「個人スマホに保存 / Google Drive」。
**Google Drive は HTML を直接ホスティングできない**（旧 Web ホスティング機能は廃止済み）。
そのため次の順で提案する：

1. **第一候補: Vercel** — `npm run build` → `vercel deploy` で5分。無料・HTTPS自動・URLを5人に配るだけ。
2. **第二候補: GitHub Pages** — `vite.config.ts` の `base` 設定が必要。
3. **第三候補: Netlify** — `dist/` をドラッグ&ドロップ。

決定したらユーザーに確認を取ること。**勝手にデプロイは絶対にしない**。

### 1-3. 計画の提示
1-1 / 1-2 を踏まえて、以下を提示してユーザーの了承を得てから着手：

- Phase 1〜4 のうち、**既に達成済みのものを除いた残タスク**
- 各タスクの想定差分（どのファイルを触るか）
- 想定リスク（特にデータ移行・型変更）

---

## 2. ゴール（優先度順）

1. **5人がスマホで使える**（モバイル UI 安定化）
2. **データが消えない・壊れない**（schemaVersion 導入と移行）
3. **アップデートしやすい**（ベタ書きの集約・CHANGELOG）
4. **研究/倫理の最低限文言**（既存 ConsentScreen の更新が基本）

優先度を逆転させない。迷ったら 1 を優先。

---

## 3. Phase 別タスク

> **注意**: 既存実装で既に満たされているものは Phase からドロップする。1-1 の調査結果に従う。

### Phase 1 — スマホ実機対応・致命バグ修正（最優先）
- [ ] iPhone SE 幅 (375px) / 通常 iPhone 幅 (390px) / Android 標準 (412px) で**横スクロールが出ない**
- [ ] ボタンのタップ領域が 44×44px 以上
- [ ] 自由記述 textarea が小さすぎず、キーボード表示時に隠れない
- [ ] ホームから「今日記録 / 昨日記録 / きろく / ケア / じぶん」に迷わず移動できる
- [ ] 既存の T6〜T13 機能（指示書参照）が壊れていない

実機確認が難しい場合は Chrome DevTools のモバイルエミュレートでスクリーンショットを撮り、`docs/mobile-check/` に保存。

### Phase 2 — データ保全・バックアップ
- [ ] 保存データに以下が含まれる：`testerId`, `recordDate`, `createdAt`, `updatedAt`, `targetDateType` (`today`/`yesterday`), `schemaVersion`
- [ ] **`schemaVersion` 移行戦略**: 既存データ（schemaVersion なし）を読み込む際は `"0.0.0"` 扱いとし、起動時に `"0.1.0"` へマイグレーション。マイグレーション関数は `src/data/migrations.ts` に独立して置く。テストを書く。
- [ ] 記録の更新時に `createdAt` を保持し、`updatedAt` のみ更新
- [ ] 今日分・昨日分の混入なし（`recordDate` を必ず保存）
- [ ] **エクスポート機能**: JSON で全データを書き出すボタンを「じぶん画面」または開発用画面に追加。CSV は通所分が既存（`attendanceExport.ts`）。気分記録 CSV は次の Phase で良い。
- [ ] 未記録を**欠席扱いしない**。`history` 系のロジックで「記録なし / 未打刻」と「欠席」を明確に分ける

### Phase 3 — アップデートしやすい構造
> **既存の `src/data/records.ts` `src/data/moods.ts` 等で集約済みの選択肢は再集約しない。** 不足分のみ追加。

- [ ] 表示ラベル（「今日の様子を記録する」など）が画面にベタ書きされていれば `src/data/copy.ts` に集約。すでに集約済みなら不要。
- [ ] `CHANGELOG.md` をリポジトリルートに新規作成。今回の変更点を `## [0.1.0] - 2026-05-23` で書く。
- [ ] `TESTING.md` を新規作成（起動方法・テスト用URL・testerId 一覧・スマホ確認手順・既知の未対応）
- [ ] `README.md` を更新（5人テスト向けの章を追加）

### Phase 4 — 研究・倫理の最低限整備
- [ ] 既存 `ConsentScreen` を確認し、以下を満たしているか確認・不足なら追記：
  - 医療行為・診断・治療ではない
  - 緊急時は支援員・医療機関・緊急窓口に相談
  - 個人名・施設名・第三者特定情報をなるべく書かない
  - 入力は任意
- [ ] 自由記述欄に注意文（書きたくないことは書かなくてよい・緊急相談に使わない）
- [ ] `researchConsent` を保存データに加える場合は初期値 `false`
- [ ] `README.md` に「研究利用には別途同意・倫理審査が必要」を明記
- [ ] 自由記述が `HistoryScreen` の一覧に直接露出していないこと（折りたたみ表示）

---

## 4. testerId の扱い

- 既存の `LoginScreen`（ニックネーム入力）を流用する案を**第一候補**として検討する。本名禁止の注意文を追加。
- 新規 UI を作るのは既存画面で達成できない場合のみ。
- testerId は `tester-01` 〜 `tester-05` の固定リストから選ぶ方式でも、自由入力（先頭が `tester-` でなくてもOK）でも良い。**ユーザーに方式を確認**してから実装。
- testerId ごとにデータを分けるか、単一端末1ユーザーでよいかも確認（指示書は「データ構造上は分ける」と書いているので最低限 storage キーに含める）。

---

## 5. やらないこと（明確に範囲外）

本格ログイン / 本番DB / 管理者画面 / AI 分析 / 医療判断 / 研究同意の正式取得 / 倫理審査書類 / 通知機能 / 月次レポート自動生成 / 大規模リデザイン / 既存集約済みコードの再リファクタ。

---

## 6. 完了の絶対基準（これを満たさない限り完了報告しない）

1. `npm run build` が成功する
2. `npm run test` が全件パス（既存テストを壊していない）
3. Chrome DevTools のモバイルエミュレート 3サイズで横スクロールなし
4. デプロイ URL が発行され、らくさんが自分のスマホで開けることを確認した
5. `TESTING.md` と `CHANGELOG.md` が存在する
6. `privacy-reviewer` のレビューで重大な指摘がない

---

## 7. 報告フォーマット（最終）

```markdown
## 完了したこと
- 

## スマホ確認結果
- 確認サイズ：375 / 390 / 412
- スクリーンショット：docs/mobile-check/

## デプロイ
- URL：
- 方法：(Vercel / GitHub Pages / その他)

## データ保存・出力
- 保存形式：
- エクスポート形式：
- testerId 方式：
- schemaVersion：0.1.0

## 研究・倫理まわり
- ConsentScreen の更新点：
- 自由記述注意文：

## subagent 実行ログ
- product-manager: 
- frontend-engineer: 
- qa-tester: 
- privacy-reviewer: 

## 未対応（既知）
- 

## 次にやるべきこと
- 

## 注意点・既知のリスク
- 
```

---

## 8. 判断基準（迷ったとき）

1. 5人がスマホで使えなくなる変更はしない
2. データが壊れる可能性がある変更はしない
3. **指示書の項目より、既存実装の現状を優先する**（重複作業しない）
4. 既存テストを壊す変更は qa-tester と privacy-reviewer を必ず通す
5. デプロイは必ずユーザー確認を取る
6. 本名・メールアドレス・医療情報を不要に集めない
7. 「未記録」を「欠席」と自動判定しない

迷ったらユーザーに聞く。**勝手に拡張しない**。
