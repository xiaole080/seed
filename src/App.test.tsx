// App の結合テスト: フェーズ遷移とルーティング、記録フローを通しで確認する。
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

afterEach(() => {
  vi.useRealTimers();
});

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
    // schemaVersion がマイグレーションで更新されている (0.3.0 まで進む)
    expect(localStorage.getItem('seed.schema.version')).toBe('"0.3.0"');
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

// T1/T2: today カードは現在日 + DEFAULT_SCHEDULE と attendance ストアから派生する。
//   - 旧 state.todayMode を localStorage に持っていても、土日は休み判定になる。
//   - 既に checkOut まで打刻された attendance レコードがあれば、CheckIn 画面は
//     'checkedOut' 状態で開き、実打刻時刻が表示される。
describe('App — today カードの派生 (T1/T2)', () => {
  // 月曜の DEFAULT_SCHEDULE は office なので、テストの安定性のため Date を固定する。
  // 2026-05-30 (土) は DEFAULT_SCHEDULE[5] = off になる。
  it('旧 state.todayMode="office" を持っていても、土曜起動ならホームに「お休みの日」が出る', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-30T10:00:00'));

    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));
    // 旧スキーマの state: todayMode='office' / todayBand='full' を残したまま
    localStorage.setItem(
      'seed.app.state.v1',
      JSON.stringify({
        nickname: 'はる',
        todayMode: 'office',
        todayBand: 'full',
      }),
    );

    render(<App />);
    // ホームの ATTENDANCE 領域に「きょうはお休みの日」が出る (T5 文言)
    expect(screen.getByText(/きょうはお休みの日/)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('attendance レコードを直接書き込んでから起動すると、CheckIn 画面が checkedOut + 実打刻時刻で開く', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // 月曜 → office
    vi.setSystemTime(new Date('2026-05-25T16:00:00'));
    const user = userEvent.setup();

    const date = '2026-05-25';
    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));
    localStorage.setItem(
      'seed.attendance.v1',
      JSON.stringify({
        [date]: {
          localAttendanceId: `att_${date}`,
          date,
          weekday: 'Mon',
          plannedMode: 'office',
          plannedBand: 'full',
          actualMode: 'office',
          checkIn: '09:42',
          checkOut: '15:08',
          durationMinutes: 326,
          missingClock: false,
          edited: false,
          exportMonth: '2026-05',
        },
      }),
    );

    render(<App />);
    // ホームの ATTENDANCE をクリックして打刻画面へ
    await user.click(screen.getByText('ATTENDANCE'));
    // 実打刻時刻が反映されている (T2 / T3)。打刻カード + 「(09:42 〜 15:08)」の2箇所に出る。
    expect(screen.getAllByText(/09:42/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/15:08/).length).toBeGreaterThan(0);
    // checkedOut 用の文言が出ている (T3)
    expect(screen.getByText('おつかれさまでした')).toBeInTheDocument();
    // T3: 時刻レンジが「(09:42 〜 15:08)」形式で添えられる
    expect(screen.getByText(/\(09:42 〜 15:08\)/)).toBeInTheDocument();

    vi.useRealTimers();
  });
});

// T1-B (QA / SPRINT_PROMPT_5 §QA): 日付跨ぎ時に dateKey が再評価され、
//   前日の checkedOut 状態を引きずらないこと。今日の attendance がまだ無い
//   ので CheckIn 画面は「未打刻」(=> 「到着したら打刻してね」) で開く。
describe('App — 日付跨ぎ時の AttendanceCard 切り替え (T1-B / SPRINT 5 QA)', () => {
  it('23:59 → 00:00 で前日の checkedOut から「未打刻」に切り替わる', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    // 5/25 (月) 23:59
    vi.setSystemTime(new Date('2026-05-25T23:59:00'));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // 前日 (5/25 月) の attendance を checkedOut 状態でセット
    const prevDate = '2026-05-25';
    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));
    localStorage.setItem(
      'seed.attendance.v1',
      JSON.stringify({
        [prevDate]: {
          localAttendanceId: `att_${prevDate}`,
          date: prevDate,
          weekday: 'Mon',
          plannedMode: 'office',
          plannedBand: 'full',
          actualMode: 'office',
          checkIn: '09:42',
          checkOut: '15:08',
          durationMinutes: 326,
          missingClock: false,
          edited: false,
          exportMonth: '2026-05',
        },
      }),
    );

    render(<App />);

    // 23:59 の時点では前日の attendance が「今日」とみなされ checkedOut で表示される
    await user.click(screen.getByText('ATTENDANCE'));
    expect(screen.getByText('おつかれさまでした')).toBeInTheDocument();

    // 一旦ホームに戻る (CheckIn 画面のサブツリーを再マウントさせるため)
    await user.click(screen.getByRole('button', { name: /ホームへもどる/ }));

    // 5/26 (火) 00:00 へ移行 → setInterval(60_000) で dateKey 再評価
    vi.setSystemTime(new Date('2026-05-26T00:00:30'));
    // 60 秒進めて check() を発火させる
    vi.advanceTimersByTime(60_000);

    // 再度 CheckIn 画面を開くと「未打刻」(到着したら打刻してね) になっている
    await user.click(screen.getByText('ATTENDANCE'));
    // 火曜日も office なので「到着したら打刻してね」(state=before) が出る
    expect(screen.getByText('到着したら打刻してね')).toBeInTheDocument();
    // 前日の checkedOut 文言は消えている
    expect(
      screen.queryByText('おつかれさまでした'),
    ).not.toBeInTheDocument();
    // 前日の実打刻時刻も今日のレンジには出ていない
    expect(screen.queryByText(/\(09:42 〜 15:08\)/)).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});

// バグ③ 修正 (Sprint 2026-05-24): App.tsx の totalDays / streak の useMemo deps に
//   dateKey が無く、アプリを開きっぱなしで日付が跨いだあとケア画面を開いても
//   前日基準の値で固定される問題への回帰テスト。日付跨ぎ後に再計算されることを
//   ケア画面の totalDays 表示 (鳥バー) で確認する。
describe('App — 日付跨ぎ時の totalDays / streak 再計算 (バグ③)', () => {
  it('日付跨ぎ後、新しい今日の記録が totalDays に反映される', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    // 2026-05-25 (月) 23:59 で開始
    vi.setSystemTime(new Date('2026-05-25T23:59:00'));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // 既存記録を 1 件 (5/25 = 今日) 仕込んでおく
    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));
    localStorage.setItem(
      'seed.daily.v1',
      JSON.stringify({
        '2026-05-25': {
          localRecordId: 'r_25',
          date: '2026-05-25',
          mood: 3,
          primaryInfluence: [],
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
            skippedNote: true,
          },
          createdAt: '2026-05-25T10:00:00.000Z',
          updatedAt: '2026-05-25T10:00:00.000Z',
        },
      }),
    );

    render(<App />);

    // ケア画面 (鳥バー) は「ケア」タブから開く
    await user.click(screen.getByRole('button', { name: /ケア/ }));
    // totalDays = 1 で「1日」表示が出る
    expect(screen.getAllByText(/1\s*日/).length).toBeGreaterThan(0);

    // 翌日 (5/26 火) 0:00:30 に進めて 60 秒間隔の check() を発火
    vi.setSystemTime(new Date('2026-05-26T00:00:30'));
    vi.advanceTimersByTime(60_000);

    // 5/26 の記録を localStorage に直接追加 (=2 日記録)
    const map = JSON.parse(localStorage.getItem('seed.daily.v1') ?? '{}');
    map['2026-05-26'] = {
      localRecordId: 'r_26',
      date: '2026-05-26',
      mood: 3,
      primaryInfluence: [],
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
        skippedNote: true,
      },
      createdAt: '2026-05-26T10:00:00.000Z',
      updatedAt: '2026-05-26T10:00:00.000Z',
    };
    localStorage.setItem('seed.daily.v1', JSON.stringify(map));

    // もう一度 check() を発火させて dateKey 更新 → useMemo 再計算
    vi.advanceTimersByTime(60_000);

    // タブ切替で再描画。totalDays が 2 件 (= 5/25 + 5/26) に上がっていること。
    // ※ useMemo deps に dateKey が無いと、ここで「1日」のままになる回帰。
    // ケア画面の totalDays は「N日」「Day N」など複数箇所に出るので、
    // 「2」を含む表示が少なくとも 1 つあることで再計算を確認する。
    // ホーム→ケアと往復してから ケア に戻る
    await user.click(screen.getByRole('button', { name: /ホーム/ }));
    await user.click(screen.getByRole('button', { name: /ケア/ }));
    expect(screen.getAllByText(/2\s*日/).length).toBeGreaterThan(0);

    vi.useRealTimers();
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
