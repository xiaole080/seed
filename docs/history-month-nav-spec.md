# りれき（きろく）画面 月単位ナビゲーション仕様

- 作成: product-manager (2026-06-12)
- 対象: りれき画面（`src/screens/HistoryScreen.tsx` ほか）の表示期間モデル
- 実装担当: frontend-engineer / 検証担当: qa-tester
- 制約: **表示・集計ロジックのみの変更。localStorage のデータ構造・保存先・記録項目・外部送信は一切変えない。**

---

## 0. 現状の要約（調査結果）

| 関心事 | 現状 |
|---|---|
| 期間モデル | `src/data/historyStats.ts` の `HistoryRange = '7d' \| '14d' \| 'month'`。`rangeFor(mode, today)` が `DateRange {start, end}` を返す。`month` は「当月1日〜今日」で過去月は表現不可 |
| 期間切替UI | `HistoryScreen.tsx` 内のセグメントタブ（`RANGES = ['7d','14d','month']`、ラベルは `historyCopy.ts` の `RANGE_LABEL`） |
| 状態管理 | `src/screens/history/useHistoryScreen.ts` が `useState<HistoryRange>` を持ち、`filterDailyByRange` / `filterAttendanceByRange` / `rangeOverview` で集計 |
| 月の前後移動 | `src/data/monthNav.ts` に `YearMonth {year, monthIndex0}` と `shiftMonth(year, monthIndex0, delta)`（年跨ぎ正規化済み）が既存。`AttendanceExportCard.tsx` で実績あり |
| データ取得 | 日別: `listDailyRecords()`（全件・日付昇順）。通所: `listAttendanceByMonth(yyyyMM)`（月単位）。**通所の全件取得関数は存在しない**（最古月判定に必要 → T2） |
| 文言 | `src/data/historyCopy.ts` に集約（責めないトーン・禁止語ルールあり）。サマリー文は `historyView.ts` の `buildSummaryText(overview, range)` |
| 利用箇所 | `HistoryScreen` の呼び出しは `MainRouter.tsx`（`initialRange` 未指定 = '7d'）と `screens.smoke.test.tsx` のみ |

---

## 1. スコープ確定: 月表示に一本化する

**決定: 「今週(7日)」「14日」のモードを廃止し、暦月単位の表示に一本化する。**

理由:

1. 依頼の指示「迷ったらシンプルな方（一本化）」に合致する。
2. 状態が `YearMonth` ひとつになり、セグメントタブ＋月ナビの二重UIによる混乱（「14日タブ選択中に月を移動したら？」等）を構造的に排除できる。
3. 既存3モードの利用箇所は `HistoryScreen` 系のみで、他画面への影響がない。
4. 7日/14日で見たい「直近の様子」は、当月表示の時系列（DateTimeline）でほぼ代替できる。

付随する決定:

- `HistoryRange` / `rangeFor` / `RANGE_LABEL` / `RANGE_TERM` は最終タスク（T8）で削除する。死コードとして残さない。
- `HistoryScreen` の `initialRange` prop は削除する（利用箇所は既定値依存のみ）。

---

## 2. 表示・ナビゲーション仕様

### 2.1 表示単位

- **暦月**: その月の1日〜末日（両端含む）。月末日数の違い（28/29/30/31日）は `Date` 正規化で吸収する。
- 集計（記録した日・平均気分・通所日数・各傾向）は「その暦月の全日」を母数範囲とする。
- **今月のみ**、日付つき時系列（DateTimeline）に未来日を表示しない: 表示する日付列は `datesInRange(range)` を「今日まで」でクランプする。集計値は未来日に記録が存在しないため影響なし。

### 2.2 ヘッダー表記

- 現在表示中の月を「**2026年6月**」形式で月ナビゲーションヘッダー中央に表示する。
- 既存ヘッダー下の説明文「{期間}の あなたの 様子です」は「**この月の あなたの 様子です**」に置き換える（`RANGE_TERM` 廃止のため）。

### 2.3 前後移動UI

**矢印ボタン（主操作・必須）**

- ヘッダー中央の「2026年6月」の左右に「←」「→」ボタンを配置。
- aria-label: 「前の月へ」「次の月へ」。
- **タップ領域は 44×44px 以上**（視覚サイズより当たり判定を広く取ってよい）。
- 移動不可の境界（§2.4）では `disabled` にし、視覚的にも薄く表示する。非表示にはしない（レイアウトのガタつき防止と「端まで来た」ことの明示のため）。

**横スワイプ（副操作・補助）**

- りれき画面のスクロールコンテンツ領域で、左スワイプ=次の月、右スワイプ=前の月。
- 誤動作対策（縦スクロールとの衝突回避）:
  - 発火条件: 水平移動量 `|dx| >= 48px` **かつ** `|dx| > |dy| * 2`（水平優位）。
  - touchstart〜touchend の単一ジェスチャで判定する。マルチタッチは無視。
  - 境界（今月 / 最古月）を越える向きのスワイプは何もしない（エラー表示も不要）。
- スワイプは矢印ボタンの代替ではなく追加手段。**T6 を落としても T5（矢印）だけで受け入れ可能**な構成にする。

### 2.4 移動の境界

- **上限 = 今月**（`todayISO()` の属する月）。今月表示中は「→」を disabled、左スワイプ無効。未来の月へは移動できない。
- **下限 = データ最古月**。日別記録（`seed.daily.v1`）と通所記録の**両方**を見た最小の `date` が属する月。最古月表示中は「←」を disabled、右スワイプ無効。
  - 通所記録も対象に含める理由: 通所だけ記録していた月が見られなくなるのを防ぐため。
- **データが1件も無い場合**: 最古月 = 今月とみなす。今月のみ表示し、左右とも disabled。サマリーは既存の「まだ記録がありません。…」を表示。
- 初期表示は常に**今月**。

### 2.5 空月（記録0件の月）の表示

- 過去月で日別記録が0件のとき、サマリー一言を「**この月の記録はありません。**」にする（`historyCopy.ts` に追加。責めないトーン準拠、「記録できていません」は禁止語のため使わない）。
- 今月で0件のときは既存文言「まだ記録がありません。気が向いたときに記録してみてください。」を維持する。
- 空月でも各セクション（気分・影響要因・通所・項目カード・時系列）は既存の空状態文言（`EMPTY_COPY`）で表示し、**前後移動は引き続き可能**（境界条件のみで disabled を決め、空かどうかでナビを止めない）。
- サマリーカード3つ（記録した日 / 平均 / 通所した日）は `0` / `—` / `0` を表示（既存の null 安全挙動を踏襲）。

### 2.6 サマリー文言（`buildSummaryText` の改修方針）

- 今月: 既存の `SUMMARY_COPY.monthlyReview(days, avg)` を維持。
- 過去月（記録あり）: 「**2026年5月は X日 記録できました。記録した日の気分の平均は Y でした。**」（monthlyReview を月名付きで再利用する形。avg null 時の分岐も既存踏襲）。
- 記録0件: §2.5 のとおり。
- シグネチャは `buildSummaryText(overview, ym: YearMonth, todayYm: YearMonth)` 程度に変更（`HistoryRange` 依存を外す）。

### 2.7 MoodTrend 等のラベル

- `MoodTrend` の `rangeLabel` prop には `formatYearMonth(ym)`（例「2026年6月」）を渡す。

---

## 3. データ取得方針（既存純関数の再利用と新規定義）

### 再利用するもの

- `shiftMonth(year, monthIndex0, delta)`（`src/data/monthNav.ts`）— 前後移動の中核。年跨ぎ正規化済み・テスト済み。
- `DateRange` / `inRange` / `datesInRange` / `monthsInRange` / `filterDailyByRange` / `filterAttendanceByRange` / `rangeOverview` ほか集計関数（`historyStats.ts`）— **変更不要**。月の `DateRange` を渡すだけで動く。
- `useHistoryScreen` の「通所は `monthsInRange(dateRange)` で月キーを列挙して読む」構造 — 単月なら1要素になるだけで、そのまま流用可。

### 新規に追加する純関数（`src/data/monthNav.ts` に集約）

```
monthRange(ym: YearMonth): DateRange
  // その暦月の1日〜末日。例: {year:2026, monthIndex0:5} → {start:'2026-06-01', end:'2026-06-30'}
  // 末日は new Date(year, monthIndex0 + 1, 0) で算出（うるう年対応）

formatYearMonth(ym: YearMonth): string
  // 「2026年6月」（月はゼロ埋めしない）

ymFromISO(isoDate: string): YearMonth
  // 'YYYY-MM-DD' → {year, monthIndex0}

compareYearMonth(a: YearMonth, b: YearMonth): number
  // a < b なら負、等しければ 0、a > b なら正。境界判定に使用

oldestRecordMonth(dates: string[]): YearMonth | null
  // ISO日付配列（daily + attendance の全 date を結合して渡す）の最小値の属する月。
  // 空配列なら null（呼び出し側で「今月」にフォールバック）。
  // StoredDailyRecord 型に依存させず string[] を受けることで monthNav.ts を軽量に保つ
```

### store.ts への読み取り専用関数の追加

```
listAllAttendance(): AttendanceMonthlyRecord[]
  // 既存 readAttendance() の全件を日付昇順で返す。読み取りのみ。
  // 保存形式・キー・書き込み経路は一切変更しない
```

- 最古月判定のために必要（現状は `listAttendanceByMonth(yyyyMM)` しかなく、全件を見る公開手段がない）。
- 注意: これは「新しい保存先の追加」ではなく既存ストアの read-only アクセサ追加。

---

## 4. タスク分解（frontend-engineer 向け・最小差分）

依存関係: T1, T2, T3 は並行可 → T4（T1〜T3 に依存）→ T5, T6（T4 に依存・互いに独立）→ T7（T5 必須、T6 は任意）→ T8（T7 後）。

### T1: 月範囲・最古月の純関数を追加

- ファイル: `src/data/monthNav.ts`, `src/data/monthNav.test.ts`
- 内容: §3 の `monthRange` / `formatYearMonth` / `ymFromISO` / `compareYearMonth` / `oldestRecordMonth` を追加。既存 `shiftMonth` は変更しない。
- 受け入れ条件:
  - Given 2026年6月, When `monthRange`, Then `{start:'2026-06-01', end:'2026-06-30'}`。
  - Given 2024年2月（うるう年）, When `monthRange`, Then end が `'2024-02-29'`。2026年2月なら `'2026-02-28'`。
  - Given `['2026-03-05','2025-11-20','2026-06-01']`, When `oldestRecordMonth`, Then `{year:2025, monthIndex0:10}`。
  - Given 空配列, When `oldestRecordMonth`, Then `null`。
  - Given `{2026, 5}` と `{2025, 11}`, When `compareYearMonth`, Then 正の値（前者が後）。

### T2: 通所記録の全件読み取り関数を追加

- ファイル: `src/data/store.ts`（および store のテスト）
- 内容: `listAllAttendance(): AttendanceMonthlyRecord[]` を追加（読み取り専用・日付昇順）。書き込み経路・キー・スキーマは変更しない。
- 受け入れ条件:
  - Given 複数月にまたがる通所記録, When `listAllAttendance()`, Then 全件が日付昇順で返る。
  - Given 通所記録なし, When 呼び出し, Then 空配列（例外を投げない）。

### T3: 文言とサマリー文の月対応

- ファイル: `src/data/historyCopy.ts`, `src/data/historyView.ts`（および隣接テスト）
- 内容:
  - `historyCopy.ts` に追加: 空月文言 `'この月の記録はありません。'`、ヘッダー説明文 `'この月の あなたの 様子です'`、矢印の aria-label 文言（前の月へ / 次の月へ）。
  - `buildSummaryText` を §2.6 のとおり `YearMonth` ベースに変更。
  - この段階では `RANGE_LABEL` / `RANGE_TERM` は削除しない（T8 で実施。差分を小さく保つ）。
- 受け入れ条件:
  - Given 今月・記録3日・平均3.5, When `buildSummaryText`, Then 「今月は 3日 記録できました。…平均は 3.5 でした。」。
  - Given 過去月（2026年5月）・記録3日, When 同, Then 文中に「2026年5月」を含み「今月」を含まない。
  - Given 過去月・記録0日, When 同, Then 「この月の記録はありません。」。
  - Given 今月・記録0日, When 同, Then 既存の「まだ記録がありません。…」。
  - すべての新規文言が禁止語（「記録できていません」等、historyCopy.ts 冒頭コメント参照）を含まない。

### T4: useHistoryScreen を YearMonth ベースに変更

- ファイル: `src/screens/history/useHistoryScreen.ts`（および隣接テスト）
- 内容:
  - 状態を `useState<YearMonth>`（初期値 = 今日の属する月）に置換。`HistoryRange` 依存を外す。
  - `dateRange = monthRange(ym)`。daily / attendance のフィルタ・集計は既存関数をそのまま使用。
  - 最古月: `oldestRecordMonth([...allDaily.map(d=>d.date), ...listAllAttendance().map(a=>a.date)]) ?? 今月`。マウント時に1回算出。
  - 公開API: `ym`, `headerLabel`（formatYearMonth）, `canGoPrev`, `canGoNext`, `goPrev()`, `goNext()`, `dateRange`, `timelineDates`（今月のみ今日でクランプ済み）, `daily`, `attendance`, `overview`, `summaryText`。
  - `goPrev`/`goNext` は境界外への移動要求を無視する（ガード込み）。
- 受け入れ条件:
  - Given 初期表示, Then `ym` は今月で `canGoNext === false`。
  - Given 最古データが 2026-03, When 3月まで戻る, Then `canGoPrev === false` かつ `goPrev()` を呼んでも 3月のまま。
  - Given 2026年1月表示中, When `goPrev()`, Then 2025年12月になる（年跨ぎ）。
  - Given データ0件, Then 今月表示・`canGoPrev === false`・`canGoNext === false`。
  - Given 今月（例: 今日が6月12日）, Then `timelineDates` の末尾は今日で、6月13日以降を含まない。Given 過去月, Then 1日〜末日の全日を含む。

### T5: MonthNavHeader コンポーネント（矢印ボタン）

- ファイル: `src/screens/history/MonthNavHeader.tsx`（新規）
- 内容: 「← / 2026年6月 / →」のヘッダー。props は `label`, `canGoPrev`, `canGoNext`, `onPrev`, `onNext`。タップ領域 44px 以上、aria-label 付与、disabled 時は薄く表示。既存テーマ（PALETTE / ROUNDED_FONT / CARD_SHADOW）に合わせる。`AttendanceExportCard.tsx` の月送りUIをトーンの参考にしてよい。
- 受け入れ条件:
  - Given `canGoNext=false`, Then 「→」が disabled で、クリックしても `onNext` が呼ばれない。`canGoPrev` も同様。
  - Given 表示, Then 「2026年6月」形式のラベルと、aria-label「前の月へ」「次の月へ」のボタンが存在する。
  - ボタンの当たり判定が 44×44px 以上である。

### T6: 横スワイプでの月移動（補助操作・独立タスク）

- ファイル: `src/screens/history/useSwipeMonth.ts`（新規・touch ハンドラを返すフック）、`HistoryScreen.tsx` のコンテンツ div への適用
- 内容: §2.3 の判定条件（`|dx| >= 48` かつ `|dx| > |dy| * 2`、単一ジェスチャ、境界越え無視）。判定ロジックは UI 非依存の純関数（例: `detectSwipe(dx, dy): 'prev' | 'next' | null`）に切り出してテストする。
- 受け入れ条件:
  - Given dx=-60, dy=10, Then 'next'（次の月）。Given dx=+60, dy=10, Then 'prev'。
  - Given dx=-60, dy=40（垂直成分が大きい）, Then null（縦スクロール優先）。
  - Given dx=-30（閾値未満）, Then null。
  - Given 今月表示中の左スワイプ, Then 月が変わらずエラーも出ない。
- 備考: このタスクが遅延・難航しても T5（矢印）のみでリリース可能。

### T7: HistoryScreen の組み替え

- ファイル: `src/screens/HistoryScreen.tsx`, `src/screens/screens.smoke.test.tsx`, `src/screens/app/MainRouter.tsx`（props 変更が及ぶ場合のみ）
- 内容:
  - 既存セグメントタブ（`RANGES` の map 部分）を削除し、`MonthNavHeader` を配置。
  - 説明文を「この月の あなたの 様子です」に変更。
  - `DateTimeline` には `timelineDates` を渡す。`MoodTrend` の `rangeLabel` に `headerLabel` を渡す。
  - `initialRange` prop を削除（`MainRouter.tsx` は未指定のため変更不要のはずだが確認する）。
  - smoke テストが通ることを確認・必要なら調整。
- 受け入れ条件:
  - Given りれき画面を開く, Then ヘッダーに今月（例「2026年6月」）が表示され、旧「7日/14日/今月」タブが存在しない。
  - Given 「←」タップ, Then 前月のラベル・集計・時系列に切り替わる。
  - Given 記録0件の過去月, Then 「この月の記録はありません。」と各セクションの空状態が表示され、さらに前後へ移動できる。

### T8: 旧期間モデルのクリーンアップ

- ファイル: `src/data/historyStats.ts`, `src/data/historyCopy.ts`, `src/data/historyView.ts` と各隣接テスト
- 内容: `HistoryRange` 型、`rangeFor`、`RANGE_LABEL`、`RANGE_TERM` と、それらのみを対象とするテストを削除。`shiftISO` / `DateRange` / 集計関数群は**残す**（引き続き使用）。削除後に lint / build / 全テストが通ること。
- 受け入れ条件:
  - Given リポジトリ全体, When `HistoryRange|rangeFor|RANGE_LABEL|RANGE_TERM` を grep, Then 一致が0件。
  - lint / build / test がすべて成功する。

---

## 5. qa-tester 向け 受け入れ条件（全体・エッジケース）

1. **初期表示**: Given アプリのりれき画面を開く, When 何も操作しない, Then 今月（例「2026年6月」）の集計が表示され「→」は disabled。
2. **前月移動（矢印）**: Given 今月表示, When 「←」をタップ, Then 前月のヘッダー・記録した日数・気分グラフ・時系列に切り替わる。
3. **空月**: Given 記録が1件もない過去月へ移動, Then 「この月の記録はありません。」が表示され、サマリーカードは 0 / — / 0、かつ「←」「→」で前後の月へ移動できる。
4. **下限境界**: Given データ最古月（daily と attendance の早い方）を表示中, Then 「←」が disabled で、右スワイプしても月が変わらない。
5. **上限境界**: Given 今月表示中, Then 「→」が disabled で、左スワイプしても月が変わらない。未来の月は表示できない。
6. **年跨ぎ**: Given 2026年1月表示中, When 「←」, Then 「2025年12月」になる。逆方向（12月→翌1月）も同様。
7. **データ皆無**: Given localStorage に日別・通所記録が一切ない状態, Then 今月のみ表示・左右とも disabled・「まだ記録がありません。…」表示で、クラッシュしない。
8. **月末日数**: Given 31日の月・30日の月・2月（平年/うるう年）, Then 時系列の日数と「記録した日」の母数範囲がそれぞれの末日まで正しい。
9. **今月の未来日**: Given 今日が月の途中, Then 時系列に明日以降の日付行が現れない。Given 過去月, Then 1日〜末日の全行が現れる。
10. **スワイプと矢印の併用**: Given 左スワイプで前々月まで戻った状態, When 「→」を2回タップ, Then 今月に戻り「→」が disabled になる（両操作で状態が矛盾しない）。
11. **スワイプ誤動作**: Given 縦スクロール操作（垂直成分が支配的）, Then 月が切り替わらない。
12. **通所のみの月**: Given 日別記録は無いが通所記録だけある過去月, Then その月まで遡れて通所リズムが表示される（日別側は空状態文言）。
13. **回帰**: lint / build / 既存テストスイート（vitest）がすべて成功する。データの保存・削除導線（DataDeleteCard 等）に影響がない。

---

## 6. MVP外と判断したもの（今回やらない）

| 項目 | 判断理由 |
|---|---|
| 任意期間のカスタム選択（開始日〜終了日指定） | 月単位で目的（過去の振り返り）を満たす。UI複雑化に見合わない |
| 年単位ジャンプ・年月ピッカー | データ蓄積が浅い現段階では矢印移動で十分。必要になったら再検討 |
| 月カレンダーグリッド表示 | 表示形式の新規追加であり今回の「期間ナビ改善」の範囲外 |
| グラフ種類の追加・月間比較（前月比など） | 「分析」寄りの機能でトーン方針（振り返り>分析）とも要調整。範囲外 |
| 7日/14日モードの温存（ハイブリッドUI） | §1 のとおり一本化を選択。二重UIの混乱回避を優先 |
| 月表示設定の永続化（前回見ていた月の記憶） | 新しい localStorage キーが必要になり、削除導線(deleteAllLocalData)への追加も発生する。常に今月起点で十分 |

---

## 7. privacy レビュー要否の判定

**判定: 今回は privacy-reviewer のレビュー必須ケースに該当しない（任意）。**

根拠（CLAUDE.md の必須ケースとの照合）:

- 外部送信（fetch / Sheets / CSV）: 変更なし。
- データの保存先: 変更なし。新規 localStorage キーも追加しない（§6 で永続化を見送った理由のひとつ）。T2 の `listAllAttendance()` は既存ストアへの**読み取り専用**アクセサ追加であり、保存先・書き込み経路の変更ではない。
- 記録項目の追加・変更: なし。
- Google Sheets / CSV 出力の項目・挙動: 変更なし（`AttendanceExportCard` は `shiftMonth` を共有するが、`shiftMonth` 自体は無変更）。
- 同意取得・削除導線: 変更なし。

注意点（frontend-engineer への申し送り）:

- 過去月の表示により自由記述（note / otherText）が画面に出る範囲は広がるが、これは**画面内表示のみ**で、既存の折りたたみ挙動（`buildTimelineRowView` の hasNote / otherTexts 分離）を変えないこと。
- 万一実装中に `shiftMonth` や `monthRange` を CSV エクスポート側の挙動に影響する形で変更した場合は、その時点で privacy-reviewer 必須に切り替わる。

---

## 8. 決定事項一覧（曖昧点へのデフォルト判断）

| 論点 | 決定 | 理由 |
|---|---|---|
| 3モード温存 or 一本化 | 一本化 | 依頼の指示・UIの単純化 |
| 今月の表示終端 | 集計範囲は末日まで、時系列表示のみ今日でクランプ | 未来の空行を出さない。集計結果は同値 |
| 最古月の判定対象 | daily + attendance の両方 | 通所だけの月を取りこぼさない |
| データ皆無時 | 今月のみ・両矢印 disabled | クラッシュ回避と挙動の単純さ |
| 境界での矢印 | disabled 表示（非表示にしない） | レイアウト安定・「端」の明示 |
| 初期表示月 | 常に今月（永続化しない） | 新規 localStorage キーを増やさない |
| スワイプ閾値 | `\|dx\| >= 48px` かつ `\|dx\| > \|dy\| * 2` | 縦スクロール誤爆防止の一般的水準 |
| 新規純関数の置き場所 | `monthNav.ts` に集約 | YearMonth 系の責務を1ファイルに |
| 旧モデルの削除 | T8 として最後に実施 | 先行タスクの差分を最小に保つ |
