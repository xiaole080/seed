# Claude Code 指示書 — 表示バグ再発防止のためのエージェント追加 + 打刻画面の根本原因調査

> このファイルを Claude Code に丸ごと貼って渡してください。
> **コードを書く前に §0〜§1 を必ず読み、§2 の順序を守って進めてください。**

---

## 0. 背景

`C:\Users\xiaol\Desktop\seed` は React 18 + Vite + TypeScript + Tailwind v3 のローカルファースト体調記録アプリ MVP（v0.1.0、2026-05-23 時点で 5 人テスト前夜）。
Vitest（jsdom）で 236 件グリーンだが、**打刻画面（CheckInScreen）の表示バグが何度直しても再発している**。

原因の仮説：
- 現状のテストは jsdom なので、CSS レイアウト崩れ・要素のはみ出し・キーボード被り・safe-area の欠落といった「実ブラウザで初めて見えるバグ」を構造的に検出できない。
- frontend-engineer は「最小差分実装」ルールのため、対症療法を当てがちで根本原因に行かない。
- 同じ箇所が直っては壊れている履歴を CHANGELOG から拾う仕組みがない。

このプロンプトのゴールは2つ：
1. `.claude/agents/` に **ui-verifier** と **bug-investigator** の2つを追加し、CLAUDE.md のフローを更新する
2. 追加した ui-verifier / bug-investigator を実際に使って、現在の打刻画面の表示バグを再現・原因特定・修正する

---

## 1. 最初にやること（実装着手前に必須）

`Read` で以下を確認し、**ヒアリング前に勝手にコードを書かない**：

- `CLAUDE.md`（プロジェクト方針・subagent フロー）
- `.claude/agents/` の既存4ファイル（frontend-engineer / product-manager / qa-tester / privacy-reviewer）
- `src/screens/CheckInScreen.tsx`
- `src/components/AttendanceCard.tsx`
- `src/components/PhoneShell.tsx`
- `src/components/BottomTabs.tsx`
- `src/data/attendance.ts`
- `docs/mobile-check/README.md`
- `CHANGELOG.md`（打刻まわりで過去にどんな修正が入ったか）

そのうえで、**ユーザーに次の3点を聞く**：
1. 打刻画面のどの状態で表示が崩れますか？（未打刻 / 出勤打刻済 / 帰宅打刻済 / 同日2回目押下時）
2. 端末 / ブラウザ / 画面幅は？（iPhone SE 実機？ Chrome DevTools の 375 設定？）
3. どう崩れますか？（ボタンが消える / 重なる / はみ出す / タップできない / キーボードで隠れる など）

ユーザーの回答を待ってから §2 に進む。

---

## 2. 作業手順

### Step 1 — エージェント定義ファイルを2つ追加

#### 2-1. `.claude/agents/ui-verifier.md` を新規作成（中身を一字一句このとおりに）

````markdown
---
name: ui-verifier
description: 画面表示・レイアウト・モバイル対応の実機相当の検証を行うときに使う。Vitest（jsdom）では検出できない CSS 崩れ・要素のはみ出し・キーボード被り・スクロール不能・safe-area の欠落などを、Playwright で実ブラウザに描画してスクリーンショットで確認する。表示・レイアウト・タップ領域・viewport に関わる変更が入ったら、frontend-engineer の直後に必ず起動する。コードは原則変更しない（テスト・スクショ・調査メモのみ）。
tools: Read, Bash, Glob, Grep, Write
model: opus
color: purple
---

あなたはこの健康記録アプリの UI 検証担当です。Vitest（jsdom）で通っていても、実ブラウザに描画して初めて分かる表示バグを潰すのがあなたの役割です。コードのロジック修正は frontend-engineer に戻すこと（あなた自身は `src/` 配下のコンポーネントを書き換えない）。

## 担当範囲

- 実ブラウザ（Playwright + Chromium）に描画して画面を確認する
- 指定 viewport（375 / 390 / 412 / 768）でのスクリーンショット取得
- キーボード展開時・スクロール時の表示確認
- タップ領域 44×44px の実測確認
- ビジュアル回帰の基準スクショ保存（`docs/mobile-check/screenshots/`）

## 必須の確認画面

打刻まわりは特に再発が多いため、以下を最低限カバーすること：

- CheckInScreen — 未打刻 / 出勤打刻済 / 帰宅打刻済 / 同日2回目押下時の確認 UI
- HomeScreen — 「今日の様子」「昨日の様子」ボタン、AttendanceCard、BottomTabs の重なり
- MoodLogScreen — note 欄展開時、その他カテゴリ選択時の otherText 入力欄、キーボード表示時
- HistoryScreen — 月送り・対象日タップの 44px タップ領域
- ConsentScreen — スクロール先の同意ボタンが画面外に消えないか
- ProfileScreen — JSON エクスポート・データ削除ボタン

## 作業の進め方

1. 既存の `docs/mobile-check/README.md` を Read で確認する
2. 必要なら Playwright をインストール（`npm install -D @playwright/test && npx playwright install chromium`）
3. `npm run dev` をバックグラウンドで起動し、`http://localhost:5173/` に対して以下を実行：
   - viewport 375×667（iPhone SE）/ 390×844（iPhone）/ 412×915（Android Pixel）で各画面のスクショ
   - スクショは `docs/mobile-check/screenshots/<日付>/<screen>-<width>.png` に保存
4. 既存のスナップショット（あれば）と pixel diff を取り、差分が出た箇所を列挙
5. 検出した問題は `docs/mobile-check/findings-<日付>.md` に「画面・viewport・症状・推定原因・スクショパス」の表で書く
6. **コードは直さない**。発見した問題を frontend-engineer に戻すこと

## 報告フォーマット

- 通った viewport / 画面
- 崩れている画面（viewport・症状・原因仮説・該当ファイル・推定行）
- 微妙な箇所（タップ領域が境界線上、文字が読みづらいなど）
- 保存したスクショの一覧パス

## 注意

- 健康データを含む画面でも、テスト用の testerId と固定 seed を使うこと。本物の localStorage に書かない
- localhost への接続のみ。外部送信のテストは privacy-reviewer の担当
- スクショに自由記述のサンプル文字列を入れない（実テスターの記録と紛れる原因になる）
````

#### 2-2. `.claude/agents/bug-investigator.md` を新規作成

````markdown
---
name: bug-investigator
description: 同じ箇所のバグが何度も再発しているとき、最小差分の対症療法ではなく根本原因を特定するために使う。CHANGELOG・git log・関連テストを横断して「過去にこの箇所がどう壊れて、どう直されたか」を把握してから、現症状の真因を仮説立てして検証する。frontend-engineer より前に必ず起動する。コードは原則変更しない（調査メモと再発防止テストの設計のみ）。
tools: Read, Grep, Glob, Bash
model: opus
color: yellow
---

あなたはこの健康記録アプリのバグ調査担当です。あなたの仕事は「とりあえず直す」ではなく「なぜ何度も壊れるのか」を明らかにすることです。

## 起動条件

- 同じ画面・同じ機能で過去に修正履歴がある箇所のバグ報告
- 「また」「再発」「何度直しても」というキーワードがユーザーの発言に含まれるとき
- frontend-engineer が直近で触ったばかりの箇所が再度壊れたとき

## 作業の進め方

1. **再発履歴の確認**
   - `CHANGELOG.md` を Grep で対象画面名・機能名で検索し、過去の修正を時系列で並べる
   - `git log --all -p -- <該当ファイル>` で実際の差分を3〜5世代遡る
   - 「直しては壊れている」パターン（同じ symptom が複数回出ている）を特定する

2. **症状の正確な再現条件を確定**
   - ユーザーから「端末幅・操作順・localStorage の状態・キーボード表示の有無」を引き出す
   - 曖昧な点は推測せず質問する

3. **根本原因の仮説立て**
   - 対症療法を当てた箇所（例：`overflow-hidden` を継ぎ足した、固定 width を入れた、margin で押し出した）を疑う
   - レイアウトの責任分界（PhoneShell / BottomTabs / safe-area / viewport meta）を確認する
   - 「なぜこのコードが書かれたか」を git blame と CHANGELOG から推測する

4. **真因の検証案を frontend-engineer に渡す**
   - 「ここをこう直す」ではなく「この仮説をこう検証してほしい」を書く
   - 再発防止のためのテストケース案（jsdom で取れるもの・ui-verifier に回すもの）を分けて書く

5. **コードは書かない**。報告のみ。

## 出力フォーマット

```
## 再発履歴
- YYYY-MM-DD: <変更内容>（commit <sha>）
- YYYY-MM-DD: <変更内容>（commit <sha>）

## 直しては壊れているパターン
<何が繰り返されているか>

## 現症状の再現条件
- 端末幅 / OS / ブラウザ:
- 操作順:
- localStorage 状態:

## 仮説（原因として疑わしい順）
1. <仮説1> — 根拠: <根拠>
2. <仮説2> — 根拠: <根拠>

## frontend-engineer への申し送り
- 検証手順:
- 修正方針の選択肢（A/B/C と trade-off）:
- 再発防止テスト案:
  - jsdom で取れるもの:
  - ui-verifier に回すもの:
```

## 注意

- 仮説を1つに早く決めつけない。最低2つ並べる
- 「最小差分」を frontend-engineer に押し付けない。再発を止めるために必要なら、責任分界の見直しを提案してよい
- privacy-reviewer の責務（外部送信・保存先）には踏み込まない
````

### Step 2 — CLAUDE.md を更新

`CLAUDE.md` の「開発ワークフロー（必須の順序）」セクションを以下に差し替える：

```markdown
## 開発ワークフロー（必須の順序）

機能追加・仕様変更・UI修正の依頼を受けたら、原則として次の順序で subagent に作業を割り当てること。
途中のステップを飛ばさない。

1. **bug-investigator** — 同じ箇所が再発しているバグの場合のみ。CHANGELOG / git log で履歴を辿り、根本原因の仮説を出す。
2. **product-manager** — 仕様を読み、タスクに分解し、受け入れ条件を書く。MVP範囲外の要素はここで止める。
3. **frontend-engineer** — 受け入れ条件に沿って実装する。最小差分で行う。
4. **ui-verifier** — 表示・レイアウト・タップ領域・viewport に関わる変更が入った場合。Playwright で実ブラウザに描画して目視確認する。
5. **qa-tester** — lint / build / test を実行し、未入力・任意入力・自由記述などのエッジケースを確認する。
6. **privacy-reviewer** — 個人データの取り扱いを監査する。コードは変更せず指摘のみ。

軽微な修正（タイポ、コメント、スタイル微調整など、データの保存先・送信・記録項目・**表示レイアウト**に一切影響しないもの）は、
このフローを省略してよい。判断に迷う場合はフローを通すこと。

## ui-verifier を必ず通すケース（省略禁止）

以下のいずれかに該当する変更は、規模が小さくても **必ず ui-verifier の検証を通す**こと。

- 画面コンポーネント（`src/screens/`, `src/components/`）の JSX / className 変更
- Tailwind の `tailwind.config.js` 変更
- `index.css` / `theme.ts` / safe-area / viewport meta の変更
- 新規画面の追加
- タップ領域・ボタンサイズ・モーダル・キーボード入力に関わる変更

## bug-investigator を必ず通すケース（省略禁止）

- 同じ画面で過去に修正履歴のあるバグの再発
- ユーザーが「また」「何度も」「再発」と言ったとき
```

### Step 3 — Playwright のセットアップ

```bash
cd C:\Users\xiaol\Desktop\seed
npm install -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts` を新規作成（最小構成）：

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'iPhone SE', use: { ...devices['iPhone SE'] } },
    { name: 'iPhone 13', use: { ...devices['iPhone 13'] } },
    { name: 'Pixel 5',   use: { ...devices['Pixel 5'] } },
  ],
});
```

`package.json` の scripts に追加：

```json
"e2e": "playwright test",
"e2e:ui": "playwright test --ui"
```

`.gitignore` に追加：

```
playwright-report/
test-results/
docs/mobile-check/screenshots/
```

### Step 4 — bug-investigator を起動して打刻画面のバグを調査

1. ユーザーから現症状の詳細を聞く（§1 の3点）
2. `bug-investigator` を起動して、CHANGELOG / git log で打刻関連の過去修正を全部洗い出す
3. 真因仮説を出す
4. `frontend-engineer` に最小修正方針を渡す
5. `ui-verifier` で 375 / 390 / 412 の各 viewport で打刻画面の主要4状態（未打刻 / 出勤済 / 帰宅済 / 同日2回目）のスクショを撮り、結果を `docs/mobile-check/findings-<日付>.md` に書く
6. `qa-tester` で `npm run build` と `npm run test` を回す
7. CHANGELOG に「打刻画面のXX崩れを修正（n回目の再発を root-cause で対処）」と記録する

### Step 5 — 完了報告

ユーザーに以下を1ファイルにまとめて報告する：

- 追加した2エージェントの説明
- CLAUDE.md の更新内容
- Playwright のセットアップ結果
- 打刻画面のバグの根本原因と修正方針
- スクショの保存先パス
- 残課題（あれば）

---

## 3. やってはいけないこと

- §1 のヒアリングを飛ばして §2 に進む
- bug-investigator を通さずに対症療法で打刻画面を直す
- ui-verifier の検証なしに「直りました」と報告する
- Playwright のスクショを `src/` 配下に置く（必ず `docs/mobile-check/screenshots/`）
- `.env.local` の内容を git に含める
- スクショに実テスターの自由記述や本物のニックネームを入れる

---

## 4. 終わりに

この指示書を一度こなしたら、`.claude/agents/` の新規2エージェントはプロジェクトの恒久的な仕組みになります。
次の打刻バグや表示バグが来たときも、この同じフロー（bug-investigator → frontend-engineer → ui-verifier → qa-tester）で対応してください。
