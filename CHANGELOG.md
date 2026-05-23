# Changelog

このプロジェクトの変更履歴。形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準じる。
バージョンは [Semantic Versioning](https://semver.org/lang/ja/) に従う。

## [0.1.0] - 2026-05-23

### Added

#### Sprint 2026-05-23 前半（T1〜T13）

- 記録項目 ON/OFF を「じぶん」画面で切り替えると、気分記録画面・きろく画面に即時反映されるようにした（T5 / §8.5）。
- ホームに「今日の様子を記録する」「昨日の様子を記録する」の 2 系統の導線を追加（T6 / §7.2）。
- ホームから既に記録済みの日を選ぶと、`confirm()` ではなくインラインの確認ブロックで「修正しますか？」を確認するようにした（T6）。
- `StoredDailyRecord.date` を `YYYY-MM-DD` で持ち、対象日ベースで上書き保存するようにした（T7 / §5.1）。今日分を昨日と混同しない。
- 気分記録画面のタイトル・カテゴリラベルを対象日に応じて「今日／昨日」で出し分け（T8）。
- 影響要因「その他」を選んだときの自由入力欄を追加。100 文字上限・端末ローカル限定（T9 / §9.5）。
- 各カテゴリ（睡眠・食事・運動・体調・服薬）に「その他」選択肢を追加し、選んだら自由入力欄を出すようにした（T10 / §9.5）。
- 外部送信ホワイトリストを `src/api/sheets.ts` の `sanitizeMoodPayload` / `sanitizeTaskPayload` に実装。自由記述・`otherText` 系は構造的に送信されない（§13.8）。
- きろく画面を「日付つき時系列」表示に変更（T12 / §11）。
- OFF 項目の過去データは控えめ表示・編集不可で残す方針を確立（T12）。
- 未記録の日を「欠席」ではなく「記録なし」として表示分離（T12）。
- T13: 各種クリーンアップとプライバシー指摘の反映（H1/H2/M4/L1）。

#### Sprint 2026-05-23 後半（T16〜T26）

- `src/data/migrations.ts` を新設。`runMigrations()` を起動時に呼び、`seed.schema.version` を導入（T17 / Phase 2a）。
- `StoredDailyRecord.targetDateType`（`'today' | 'yesterday'`）を追加。記録時に保存され、既存データはマイグレーションで補完される（T19 / Phase 2c）。
- ログイン画面のニックネーム欄直下に「本名や、家族・支援員の名前は使わないでください」の補足を追加（T18 / Phase 2b）。`nickname` をそのまま testerId として流用する。
- 「じぶん」画面に「データを書き出す（JSON）」ボタンを追加。`seed.*` の全 localStorage キーを 1 ファイルにまとめて端末にダウンロードする。fetch は使わない（T20 / Phase 2d）。
- 同意画面に「入力は任意です」セクションを追加（T24 / Phase 4a）。
- 同意画面の自由記述まわりに「個人名・施設名・第三者を特定できる情報はなるべく書かないでください」を追加（T24）。
- 同意画面の「つらいときは」を補強：いのちの電話 0570-783-556 / よりそいホットライン 0120-279-338 を直接記載（T24）。
- 気分記録画面の自由記述欄に「書きたくないことは書かなくて大丈夫」「緊急のご相談には使わないでください」を追加（T25 / Phase 4b）。
- `docs/mobile-check/README.md` にモバイル UI 確認手順を整理（T16 / Phase 1）。
- 戻るボタン・月送りボタンなど単独配置のクリッカブル要素のタップ領域を 44 × 44 px 以上に揃えた（T16 / Phase 1）。
- `CHANGELOG.md` / `TESTING.md` / `README.md` の 5 人テスト向け章を整備（T21〜T23 / Phase 3）。
- GitHub Pages デプロイ対応：`vite.config.ts` に `base: '/seed/'`（本番のみ）、`.github/workflows/deploy.yml` を追加（T26 / Phase D）。

### Changed

- `deleteAllLocalData` の対象キーに `seed.schema.version` を追加。

### Storage keys

| キー                       | 用途                              | 備考                  |
| -------------------------- | --------------------------------- | --------------------- |
| `seed.schema.version`      | スキーマバージョン (新設 0.1.0)   | 起動時に migrations が読み書き |
| `seed.daily.v1`            | 日別 DailyRecord                  | `targetDateType` を追加 |
| `seed.attendance.v1`       | 通所打刻                          | 変更なし              |
| `seed.app.state.v1`        | アプリ状態 (nickname など)        | 変更なし              |
| `seed.app.phase.v1`        | 起動フェーズ                      | 変更なし              |
| `seed.consent.v1`          | 同意状態                          | 変更なし              |
| `seed.care.goals.v1`       | ケアの目標                        | 変更なし              |
| `seed.egg`                 | 卵カスタマイズ                    | 変更なし              |
| `seed.outbox.v1`           | 送信失敗キュー                    | 変更なし              |
| `seed.clientId`            | クライアント識別子                | 変更なし              |
| `seed.history.synced.v1`   | 履歴シード済みフラグ              | 変更なし              |

### Privacy

- 自由記述・`otherText` 系・JSON エクスポート出力は、すべて端末ローカル限定。外部送信は行わない。
- 外部送信パスは `src/api/sheets.ts` のホワイトリストで構造的に制限している。
- JSON エクスポートは fetch を使わず、Blob として端末にダウンロードするのみ。
- JSON エクスポートから端末識別子・未送信キュー・シード済みフラグを除外（P-3 対応）：
  `seed.clientId` / `seed.outbox.v1` / `seed.history.synced.v1` は本人の記録ではなく、
  共有時に Sheets 側ログとの突合リスクを上げるため対象外。

### Known Issues / Next Up

次スプリント以降で扱う、今回のスプリントでは未着手の項目：

- **P-1**: `VITE_SHEETS_ENDPOINT` が本番ビルドに焼き込まれる構造（既知課題、メモリ
  `seed-env-endpoint-secret`）。エンドポイント URL が実質シークレットになっているため、
  GAS 側でのトークン検証への移行が望ましい。
- **P-4**: `consent.attendanceBackupConsent === 'declined'` のとき
  `logCheckIn` / `logCheckOut` が送信を抑止していない既存挙動。次スプリントで対応推奨。
- **P-7**: 将来 `deploy.yml` に secret 注入する場合、`env:` で渡し `echo` しないことを
  ポリシーとしてコメントで明記する。
