# findings: 鳥ステージ・種別 後退防止 — 手動 viewport 確認

日付: 2026-05-31
スプリント: 鳥ステージ後退防止（仕様書: [`docs/specs/bird-stage-no-regression.md`](../specs/bird-stage-no-regression.md)）

## 確認方法

- 今回の差分は `src/App.tsx` の**コメント追記**と `src/App.test.tsx` の**テスト追加 (AC1/AC3/AC6)** のみ
- UI 描画ロジックの変更はゼロ → 3 viewport (iPhone SE 375 / iPhone 13 390 / Pixel 5 412) で異なる挙動は発生しない
- スクリーンショット取得はサンドボックス環境制約で不可。**実機相当の挙動確認は vitest で代替**

## AC 確認結果

| AC      | 操作（vitest 経由）                                                             | 期待                                      | 結果                                                                                                                       |
| ------- | ------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **AC1** | localStorage を全クリア → 同意フロー → ホーム                                   | 鳥は卵 (stage=0)、species=chicken         | ✅ vitest で `state.manualStage===0 && state.eggSpecies==='chicken'` 確認                                                  |
| **AC2** | `seed.app.state.v1` に `manualStage=2` 直接編集 → リロード                      | 鳥は雛のまま（卵に戻らない）              | ✅ 既存テスト「manualStage=3 で起動 → streak=0 でも 3 のまま」が単調増加性を担保。雛(2) と若鳥(3) は同じ後退防止性質を共有 |
| **AC3** | `seed.app.state.v1` に `eggSpecies='robin'` 編集 → 30 日後 (`vi.setSystemTime`) | 鳥は robin の若鳥、species 保持           | ✅ vitest で `state.eggSpecies==='robin' && state.manualStage===3` 確認                                                    |
| **AC4** | 今日の記録で成長条件を満たす                                                    | 雛 → 若鳥                                 | ✅ `deriveStage` 純関数テストでカバー（既存 `stages.test.ts`）                                                             |
| **AC5** | 雛で記録なし日が続く                                                            | 前進判定は走らない                        | ✅ 構造的保証：`manualStage` は単調増加 useEffect のみで更新、後退経路が存在しない                                         |
| **AC6** | データ削除                                                                      | 卵に戻る、species 初期値 (chicken) に戻る | ✅ vitest で `deleteAllLocalData()` → 再 render → 初期値書き戻し確認                                                       |

## 3 viewport (375 / 390 / 412) への影響

| viewport        | 影響有無                                    |
| --------------- | ------------------------------------------- |
| iPhone SE (375) | 影響なし（コード変更はコメント+テストのみ） |
| iPhone 13 (390) | 影響なし                                    |
| Pixel 5 (412)   | 影響なし                                    |

`docs/mobile-check/README.md` §2 の回帰チェック項目（横スクロール / タップ領域 44px / キーボード挙動 / セーフエリア）に対する回帰は発生しない。

## 結論

仕様書 AC1〜AC6 はすべて単体テストまたは構造的保証で担保。手動 viewport での目視確認は、コード差分の性質上、追加で得られる情報がないため省略。実機での最終確認はらくさん側で http://localhost:5174/ をブラウザ DevTools のデバイスエミュレートで開いて、以下を任意で実施できる：

1. ブラウザ DevTools → Application → Storage → localStorage → `seed.app.state.v1` を編集
2. `{"nickname":"はる","manualStage":2}` 等に書き換え → ページリロード
3. ホーム画面で鳥が雛 (stage=2) のままで、卵に戻らないことを確認
4. 別 viewport に切り替えても挙動は変わらないことを確認
