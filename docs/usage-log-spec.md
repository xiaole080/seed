# 利用ログ（使用状況の記録）機能 仕様書

- 作成: product-manager / 2026-06-12
- 目的: 5人テストで「アプリがどう使われているか」を把握する。
  健康データの中身（気分・睡眠・服薬・通所・自由記述・入力内容）はログに一切含めない。
  記録するのは **イベントの種類と ISO タイムスタンプ（+ 記録時間算出用の相関ID）のみ**。
- 実装担当: frontend-engineer / 検証: qa-tester / 監査: privacy-reviewer（省略禁止、後述）

---

## 1. スコープ確定

### MVP に含める

- 4 種類の利用イベントの localStorage への記録（健康データとは別キー）
  1. 記録にかかる時間（記録画面 open → 保存 save / 途中離脱 abandon）
  2. 記録頻度（保存イベント。内容は含めない）
  3. アプリを開く頻度（起動 / フォアグラウンド復帰）
  4. 記録チェック頻度（過去記録の閲覧画面 = HistoryScreen を開いた）
- 設定画面（ProfileScreen）への「利用ログ」カード追加
  - イベント一覧表示（テキストのみ）
  - 簡単な集計: 直近 14 日の「記録回数 / 起動回数 / 閲覧回数 / 平均記録時間（秒）」
  - 「コピー」ボタン: 本人が内容を画面で確認したうえで明示タップしたときだけ、CSV テキストをクリップボードへコピー
  - 「ログを全削除」ボタン（既存カード同様の二段階確認）
- 「すべてのデータを削除」(deleteAllLocalData) に利用ログキーを含める（全削除導線の維持）
- ログが空 / 存在しない / private mode でも他機能が壊れないこと

### MVP に含めない（範囲外。今はやらない）

| 項目 | 理由 |
| --- | --- |
| グラフ・チャート描画 | 5人テストの把握目的にはテキスト集計で十分。実装コストに見合わない |
| サーバ送信・自動送信・解析SDK（GA等） | CLAUDE.md の原則違反。外部送信は Sheets 任意エクスポートと CSV のみが許容範囲で、利用ログはそのどちらにも乗せない |
| Google Sheets への利用ログ送信 | 依頼仕様が「自動送信は一切しない / コピーのみ」。sanitize*Payload の対象拡大も不要 |
| 上記 4 種以外のイベント追加（タップ位置、画面ごとの滞在時間、ケア画面・設定画面の利用など） | イベント種類が増えるほど行動プロファイリングに近づく。目的に必要な最小 4 種に限定 |
| 端末識別子・ニックネーム等のログへの付与 | ログは端末ローカルで本人がコピーする運用。テスター識別はコピー受領時に人手で対応 |
| ログの編集・個別行削除 UI | 全削除のみで十分。誤操作リスクの方が大きい |
| 新しい同意画面の追加 | 端末内保存のみ・外部送信なしのため新規同意は不要。代わりにカード内で「端末内のみ・送信されない」旨を明示する（決定事項 D-6 参照） |

---

## 2. データモデル定義案

### 2.1 イベント種類（enum として確定）

| イベント名 | 発火タイミング |
| --- | --- |
| `app_open` | アプリ起動時（App マウント時に 1 回）+ `visibilitychange` で `visible` に復帰した時 |
| `record_open` | route が `'mood'` になった時（MoodLogScreen 表示） |
| `record_save` | MoodLogScreen の onSubmit 内、`upsertDailyRecord()` 成功直後 |
| `record_abandon` | route が `'mood'` から save を経ずに離れた時（onCancel 含む） |
| `history_open` | route が `'log'` になった時（HistoryScreen 表示） |

### 2.2 イベント構造

```
UsageEvent {
  type: 'app_open' | 'record_open' | 'record_save' | 'record_abandon' | 'history_open'
  at: string          // ISO 8601 タイムスタンプ (new Date().toISOString())
  sessionId?: string  // record_* のみ。open/save/abandon を相関させる ID
}
```

- フィールドは上記 3 つ **のみ**。これ以外のフィールドを構造的に持たない（型で禁止する）。
- 気分値・睡眠・服薬・通所・自由記述・入力テキスト・記録対象日・ニックネーム等は
  **いかなる形でもイベントに含めない**。記録「内容」と「対象日」はログから一切復元できないこと。
- `sessionId` は `record_open` 時に発番（`crypto.randomUUID()`、フォールバックはタイムスタンプ + 乱数）。
  個人・端末を識別しない一時的な相関 ID であり、セッションをまたいで再利用しない。
- 保存形式: `UsageEvent[]`（追記式の配列）。`loadJson` / `saveJson`（src/storage.ts）を使用し、
  private mode では既存ヘルパの try/catch により黙って no-op になる。

### 2.3 所要時間の算出

- 所要秒数はイベントには保存せず、**集計時に算出**する:
  同一 `sessionId` の `record_open.at` → `record_save.at` の差分秒。
- `record_abandon` は「未完了」として件数のみ集計（所要時間の平均には含めない）。
- `record_open` に対応する save / abandon が存在しないもの（記録途中でタブを閉じた等）は、
  集計時に「未完了」として扱う（決定事項 D-2）。

### 2.4 容量ガード

- イベント件数の上限を **2000 件** とし、超過時は古いものから FIFO で破棄する（決定事項 D-4）。

---

## 3. localStorage キー名（確定）

```
seed.usagelog.v1
```

- 既存命名規則（`seed.<domain>.v1`）に準拠。
- 健康データのキー（`seed.daily.v1` / `seed.attendance.v1` 等）とは完全に分離し、
  既存キーの読み書きロジックには触れない。
- **`src/data/store.ts` の `deleteAllLocalData()` の keys 配列に必ず追加する**（リポジトリ規約）。

---

## 4. タスク分解（frontend-engineer 向け・最小差分）

### T1: 利用ログのデータ層を新設

- 新規: `src/data/usageLog.ts`、`src/data/usageLog.test.ts`
- 内容:
  - `USAGE_LOG_KEY = 'seed.usagelog.v1'` を export
  - `UsageEventType` / `UsageEvent` 型定義（§2.2 のフィールドのみ）
  - `appendUsageEvent(type, sessionId?)` — `nowISO` で at を付与して追記。2000 件超は先頭から破棄
  - `listUsageEvents(): UsageEvent[]` — 不正データ（配列でない・type 不明）は読み捨てて空/有効分のみ返す
  - `clearUsageLog()` — キーを removeItem（try/catch）
  - 記録セッション補助: `beginRecordSession(): sessionId`（record_open を記録して ID を返す）、
    `endRecordSession(sessionId, 'save' | 'abandon')`（同一セッションへの二重 end は no-op）
- 依存: なし
- 副作用: なし（このタスク単体では UI から呼ばれない）

### T2: 全削除導線に利用ログキーを追加

- 変更: `src/data/store.ts` — `deleteAllLocalData()` の keys 配列に `USAGE_LOG_KEY`（usageLog.ts から import）を追加
- 依存: T1

### T3: app_open の計測

- 変更: `src/App.tsx`
- 内容:
  - 起動時（既存の「起動時に1度だけ」useEffect と同列の初回 effect）に `app_open` を 1 件記録
  - 既存の `visibilitychange` リスナー（dateKey 再評価用）の `visible` 復帰時に `app_open` を記録。
    ただし直前の `app_open` から 30 秒未満なら記録しない（決定事項 D-3）
- 依存: T1

### T4: record_open / record_save / record_abandon / history_open の計測

- 変更: `src/App.tsx`（route 遷移の監視）、`src/screens/app/MainRouter.tsx`（onSubmit 内）
- 内容:
  - route が `'mood'` に **遷移した時**: `beginRecordSession()` を呼び sessionId を保持
    （mood 画面内の再レンダーでは多重記録しない）
  - MainRouter の onSubmit 内、`upsertDailyRecord(daily)` の直後: `endRecordSession(sessionId, 'save')`
  - route が `'mood'` から save を経ずに離れた時（onCancel → home、その他の遷移すべて）:
    `endRecordSession(sessionId, 'abandon')`
  - route が `'log'` に遷移した時: `history_open` を記録
  - 計測の引数に mood / selections / note 等の **記録内容を一切渡さない**こと
- 依存: T1
- 備考: 遷移検知は App.tsx での route の前回値比較（useEffect / setRoute ラップのどちらでも可。最小差分を優先）

### T5: 集計と CSV 生成

- 新規: `src/data/usageLogStats.ts`、`src/data/usageLogStats.test.ts`
- 内容:
  - `summarizeUsage(events, now)` — 直近 14 日（now 含む 14 日間）の
    「記録回数（record_save 数）/ 起動回数（app_open 数）/ 閲覧回数（history_open 数）/
    平均記録時間（秒）/ 未完了数（abandon + 対応 save の無い open）」を返す純関数
  - 平均記録時間は open→save ペアの差分秒の平均。30 分（1800 秒）超の外れ値は平均から除外（決定事項 D-5）
  - `buildUsageLogCsv(events)` — ヘッダー `type,at,session_id` の CSV 文字列を返す。列はこの 3 つのみ
- 依存: T1
- 参考実装: `src/data/attendanceExport.ts`（CSV）、`src/data/historyCopy.ts`（文言集約の流儀）

### T6: 設定画面に「利用ログ」カードを追加

- 新規: `src/screens/profile/UsageLogCard.tsx`
- 変更: `src/screens/ProfileScreen.tsx`（JsonExportCard と DataDeleteCard の間に配置）
- 内容:
  - 説明文: 「アプリの使われ方（開いた・記録した等の回数と時刻）だけを端末内に記録しています。
    記録の内容（気分・睡眠・メモなど）は含まれません。自動では送信されません。」の趣旨を表示
  - §4-T5 の集計（直近 14 日）を表示
  - イベント一覧（新しい順。件数が多い場合は折りたたみ or 直近 N 件表示で可）
  - 「コピー」ボタン: タップ時のみ `buildUsageLogCsv` の結果を `navigator.clipboard.writeText` でコピー。
    成功/失敗をインラインで表示。clipboard API が使えない環境では失敗メッセージを出す（自動フォールバック送信などはしない）
  - 「ログを全削除」ボタン: JsonExportCard / DataDeleteCard と同様の二段階確認 → `clearUsageLog()` → 表示を空状態に更新
  - ログ 0 件時は「まだ利用ログがありません。」等の中立的な空状態表示
- 依存: T1, T5
- 注意: このカードの表示・コピー・削除操作自体は利用ログに記録しない（決定事項 D-7）

### タスク依存関係

```
T1 ─┬─ T2
    ├─ T3
    ├─ T4
    └─ T5 ── T6
```

T2〜T4 は互いに独立。T6 のみ T5 を待つ。

---

## 5. 受け入れ条件（qa-tester 向け）

### AC-1 イベント記録の基本

- Given アプリを起動した When App がマウントされる Then `seed.usagelog.v1` に `app_open` が 1 件追加される
- Given アプリ表示中 When タブを非表示→表示に戻す（30 秒以上経過後） Then `app_open` が 1 件追加される
- Given アプリ表示中 When 30 秒以内に visible 復帰が連続する Then `app_open` は重複追加されない
- Given ホーム画面 When 「きろくする」で記録画面を開く Then `record_open` が sessionId 付きで 1 件追加される
- Given 記録画面で入力中 When 保存（submit）する Then 同じ sessionId の `record_save` が 1 件追加され、健康データは従来どおり `seed.daily.v1` に保存される
- Given 記録画面 When 保存せずキャンセル等で離れる Then 同じ sessionId の `record_abandon` が 1 件追加され、`record_save` は追加されない
- Given どの画面でも When 過去記録（きろくタブ / HistoryScreen）を開く Then `history_open` が 1 件追加される

### AC-2 ログ内容の制約（最重要）

- Given 気分・睡眠・服薬・自由記述（機微な文字列を含む）を入力して保存した
  When `seed.usagelog.v1` の生 JSON を目視確認する
  Then 含まれるフィールドは `type` / `at` / `sessionId` のみで、入力した文字列・数値・記録対象日・ニックネームが一切含まれない
- Given 任意の操作列 When CSV コピー結果を確認する Then 列は `type,at,session_id` のみ

### AC-3 集計表示

- Given 直近 14 日に record_save 3 件・app_open 5 件・history_open 2 件がある When 利用ログカードを開く Then 記録回数 3 / 起動回数 5 / 閲覧回数 2 が表示される
- Given open→save が 60 秒・120 秒のペアが 2 組ある When カードを開く Then 平均記録時間が 90 秒と表示される
- Given open→save の差が 1800 秒超のペアがある When 集計する Then そのペアは平均から除外される
- Given abandon、または対応する save の無い open がある When 集計する Then 「未完了」として件数表示され、平均には影響しない
- Given 15 日以上前のイベントのみがある When カードを開く Then 直近 14 日の各集計は 0 と表示される（エラーにならない）

### AC-4 コピー・削除

- Given ログが 1 件以上ある When 「コピー」をタップする Then CSV 形式テキストがクリップボードに入り、成功表示が出る。タップ以外の契機（画面表示・集計など）でクリップボードや外部への書き出しは一切発生しない
- Given clipboard API が拒否/未対応の環境 When 「コピー」をタップする Then 失敗メッセージが表示され、アプリはクラッシュしない
- Given ログがある When 「ログを全削除」→確認 を実行する Then `seed.usagelog.v1` が消え、一覧と集計が空状態になる。健康データ（`seed.daily.v1` 等）は影響を受けない
- Given アプリに記録データとログがある When 「すべてのデータを削除」（DataDeleteCard）を実行する Then `seed.usagelog.v1` も削除される

### AC-5 エッジケース・非破壊性

- Given `seed.usagelog.v1` が存在しない（初回起動） When ホーム・記録・履歴・設定の各画面を開く Then すべて従来どおり動作する
- Given `seed.usagelog.v1` に壊れた JSON / 配列でない値が入っている When アプリを起動しカードを開く Then クラッシュせず、空または有効分のみ表示される
- Given private mode（localStorage 書き込み不可） When 各イベント発火操作を行う Then 例外が表面化せず、記録機能・閲覧機能は従来どおり使える
- Given 記録画面を開いたままブラウザを閉じた（save も abandon も記録されない） When 次回起動してカードを開く Then 孤立した `record_open` は「未完了」として扱われ、集計が破綻しない
- Given イベントが 2000 件を超える When さらにイベントが追加される Then 古いものから破棄され、quota エラーにならない
- Given lint / build / 既存テスト When 一式実行する Then すべて成功する（usageLog.test.ts / usageLogStats.test.ts を含む）

---

## 6. privacy-reviewer 向け確認観点リスト（レビュー必須）

本機能は「データの保存先に関わる変更（新規 localStorage キー）」「削除導線」「コピー（書き出し）導線」に該当するため、CLAUDE.md の規定により **privacy-reviewer のレビューを省略できない**。

1. **健康データ非混入（構造的禁止）**: `UsageEvent` の型が `type` / `at` / `sessionId` 以外を持たないこと。`appendUsageEvent` / `beginRecordSession` / `endRecordSession` の呼び出し箇所すべてで、mood・selections・note・targetDate・nickname 等が引数に渡っていないこと
2. **別キー分離**: `seed.usagelog.v1` のみ使用し、既存キー（特に `seed.daily.v1`）の読み書きロジックに変更がないこと
3. **自動送信なし**: 本機能のコードパスに fetch / sendBeacon / `src/api/sheets.ts` 呼び出しが存在しないこと。クリップボード書き込みがボタンの onClick ハンドラ内のみであること
4. **コピーは明示操作 + 事前確認可能**: コピー前にユーザーが一覧で内容を確認できる UI になっていること
5. **全削除導線の維持**: `deleteAllLocalData()` の keys 配列に `USAGE_LOG_KEY` が追加されていること。カード単体の「ログを全削除」も機能すること
6. **sessionId の性質**: 端末・個人を識別しない一時 ID であり、セッション間で再利用・永続化されないこと
7. **行動プロファイリングの抑制**: イベントが確定した 5 種（app_open / record_open / record_save / record_abandon / history_open）以外に増えていないこと
8. **説明文**: カードの説明文が「端末内のみ・内容は含まない・自動送信しない」を利用者に正しく伝えていること

---

## 7. 決定事項（曖昧点へのデフォルト提案と理由）

| ID | 決定 | 理由 |
| --- | --- | --- |
| D-1 | ログ閲覧 UI は新ルート（画面）ではなく ProfileScreen 内の新カード `UsageLogCard` とする | Route 型・MainRouter への変更が不要で最小差分。既存のエクスポート/削除カードと同じ場所に並び、発見性も十分 |
| D-2 | 「途中離脱」= ① save せずに mood route から離れた時の `record_abandon` 明示記録、② save/abandon の無い孤立 `record_open` の集計時「未完了」扱い、の二段構え | タブを閉じる・クラッシュ等では離脱イベント自体を書けないため、書ける時は書き、書けない時は読み取り側で補う |
| D-3 | visible 復帰の `app_open` は 30 秒デバウンス | 通知シェードの開閉等による瞬間的な visibility 変化で「起動頻度」が水増しされるのを防ぐ |
| D-4 | ログ上限 2000 件・FIFO | 5人×数週間のテストには十分な容量で、quota 圧迫と無限増殖を防ぐ |
| D-5 | 平均記録時間は open→save ペアの差分秒。1800 秒（30 分）超は平均から除外 | 画面を開いたまま放置したケースが平均を破壊するのを防ぐ。除外分は件数としては保持 |
| D-6 | 新しい同意画面は追加しない。カード内の説明文で「端末内のみ・内容は含まない・自動送信なし」を明示 | 外部送信が一切なく保存先も端末内のため、同意フローの追加は過剰。透明性は説明文で担保 |
| D-7 | 利用ログカード自身の閲覧・コピー・削除操作はログに記録しない | 「ログを見る行為」の記録は目的（記録・起動・閲覧頻度の把握）に不要で、自己言及的に増殖する |
| D-8 | CSV のタイムスタンプは ISO 8601（UTC）をそのまま出力 | 既存 `nowISO()` と一貫。テスト分析側で変換すればよく、変換ロジックを持たない方が安全 |
