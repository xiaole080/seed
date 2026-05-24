// App の結合テスト: フェーズ遷移とルーティング、記録フローを通しで確認する。
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App — 初期表示', () => {
  it('localStorage が空なら同意画面から始まる', () => {
    render(<App />);
    expect(screen.getByText('はじめに', { exact: false })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /同意して/ }),
    ).toBeInTheDocument();
  });

  it('phase=app を復元するとホーム画面が出る', () => {
    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));
    render(<App />);
    // T6: ホームのCTAは「今日の様子を記録する / 修正する」になっている
    expect(
      screen.getByRole('button', { name: /今日の様子を記録する|今日の記録を修正する/ }),
    ).toBeInTheDocument();
  });
});

// QA 追加: 旧データ + schemaVersion 未設定で起動しても、
// 初期表示 (phase=app) でホームが壊れずに描画され、既存記録が読める。
describe('App — マイグレーション後の初期表示 (T17 / Phase 2a)', () => {
  it('旧 seed.daily.v1 ありで phase=app を復元すると、ホーム CTA が修正ボタンに切り替わる', () => {
    // 今日付の旧 DailyRecord (targetDateType なし) を直接書き込む
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    localStorage.setItem(
      'seed.daily.v1',
      JSON.stringify({
        [today]: {
          localRecordId: 'r_old',
          date: today,
          mood: 4,
          primaryInfluence: [],
          note: 'マイグレ前のメモ',
          missingness: {
            noRecord: false,
            skippedMood: false,
            skippedPrimaryInfluence: true,
            skippedSleep: true,
            skippedMeal: true,
            skippedExercise: true,
            skippedCondition: true,
            skippedMedication: true,
            skippedAttendance: false,
            skippedNote: false,
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      }),
    );
    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));

    render(<App />);

    // 既存記録が "今日の記録" として認識され、CTA が修正ボタンに化けている
    expect(
      screen.getByRole('button', { name: /今日の記録を修正する/ }),
    ).toBeInTheDocument();
    // schemaVersion がマイグレーションで更新されている (0.2.0 まで進む)
    expect(localStorage.getItem('seed.schema.version')).toBe('"0.2.0"');
    // 既存 note が消えていない
    const after = JSON.parse(localStorage.getItem('seed.daily.v1') ?? '{}');
    expect(after[today].note).toBe('マイグレ前のメモ');
  });

  it('localStorage が破損していてもクラッシュせず同意画面が出る', () => {
    // schema.version に JSON として不正な値を直接入れる
    localStorage.setItem('seed.schema.version', '{ not json');
    // daily に壊れた JSON
    localStorage.setItem('seed.daily.v1', '{ not json');

    expect(() => render(<App />)).not.toThrow();
    expect(screen.getByText('はじめに', { exact: false })).toBeInTheDocument();
  });
});

describe('App — オンボーディングから記録まで通し', () => {
  it('同意 → ログイン → 初期設定スキップ → ホーム → 気分記録 → リアクション', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 00 同意: チェックを入れてから「同意して はじめる」
    await user.click(
      screen.getByRole('checkbox', { name: /内容を読みました/ }),
    );
    await user.click(screen.getByRole('button', { name: /同意して/ }));

    // 01 ログイン
    await user.click(screen.getByRole('button', { name: 'はじめる' }));

    // 卵 → 通所 → 記録項目 の初期設定は「あとで設定する」でスキップ
    await user.click(screen.getByRole('button', { name: 'あとで設定する' }));
    await user.click(screen.getByRole('button', { name: 'あとで設定する' }));
    await user.click(screen.getByRole('button', { name: 'あとで設定する' }));

    // 02 ホーム — T6: 今日の記録導線
    const moodButton = screen.getByRole('button', {
      name: /今日の様子を記録する/,
    });
    expect(moodButton).toBeInTheDocument();
    // フェーズが永続化されている
    expect(localStorage.getItem('seed.app.phase.v1')).toBe('"app"');

    // 03 きもちを記録 → そのまま「記録する」
    await user.click(moodButton);
    expect(screen.getByText('今のきもちは？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '記録する' }));

    // 04 リアクション画面へ遷移 (記録画面は消えている)
    expect(screen.queryByText('今のきもちは？')).not.toBeInTheDocument();

    // 端末ストアに DailyRecord が 1 件保存されている
    const daily = JSON.parse(localStorage.getItem('seed.daily.v1') ?? '{}');
    expect(Object.keys(daily)).toHaveLength(1);
  });
});
