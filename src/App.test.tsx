// App の結合テスト: フェーズ遷移とルーティング、記録フローを通しで確認する。
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

// バグ修正 (Sprint 2026-05-31): 鳥のステージが「記録がない日に卵に戻る」問題への回帰テスト。
//   deriveStage(streak, manualStage) で manualStage 由来分は維持されるが、
//   manualStage の更新がどこからも行われていなかったため、streak が 0 になると
//   毎回ステージが 0 (卵) に戻っていた。
//   到達した stage を manualStage に自動保存することで、後退しないことを担保する。
describe('App — 到達ステージの永続化 (記録がない日に卵に戻らない)', () => {
  // localStorage の AppState を読む薄いヘルパ。
  function readState(): Record<string, unknown> {
    return JSON.parse(localStorage.getItem('seed.app.state.v1') ?? '{}');
  }

  // 連続 N 日分の最小限の DailyRecord を localStorage に書き込むヘルパ。
  // baseDateISO を「今日」として、過去 N 日分を埋める。
  function seedDailyForStreak(
    baseDateISO: string,
    days: number,
  ): void {
    const [by, bm, bd] = baseDateISO.split('-').map(Number);
    const map: Record<string, unknown> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(by, bm - 1, bd - i);
      const p = (n: number) => String(n).padStart(2, '0');
      const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      map[date] = {
        localRecordId: `r_${date}`,
        date,
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
        createdAt: `${date}T10:00:00.000Z`,
        updatedAt: `${date}T10:00:00.000Z`,
      };
    }
    localStorage.setItem('seed.daily.v1', JSON.stringify(map));
  }

  it('過去 3 日連続記録 (streak=3) で起動すると manualStage が 3 に引き上がる', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-31T10:00:00'));

    // 5/29, 5/30, 5/31 の 3 日連続
    seedDailyForStreak('2026-05-31', 3);
    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));

    render(<App />);

    await waitFor(() => {
      const s = readState();
      expect(s.manualStage).toBe(3);
    });

    vi.useRealTimers();
  });

  it('新規ユーザー (manualStage=0) で streak=2 のとき manualStage が 2 に永続化される', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-31T10:00:00'));

    // 5/30, 5/31 の 2 日連続
    seedDailyForStreak('2026-05-31', 2);
    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));

    render(<App />);

    await waitFor(() => {
      const s = readState();
      expect(s.manualStage).toBe(2);
    });

    vi.useRealTimers();
  });

  it('manualStage=3 で起動 → 記録がなく streak=0 でも manualStage は 3 のまま (卵に戻らない)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-31T10:00:00'));

    // 記録なし (= streak=0)。state にだけ manualStage=3 を残しておく。
    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));
    localStorage.setItem(
      'seed.app.state.v1',
      JSON.stringify({
        nickname: 'はる',
        manualStage: 3,
      }),
    );

    render(<App />);

    // 永続化サイクルが回っても manualStage は 3 を保つ
    await waitFor(() => {
      const s = readState();
      expect(s.manualStage).toBe(3);
    });
    // 念のため少し待ってからも変わらないこと
    const after = readState();
    expect(after.manualStage).toBe(3);

    vi.useRealTimers();
  });

  // AC1 (docs/specs/bird-stage-no-regression.md §3): 記録ゼロ件で起動した
  // 新規ユーザーは卵 (stage=0) 表示で始まる。manualStage 自動更新 useEffect が
  // 走っても、stage=0 / manualStage=0 のままで前進判定が動かないことを担保する。
  it('AC1: 記録が一度もない状態でホームを表示すると鳥は卵 (stage=0) のまま', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-31T10:00:00'));

    // phase=app だけ復元。daily / attendance / state は空 (= 初回ユーザー相当)。
    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));

    render(<App />);

    // ホームが描画されていること (CTA の存在で確認)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /今日の様子を記録する/ }),
      ).toBeInTheDocument();
    });

    // state.manualStage は 0 (= 卵) のまま据え置き。
    // INITIAL_STATE.eggSpecies = 'chicken' が永続化されている。
    await waitFor(() => {
      const s = readState();
      expect(s.manualStage).toBe(0);
      expect(s.eggSpecies).toBe('chicken');
    });

    vi.useRealTimers();
  });

  // AC3 (docs/specs/bird-stage-no-regression.md §3): species 保持。
  // 直前に若鳥 (Stage 3) ・ species='robin' で記録した状態から、
  // 30 日後にアプリを再起動 (記録なし) しても、species と stage が後退しない。
  it('AC3: eggSpecies=robin / manualStage=3 を保存後、30 日後に記録なしで再起動しても species と stage は保持される', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-31T10:00:00'));

    // 直前の記録時点: 若鳥 (stage=3) かつ species='robin'
    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));
    localStorage.setItem(
      'seed.app.state.v1',
      JSON.stringify({
        nickname: 'はる',
        manualStage: 3,
        eggSpecies: 'robin',
      }),
    );
    // daily は空のまま (= streak=0 / 30 日間記録なし相当)

    // 30 日後にジャンプ
    vi.setSystemTime(new Date('2026-06-30T10:00:00'));

    render(<App />);

    await waitFor(() => {
      const s = readState();
      // species は明示的に再選択されない限り後退しない
      expect(s.eggSpecies).toBe('robin');
      // stage も manualStage の単調増加 useEffect で 3 のまま据え置き
      expect(s.manualStage).toBe(3);
    });

    vi.useRealTimers();
  });

  // AC6 (docs/specs/bird-stage-no-regression.md §3): 全データ削除で
  // manualStage / eggSpecies が初期値に戻る。AppState を ProfileScreen → DataDeleteCard
  // 経由で削除する代わりに、削除後の挙動を直接確認するため deleteAllLocalData を呼ぶ。
  it('AC6: manualStage=3 / eggSpecies=quail を持つ状態で全データ削除すると、次回起動で卵 (stage=0) かつ eggSpecies が初期値 chicken に戻る', async () => {
    const { deleteAllLocalData } = await import('./data/store');

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-31T10:00:00'));

    // 直前状態: stage=3 / species='quail'
    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));
    localStorage.setItem(
      'seed.app.state.v1',
      JSON.stringify({
        nickname: 'はる',
        manualStage: 3,
        eggSpecies: 'quail',
      }),
    );

    // 全データ削除 (わたし画面 → 端末のデータを消す と同等)
    deleteAllLocalData();
    expect(localStorage.getItem('seed.app.state.v1')).toBeNull();

    // 次回起動相当: 新たに App を render
    render(<App />);

    // INITIAL_STATE で書き戻され、manualStage=0 (卵) / eggSpecies='chicken'
    await waitFor(() => {
      const s = readState();
      expect(s.manualStage).toBe(0);
      expect(s.eggSpecies).toBe('chicken');
    });

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
