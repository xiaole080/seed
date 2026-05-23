# Seed 仕様書 修正・追加差分

対象: 最初に作成した `Seed — セルフケアアプリ 仕様書 プロトタイプ v1.0`  
目的: v1.0仕様書に対して、将来研究に向けたデータ蓄積方針・記録項目の再設計・通所時間データの扱いを追加する。  
最終更新: 2026年5月22日

---

## 1. 修正方針

### 1.1 現段階の位置づけ

Seed v1では、AI予測・診断・支援者共有は行わない。  
本アプリの第一目的は、利用者本人が日々のきもち・体調・生活リズムをやさしく記録し、自分の状態を振り返れるようにすることである。

一方で、将来的にセルフケア継続、生活リズム、通所状況、気分変動などを研究対象とする可能性があるため、初期段階から分析可能なデータ構造で記録を蓄積する。

## 2. 3.4「きもちを記録」の修正

### 2.1 旧構成

旧仕様では、以下の順で記録する設計だった。

1. 5段階の気分
2. 睡眠
3. 食事
4. 運動
5. 体調
6. 服薬
7. ひとこと

### 2.2 新構成

新仕様では、基本入力を軽くし、詳細記録を任意にする。

```text
1. 今のきもちは？
2. 今のきもちに一番影響していそうなことは？
3. もっと記録する？（任意）
4. 自由記述（任意）
```

### 2.3 気分

```text
今のきもちは？

😣 とてもつらい
😔 少ししんどい
😐 ふつう
🙂 まあまあ
😊 よい
```

### 2.4 一番影響していそうなこと

```text
今のきもちに一番影響していそうなことは？
```

選択肢：

- 睡眠
- 疲れ
- 体調
- 痛み
- 食事
- 天気・気圧
- 外出
- 家事
- 家族
- 友人
- 支援員・職場
- SNS
- 通所
- 仕事・勉強
- お金
- 将来の不安
- 理由がわからない
- 考えごと
- 自信がない
- その他:____

複数選択はOK。

### 2.5 自由記述

```

自由記述は、本人の振り返りには使う。  
ただし、個人情報・医療情報・他者情報が含まれやすいため、初期研究データからは原則として除外する。

---

## 3. 6「記録項目とデフォルト値」の修正

旧仕様の記録項目を、以下のように再設計する。

### 3.1 睡眠
第一段階そのまま、第二段階からの自由選択項目
```text
もっと記録する？

入眠時刻：任意
起床時刻：任意

夜中に起きた：
なし / 1回 / 2回以上

気になることがあれば選んでください：
寝つきにくい / 途中で起きた / 早く目が覚めた / 夢見が悪い / 昼夜逆転ぎみ / 日中眠い / その他:____
```

### 3.2 食事

```text
とれた食事の記録：
あさ・ひる・ばん
食事はどうでしたか？
食べられた / 少なめ / 食べすぎた / 食欲がない

その原因とおもわれるのは？：
？？/ ？？ /？？ / ？？ / その他:____　これデザインして
```
ここ完成版ではないのでどうするか考えて直してほしい
### 3.3 運動・活動

```text
今日の活動は？

外に出た / 散歩 / ストレッチ / 家事 / 通所した / ほぼ動けなかった/ その他の運動:____
```

### 3.4 体調

```text
体調で気になることは？

だるい / 頭痛 / 腹痛 / めまい / 吐き気 / 動悸 / 緊張 / 風邪っぽい / 特になし/ その他:____
```

### 3.5 服薬

```text
服薬はどうでしたか？

予定どおり / 一部忘れた / 全部忘れた / 今日は服薬なし
```

### 3.6 詳細記録の原則

- 詳細記録は任意
- 記録したくない項目は未入力のままでよい
- 未入力は失敗ではなく、単なる未記録として扱う
- 選択肢にない内容は自由記述で補足できる

---

## 4. 5「通所モデル」への追加

### 4.1 通所時間データの分離

通所時間・在宅支援時間・打刻時刻は、利用者本人だけでなく、支援員の月末確認にも使える可能性がある。

そのため、通所関連データは、気分・体調・服薬・自由記述などのセルフケア記録とは分離して扱う。

### 4.2 通所時間のみ自動バックアップ対象にする

通所時間データについては、任意で自動バックアップ対象にできる。

自動バックアップ対象：

- 日付
- 曜日
- 予定モード
- 予定時間帯
- 実績モード
- チェックイン時刻
- チェックアウト時刻
- 算出利用時間
- 未打刻フラグ
- 修正有無

自動バックアップ対象外：

- 気分
- 睡眠
- 食事
- 体調
- 服薬
- 自由記述
- 鳥のリアクション
- 一番影響していそうなこと

### 4.3 月末通所ファイル出力

月末に、通所関連情報だけを単独ファイルとして出力できるようにする。

出力形式候補：

- CSV


ファイル名例：

```text
Seed_attendance_2026-05.csv
```

出力データ例：

| date | weekday | planned_mode | planned_band | actual_mode | check_in | check_out | duration_minutes | missing_clock | edited |
|---|---|---|---|---|---|---|---:|---|---|
| 2026-05-01 | Fri | office | full | office | 10:02 | 15:31 | 329 | false | false |

共有方針：

- ファイル出力は利用者本人の操作で行う
- 支援員への送付はアプリ外で行う
- 自動送信は初期MVPでは行わない
- 出力前に「気分・体調・服薬・自由記述は含まれません」と明示する

---

## 5. 9「データモデル」への追加・修正

### 5.1 DailyRecord

```ts
DailyRecord {
  localRecordId: string,
  date: string,
  mood: MoodEntry,
  sleep?: SleepDetail,
  meal?: MealDetail,
  exercise?: ExerciseDetail,
  condition?: ConditionDetail,
  medication?: MedicationDetail,
  attendance?: AttendanceRecord,
  weatherSnapshot?: WeatherSnapshot,
  note?: string,
  createdAt: string,
  updatedAt: string
}
```

### 5.2 MoodEntry

```ts
MoodEntry {
  moodScore: 1 | 2 | 3 | 4 | 5,
  primaryInfluence:
    | 'sleep'
    | 'fatigue'
    | 'physical_condition'
    | 'pain'
    | 'meal'
    | 'weather_pressure'
    | 'going_out'
    | 'housework'
    | 'family'
    | 'friends'
    | 'supporter_workplace'
    | 'sns'
    | 'attendance'
    | 'work_study'
    | 'money'
    | 'future_anxiety'
    | 'unknown'
    | 'rumination'
    | 'low_confidence'
    | 'other',
  note?: string
}
```

### 5.3 SleepDetail

```ts
SleepDetail {
  bedtime?: string,
  wakeTime?: string,
  nightAwakenings?: 'none' | 'once' | 'multiple',
  sleepIssues?: Array<
    | 'difficulty_falling_asleep'
    | 'woke_up_during_night'
    | 'early_morning_awake'
    | 'bad_dreams'
    | 'day_night_reversal'
    | 'daytime_sleepiness'
  >
}
```

### 5.4 SleepFeatures

```ts
SleepFeatures {
  bedtimeMinutes?: number,
  wakeTimeMinutes?: number,
  estimatedSleepDurationMinutes?: number,
  nightAwakenings?: string,
  hasDifficultyFallingAsleep: boolean,
  hasInterruptedSleep: boolean,
  hasEarlyAwakening: boolean,
  hasBadDreams: boolean,
  hasDayNightReversal: boolean,
  hasDaytimeSleepiness: boolean
}
```

### 5.5 MealDetail

```ts
MealDetail {
  mealStatus: 'normal' | 'less' | 'too_much' | 'low_appetite',
  mealsTaken: {
    breakfast?: boolean,
    lunch?: boolean,
    dinner?: boolean,
    snack?: boolean,
    hydration?: boolean
  }
}
```

### 5.6 ExerciseDetail

```ts
ExerciseDetail {
  activityFlags: Array<
    | 'went_out'
    | 'walk'
    | 'stretch'
    | 'housework'
    | 'attended_facility'
    | 'hardly_moved'
  >
}
```

### 5.7 ConditionDetail

```ts
ConditionDetail {
  conditionFlags: Array<
    | 'fatigue'
    | 'headache'
    | 'stomachache'
    | 'dizziness'
    | 'nausea'
    | 'palpitation'
    | 'tension'
    | 'cold_like'
    | 'none'
  >
}
```

### 5.8 MedicationDetail

```ts
MedicationDetail {
  medicationStatus:
    | 'as_planned'
    | 'partially_missed'
    | 'missed_all'
    | 'no_medication_today'
}
```

### 5.9 AttendanceMonthlyRecord

```ts
AttendanceMonthlyRecord {
  localAttendanceId: string,
  date: string,
  weekday: string,
  plannedMode: 'office' | 'home' | 'off',
  plannedBand?: 'full' | 'am' | 'pm',
  actualMode?: 'office' | 'home' | 'off',
  checkIn?: string,
  checkOut?: string,
  durationMinutes?: number,
  missingClock: boolean,
  edited: boolean,
  editedAt?: string,
  exportMonth: string
}
```

---

## 6. 新規追加章：将来研究に向けたデータ蓄積方針

以下を仕様書末尾に新規追加する。

---

## 13. 将来研究に向けたデータ蓄積方針

Seed v1では、AI予測・診断・支援者共有は行わない。  
本アプリの第一目的は、利用者本人が日々のきもち・体調・生活リズムをやさしく記録し、自分の状態を振り返れるようにすることである。

一方で、将来的にセルフケア継続、生活リズム、通所状況、気分変動などを研究対象とする可能性があるため、初期段階から分析可能なデータ構造で記録を蓄積する。

### 13.1 基本方針

- 利用者本人のセルフケアを第一目的とする
- 研究利用はアプリ利用目的とは明確に分離する
- 研究利用には、別途説明と同意を必要とする
- 初期MVPではAI予測・診断的コメントは行わない
- 自由記述は個人情報・医療情報を含みやすいため、原則として研究データから除外する
- 未入力や記録しない日も、将来分析では重要な情報として扱う
- 「記録しない自由」を常に保証する

### 13.2 データ蓄積場所の方針

#### Phase 1: ローカル保存

プロトタイプ段階では、記録データは端末内に保存する。

保存先：

- 設定・軽量データ: `localStorage`
- 日々の記録・履歴: `IndexedDB` 推奨

用途：

- 画面表示
- きろく画面のグラフ表示
- 鳥の成長・関係性表示
- 本人による振り返り

#### Phase 2: 通所時間のみ自動バックアップ

通所時間データは、支援現場の月末確認に使える可能性があるため、他のセンシティブなセルフケア記録とは分離して扱う。

- 通所時間データのみ自動バックアップ対象にできる
- 気分・体調・服薬・自由記述は自動バックアップ対象外
- 初期MVPでは外部サーバーへの自動送信は行わない
- 本人操作による月末ファイル出力を基本とする

#### Phase 3: 月末通所ファイル出力

月末に、通所関連情報だけを単独ファイルとして出力できるようにする。

出力形式：

- CSVを優先
- 必要に応じてXLSX / PDFを追加

共有は本人操作で行う。  
支援員への自動送信は初期MVPでは行わない。

#### Phase 4: 任意バックアップ

ユーザーが希望した場合のみ、全体バックアップ機能を検討する。

候補：

- JSON / CSV 出力
- Google Drive / iCloud 等への本人管理バックアップ

注意点：

- バックアップと研究参加を混同させない
- 通所バックアップとセルフケア記録バックアップを分ける
- 自動同期は慎重に扱う

#### Phase 5: 研究用エクスポート

研究同意を得たユーザーのみ、研究用に加工されたデータを出力・送信できるようにする。

特徴：

- 氏名・施設名・自由記述は含めない
- 実日付ではなく `dateIndex` を使用する
- 参加者IDは仮名化する
- 同意バージョンを記録する
- 研究撤回時の扱いを明示する

#### Phase 6: 将来的な連合学習・分散学習

十分な参加者数と倫理審査体制が整った後に検討する。

初期段階では、連合学習は実装しない。  
まずは、ローカル記録データを研究可能な形で整えることを優先する。

### 13.3 データ分類

Seedでは、データを以下の4層に分けて扱う。

1. アプリ利用データ
2. 通所管理補助データ
3. 研究候補データ
4. 研究用エクスポートデータ

### 13.4 研究候補データ

```ts
ResearchCandidateRecord {
  pseudonymousUserId?: string,
  recordDate: string,
  moodScore: 1 | 2 | 3 | 4 | 5,
  primaryInfluence: string,
  sleepFeatures?: SleepFeatures,
  mealFeatures?: MealFeatures,
  exerciseFlags?: string[],
  conditionFlags?: string[],
  medicationStatus?: string,
  attendanceMode?: string,
  attendanceBand?: string,
  checkInStatus?: string,
  weatherPressure?: number,
  pressureTrend?: string,
  appEngagement: AppEngagement,
  missingnessFlags: MissingnessFlags
}
```

### 13.5 研究用エクスポートデータ

```ts
ResearchExport {
  studyId: string,
  participantId: string,
  consentVersion: string,
  exportDate: string,
  dateIndex: number,
  features: object,
  labels?: object,
  metadata: object
}
```

### 13.6 同意状態

```ts
ConsentState {
  appTermsAccepted: boolean,
  attendanceBackupConsent: 'notAsked' | 'declined' | 'accepted',
  attendanceExportConsent: 'notAsked' | 'declined' | 'accepted',
  researchConsent: 'notAsked' | 'declined' | 'accepted',
  consentVersion: string,
  consentedAt?: string,
  withdrawnAt?: string
}
```

通所時間バックアップと研究同意は分けて管理する。

### 13.7 Missingness設計

未入力は単なる欠損ではなく、将来分析では重要な情報になり得る。

```ts
MissingnessFlags {
  noRecord: boolean,
  skippedMood: boolean,
  skippedPrimaryInfluence: boolean,
  skippedSleep: boolean,
  skippedMeal: boolean,
  skippedExercise: boolean,
  skippedCondition: boolean,
  skippedMedication: boolean,
  skippedAttendance: boolean,
  skippedNote: boolean
}
```

注意点：

- 未入力を悪い状態と決めつけない
- ユーザーには「記録しない自由」を明示する
- 分析時には、欠損そのものを特徴量として扱う可能性がある

### 13.8 研究利用から除外するデータ

初期研究では、以下を原則として除外する。

- 自由記述
- 氏名
- 具体的な施設名
- 位置情報
- 医師名
- 薬剤名
- 診断名
- 支援員名
- 家族・友人の実名
- 具体的な勤務先・学校名

### 13.9 将来の研究アウトカム候補

安全な順に、以下を研究アウトカム候補とする。

1. 記録継続率
2. セルフケア行動の変化
3. 気分スコアの変化
4. 睡眠リズムの安定性
5. 通所予定と実績の差分
6. 未記録日の増加傾向
7. 欠席・未打刻の増加傾向

欠席予測やメンタル不調予測は、管理・評価・診断に見えるリスクがあるため、初期研究では扱わない。

---

## 7. 12「未実装 / 今後の検討事項」への追加

以下を追加する。

- IndexedDBへの移行
- 通所時間CSV出力
- 月末XLSX / PDF出力
- 通所時間データの分離保存
- 通所時間のみの自動バックアップ
- 暗号化バックアップ
- 研究同意フロー
- 倫理審査後の研究用エクスポート
- 将来的な連合学習
- Missingnessを考慮した分析設計
- 自由記述の研究利用除外ルール
