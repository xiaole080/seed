# 鳥ステージ・種別 後退防止 仕様書

最終更新: 2026-05-31
バージョン: 1.0
ステータス: ユーザー確認待ち（実装未着手）

---

## 1. 背景

### 1.1 現象

ホーム画面の鳥（`BirdStage`）は `deriveStage(streak, manualStage)` で導出される。
旧仕様では「記録のない日が続くと streak が 0 になり、`deriveStage` が 0 を返す
（= 卵に戻る）」現象が起きていた。

### 1.2 直前スプリント（2026-05-31 前半）での対応範囲

`src/App.tsx` の `useEffect` で `stage > state.manualStage` のとき
`update({ manualStage: stage })` を呼ぶことで、「到達した最大ステージを
`manualStage` に自動保存し、ステージの後退（卵化）を防ぐ」処理を追加済み。
回帰テストも `src/App.test.tsx` の
`describe('App — 到達ステージの永続化 ...')` ブロックに 3 ケース追加されている。

### 1.3 今回のスプリントで追加対応する範囲

上記対応は **ステージ（Stage 数値 0–3）のみ** を対象としていた。
ユーザーから次の追加要件が出た：

> 「鳥の種類（species）」も「前回の記録時点の値で保持」する。

`state.eggSpecies` は `EggSpeciesId = 'chicken' | 'robin' | 'quail'` の 3 値で、
オンボーディングの `EggCustomizeScreen` で選択して `update({ eggSpecies })` で
`seed.app.state.v1` に既に永続化されている。後退（リセット）は現状でも
明示的には起きていないが、仕様としてあらためて「直前の記録時点の species を保持する」
ことを宣言・保証する。

---

## 2. 仕様（ユーザー確定）

「記録のない日に鳥が卵に戻る」現象を止める。挙動は次のとおり：

1. **初回（記録ゼロ件）**：卵のまま表示。変更なし。
2. **「前回の記録と同じ状態」の定義**：
   - 鳥のステージ（`src/data/stages.ts` の `Stage`）
   - 鳥の種類（species、`src/data/species.ts` の `EggSpeciesId`）
   - 直前の記録時点の値で保持する。
3. **進行と後退のルール**：
   - 後退は禁止。
   - 前進は記録があった日にだけ再評価する。
   - 記録なし日は据え置き（前進判定もしない）。
4. **間隔の上限なし**：時間経過リセットなし。リセット条件は「データ削除」のみ。
5. **localStorage の構造**：
   - 必要なら新キー追加可（例: `seed.bird.lastStage.v1`）。
   - 既存 `seed.daily.v1` / `seed.app.state.v1` から導出可能なら、構造を増やさない方を優先。
   - 構造を増やす場合は migrations.ts への追記 + JSON エクスポート対象明示 +
     privacy-reviewer フロー対象。
   - 構造変更の有無は PM が判断（本仕様書 §6）。

---

## 3. 受け入れ条件（Given/When/Then）

| ID  | Given                                   | When                                          | Then                                                                     |
| --- | --------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| AC1 | 記録が一度もない                        | ホームを表示                                  | 鳥は卵（Stage 0）                                                        |
| AC2 | 直前に雛ステージ（Stage 2）の記録       | 翌日記録なしでホームを表示                    | 雛のまま（卵に戻らない）                                                 |
| AC3 | 直前に若鳥（Stage 3）・species X の記録 | 30 日後にホームを表示                         | 若鳥・species X のまま                                                   |
| AC4 | 直前ステージが雛（Stage 2）             | 今日の記録で成長条件（streak 3 達成）を満たす | 若鳥（Stage 3）に進む                                                    |
| AC5 | 雛ステージで記録のない日が続く          | その期間中                                    | 前進判定は走らない（streak は再評価されない / `manualStage` は据え置き） |
| AC6 | データ削除（じぶん画面 → 全データ削除） | 削除後ホームを表示                            | 卵に戻る（`state.eggSpecies` は初期値 `'chicken'` に戻る）               |

---

## 4. 真因分析

### 4.1 旧バグの真因（ステージ側 / 前回スプリントで修正済み）

- `deriveStage(streak, manualStage)` は `Math.max(manualStage, fromStreak)` を返す純粋関数。
- 仕様上「`manualStage` 由来分は維持される」が、`manualStage` を「到達した最大値」に
  更新する経路がどこにも無かった。
- 結果として `state.manualStage` は初期値 `0` のまま固定。streak が 0 に戻ると
  `deriveStage` も 0 を返し、卵に戻っていた。
- 直前スプリントで `src/App.tsx:298–304` に `useEffect` を追加し、
  `stage > state.manualStage` のとき `update({ manualStage: stage })` で
  単調増加に固定するよう修正済み。

### 4.2 species 側の現状（今回スプリントで宣言・確認したい範囲）

- `state.eggSpecies` は `INITIAL_STATE` で `'chicken'` 固定（`src/App.tsx:134`）。
- `EggCustomizeScreen` 保存時に `update({ eggSpecies, eggTrait, eggName })` で
  `seed.app.state.v1` に永続化される（`src/App.tsx:494–496`）。
- ホーム / リアクション画面では `state.eggSpecies` を `BirdStage` / `BirdSpecies` に渡す
  （`src/App.tsx:591, 642` / `src/screens/HomeScreen.tsx:239`）。
- **`StoredDailyRecord` には species フィールドは存在しない**
  （`grep species src/data/store.ts` → 0 件、`src/data/dailyMapper.ts` → 0 件）。
- 現状、オンボーディング以降に species を変更する UI は存在しない
  （`grep eggSpecies src/screens/ProfileScreen.tsx` → 0 件）。
- つまり species は実質「一度選んだら全データ削除まで固定」。後退（卵に戻る）も
  実装上は起きていない。今回の要件は「現状の挙動を仕様として明文化し、回帰しないこと
  を保証する」性格の作業になる。

### 4.3 「直前の記録時点の species」の取り扱い

species を記録ごとに変える運用ではない（記録項目に species は無い）ため、
「直前の記録時点の species」≒「現在 `state.eggSpecies` に保存されている species」と
等価。新規キーや派生計算を追加しなくても、`state.eggSpecies` を後退させないだけで
AC3 を満たせる。

---

## 5. 採用案：**案 A**（既存 state の意味だけを「最後に到達/選択した値」として固定）

### 5.1 結論

- ステージ側：直前スプリントで完了済み（`state.manualStage` を単調増加で更新）。
- species 側：`state.eggSpecies` が一度設定されたら、明示的なユーザー操作
  （`EggCustomizeScreen` での再選択 / 全データ削除）以外で書き換わらないことを
  仕様として明文化する。コード上の追加変更は最小（後述の回帰テストとコメント追記のみ）。

### 5.2 採用根拠

| 観点                               | 案 A                                       | 案 B (`seed.bird.lastStage.v1` 新設)                                                                 | 案 C (`seed.daily.v1` から導出)                             |
| ---------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 新規キー                           | なし                                       | あり                                                                                                 | なし                                                        |
| migrations                         | 不要                                       | 必要（0.3.0 → 0.4.0）                                                                                | 不要                                                        |
| JSON エクスポート影響              | なし（`seed.app.state.v1` で既に出ている） | 自動で含まれる（`collectSeedLocalStorage` が `seed.*` を総ざらえ）が、出力対象として明示の合意は必要 | なし                                                        |
| privacy-reviewer 要否              | 不要（保存先・記録項目・送信の変更なし）   | 必要（新キー追加 = データ取扱の変更）                                                                | 不要                                                        |
| species を最新記録から復元できるか | –                                          | –                                                                                                    | **不可**（`StoredDailyRecord` に species フィールドが無い） |
| ステージ側との実装統一感           | 既存 `manualStage` パターンと一致          | ストア二重化（state と新キー）                                                                       | 派生計算が現状コードに無く新規導入                          |

- 案 C は species を `seed.daily.v1` から復元できないため不採用。
- 案 B は新規キーを増やす実装コストとレビュー負荷に対し、得られる挙動は案 A と同じ。
  保存先の追加分だけプライバシー監査面のリスクが増える。
- 案 A は実装差分が最小・新規送信なし・新規保存先なし・テスト追加だけで仕様を担保できる。

→ **案 A を採用する。**

---

## 6. localStorage 構造変更の有無

- **変更：なし**
- 影響キー：
  - `seed.app.state.v1` … 既存。`manualStage`（既存）、`eggSpecies`（既存）を引き続き利用。
  - 新規キーなし。
- migrations 必要性：**なし**（`CURRENT_SCHEMA_VERSION` は `0.3.0` のまま据え置く）。
- JSON エクスポートの対応：**変更なし**。`seed.app.state.v1` は既に `collectSeedLocalStorage`
  の対象（`EXPORT_EXCLUDE_KEYS` に含まれない）。`manualStage` / `eggSpecies` は既存ユーザーの
  エクスポートにも含まれている。
- privacy-reviewer フロー要否：**省略可**（後述 §10 で再判定）。

---

## 7. 実装計画（frontend-engineer 向けタスク分解）

### 触るファイル

- `src/App.tsx` … コメント追記のみ（実装変更は伴わない）。
- `src/App.test.tsx` … 回帰テスト 1–2 ケース追加（species 側）。
- 必要に応じて `docs/specs/bird-stage-no-regression.md`（本書）の被リンク。

### タスク

| ID  | タイトル                                            | 概要                                                                                                                                                                                                                                                               | 依存 |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| T1  | species 後退防止の仕様コメントを App.tsx に追記     | `state.eggSpecies` の更新経路は `EggCustomizeScreen` 経由のみであり、データ削除以外でリセットされないことを 2–4 行のコメントで明示。実装変更はしない。`update({ eggSpecies, ... })` を呼ぶ箇所（現在 `src/App.tsx:494–496`）の直上に置く。                         | なし |
| T2  | 回帰テスト追加：AC1 卵から始まる                    | 記録ゼロ件の状態で `App` を render し、`stage=0` かつ `BirdStage` に `species='chicken'` が渡っていることを確認。既存 `App.test.tsx` の `'App — 到達ステージの永続化 ...'` describe に隣接させる。                                                                 | なし |
| T3  | 回帰テスト追加：AC3 species 保持（30 日後）         | `seed.app.state.v1` に `eggSpecies: 'robin'`, `manualStage: 3` を入れ、直近 31 日分の `seed.daily.v1` をすべて空（記録なし）にして `App` を render。マウント後の `seed.app.state.v1` の `eggSpecies` が `'robin'` のままであることを `waitFor` で確認。            | T2   |
| T4  | 回帰テスト追加：AC6 全データ削除で species も初期化 | `seed.app.state.v1` に `eggSpecies: 'quail'` を入れた状態から `じぶん` 画面 → 全データ削除を叩き、`seed.app.state.v1` が初期化されて `eggSpecies` が `'chicken'` に戻ることを確認。既存 `interactions.test.tsx` または `App.test.tsx` のどちらか自然な場所に追加。 | なし |
| T5  | 仕様書の被リンク                                    | `README.md` または `CHANGELOG.md` 末尾に「2026-05-31: 鳥ステージ・種別 後退防止 仕様（docs/specs/bird-stage-no-regression.md）」の一行リンクを追記。                                                                                                               | T1   |

### 受け入れ条件（タスク横断）

- AC1–AC6 すべてが自動テスト or 手動検証手順でカバーされている。
- `npm run build`、`npm run test`、`npm run lint` がすべて緑。
- `seed.*` 配下に新規キーが増えていない（`localStorage` のキー一覧に変化なし）。
- 外部送信（fetch / sendBeacon / GAS / Sheets）への変更が一切ない。

---

## 8. テスト計画

### 8.1 vitest で取れる範囲（自動）

| AC  | テスト方針                                                                                                                                                                    | 配置                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| AC1 | 記録ゼロ件で render → `stage=0` を確認                                                                                                                                        | `src/App.test.tsx`                                                       |
| AC2 | 既存「manualStage=3 で起動 → 記録なくても 3 を保つ」テストで実質カバー済。species 版を追加する場合は AC3 と統合可能                                                           | `src/App.test.tsx`（既存 + 追加）                                        |
| AC3 | `seed.app.state.v1` に `eggSpecies` 設定 → 31 日進めて render → 不変を確認                                                                                                    | `src/App.test.tsx`（T3 追加）                                            |
| AC4 | 既存「過去 3 日連続記録 (streak=3) で起動すると manualStage が 3 に引き上がる」でカバー済                                                                                     | `src/App.test.tsx`（既存）                                               |
| AC5 | `manualStage=2` 状態で streak=0 のとき再評価で 2 のまま、3 にも下にも動かないことを確認（既存テスト「manualStage=3 で起動 → 記録なく streak=0 でも manualStage は 3」が等価） | `src/App.test.tsx`（既存）                                               |
| AC6 | 全データ削除フローで `seed.app.state.v1` 全体が消える / `eggSpecies` が `'chicken'` に戻ることを確認                                                                          | `src/screens/interactions.test.tsx` または `src/App.test.tsx`（T4 追加） |

### 8.2 手動 viewport 確認（qa-tester 向け）

| AC  | 手順                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- |
| AC1 | LocalStorage を空にしてアプリ起動 → ホームに卵が表示されることを viewport 確認                             |
| AC2 | 何か記録を付けて Stage を 2 (`'🐣'`) まで上げ、翌日（端末日付を進める）にホームを開く → 雛のままであること |
| AC3 | EggCustomizeScreen で `robin` を選択し、記録を 1 度行う → 30 日後に開いても robin の雛 / 若鳥が出ること    |
| AC4 | streak が 2 の状態から 3 日目に記録 → 若鳥に進むこと                                                       |
| AC5 | manualStage=2 の状態で何日か放置 → 表示が 2 のまま、勝手に 3 に上がらないこと                              |
| AC6 | じぶん画面 → 全データ削除 → 同意フローからやり直し → ホームで `chicken` の卵が出ること                     |

---

## 9. MVP 範囲外（今やらないこと）

以下は今回の仕様で **明確に範囲外** とする。要望が出ても本スプリントでは扱わない。

- **Stage 4 以上の追加（種類別の最終形態など）**：`Stage` 型は `0 | 1 | 2 | 3` 固定。
  ここを変えると `STAGE_EMOJI` / `STAGE_LABEL` / `STAGE_COPY` / `STAGE_DAY_LABEL` /
  `STAGE_WHISPERS` 全表が連動するため、独立スプリントで仕様化する。
- **後退を許可する設定（「卵に戻す」「リセットしたい」ボタン）**：仕様 §2.3 の「後退禁止」と
  矛盾する。必要になったら全データ削除導線（既存）で対応する。
- **species を後から自由に変えるカスタマイズ UI（じぶん画面で species 切替）**：
  「直前の記録時点の値で保持」という今回の方針と整合するためには、変更時の
  挙動（過去記録の表示時 species をどう扱うか）を別途設計する必要がある。
- **species を `seed.daily.v1` の各 `StoredDailyRecord` に記録する仕様変更**：
  記録項目の追加に該当するため、追加するなら privacy-reviewer 必須。今回は不要。
- **Stage / species を Sheets / CSV にエクスポートする**：今回の要件と無関係。
  Sheets に `eggSpecies` フィールドは既に存在する（`src/api/sheets.ts:340, 381`）が、
  設定変更ログとしての扱いであり、本仕様で変更しない。

---

## 10. privacyレビュー要否

### 10.1 判定：**省略可**

CLAUDE.md「privacy-reviewer を必ず通すケース（省略禁止）」に照らした判定。

| チェック項目                                                                                             | 該当       | 理由                                                                                              |
| -------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| 外部送信に関わるコードの追加・変更（fetch / axios / XHR / sendBeacon / 外部スクリプト / 解析・監視 SDK） | 該当しない | 案 A はネットワーク経路を一切触らない。                                                           |
| データの保存先に関わる変更（localStorage / Cookie / サーバー / サードパーティ）                          | 該当しない | 既存 `seed.app.state.v1` の `manualStage` / `eggSpecies` を継続利用するだけで、新規キー追加なし。 |
| 記録項目の追加・変更（特に自由記述・気分・睡眠・服薬・通所記録）                                         | 該当しない | `StoredDailyRecord` のフィールドに変更なし。                                                      |
| Google Sheets エクスポート / CSV 出力の項目や挙動の変更                                                  | 該当しない | `sheets.ts` の `eggSpecies` 送信箇所には触れない。                                                |
| 同意取得・削除導線に関わる変更                                                                           | 該当しない | `deleteAllLocalData` と `onAllDataDeleted` のロジックは変更しない（AC6 は既存挙動の追認）。       |

### 10.2 ただし以下の運用ガードを置く

- 実装段階で frontend-engineer が「やっぱり新規キーが必要」と判断した場合は、
  本仕様書を案 B に切り替えるレビューを PM に戻す。**勝手にキーを増やさない。**
- T1 のコメント追記時、コメント本文に「外部送信なし / 保存先変更なし」を明示し、
  将来の改修時の誤読を防ぐ。

---

## 11. 既存ユーザーへの影響

- 既存 `seed.app.state.v1` の `manualStage` / `eggSpecies` をそのまま使う。
  schemaVersion は **`0.3.0` のまま据え置き**、`runMigrations()` への追記なし。
- 直前スプリントで `manualStage` 自動更新が入っているため、AC2 / AC4 / AC5 は
  既に既存テスター端末で機能している（回帰テストで担保済）。
- species 側は既に「明示的な再選択 or 全データ削除以外では書き換わらない」挙動。
  今回の仕様明文化により、その挙動を将来の改修で破壊しないことを文書 + テストで保証する。
- 再同意フローや削除・再同意要求は **不要**。

---

## 12. 不明仕様の洗い出し（ユーザー追加確認候補）

仕様確定済みのため最小限。次の 2 点だけ事前合意したい：

1. 「species を後から変える UI」を MVP 外として明確に範囲外（§9）に置いてよいか。
   将来要望がきても今は対応しないという立場で問題ないか。
2. T1 の「コメントのみ追記、実装変更なし」で良いか、それとも「念のため species 側にも
   `useEffect` で `state.eggSpecies` の不変ガードを書く」のような防御的実装を入れるか。
   PM は前者（コメントのみ）推奨。理由：現状コードに後退経路が存在せず、防御的 useEffect
   はむしろ将来の正当な species 変更 UI 追加時に副作用源になる。

---

## 13. 関連ファイル一覧（絶対パス）

- `C:\Users\xiaol\Desktop\seed\CLAUDE.md`
- `C:\Users\xiaol\Desktop\seed\src\App.tsx`
- `C:\Users\xiaol\Desktop\seed\src\App.test.tsx`
- `C:\Users\xiaol\Desktop\seed\src\data\stages.ts`
- `C:\Users\xiaol\Desktop\seed\src\data\species.ts`
- `C:\Users\xiaol\Desktop\seed\src\data\types.ts`
- `C:\Users\xiaol\Desktop\seed\src\data\store.ts`
- `C:\Users\xiaol\Desktop\seed\src\data\dailyMapper.ts`
- `C:\Users\xiaol\Desktop\seed\src\data\migrations.ts`
- `C:\Users\xiaol\Desktop\seed\src\data\jsonExport.ts`
- `C:\Users\xiaol\Desktop\seed\src\screens\HomeScreen.tsx`
- `C:\Users\xiaol\Desktop\seed\src\screens\EggCustomizeScreen.tsx`
- `C:\Users\xiaol\Desktop\seed\src\screens\ReactionScreen.tsx`
- `C:\Users\xiaol\Desktop\seed\src\screens\ProfileScreen.tsx`
- `C:\Users\xiaol\Desktop\seed\src\screens\interactions.test.tsx`
- `C:\Users\xiaol\Desktop\seed\src\components\BirdStage.tsx`
- `C:\Users\xiaol\Desktop\seed\src\components\BirdSpecies.tsx`
- `C:\Users\xiaol\Desktop\seed\src\api\sheets.ts`
