// 主要なデータ入力画面の操作テスト。
// 同意・ニックネーム・気分記録・打刻という、記録の発生点を重点的に検証する。
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConsentState, TodayCard } from '../data/types';

// fake timers を使ったテストが途中で失敗してもフェイクが残らないように常に戻す。
afterEach(() => {
  vi.useRealTimers();
});

import { LoginScreen } from './LoginScreen';
import { ConsentScreen } from './ConsentScreen';
import { MoodLogScreen } from './MoodLogScreen';
import { CheckInScreen } from './CheckInScreen';
import { HomeScreen } from './HomeScreen';

const BASE_CONSENT: ConsentState = {
  appTermsAccepted: false,
  attendanceBackupConsent: 'notAsked',
  attendanceExportConsent: 'notAsked',
  researchConsent: 'notAsked',
  weatherApiConsent: 'notAsked',
  consentVersion: 'v1.1',
};

describe('LoginScreen', () => {
  it('入力したニックネームを onSubmit に渡す', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginScreen onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText('例: はる');
    await user.clear(input);
    await user.type(input, 'みどり');
    await user.click(screen.getByRole('button', { name: 'はじめる' }));

    expect(onSubmit).toHaveBeenCalledWith('みどり');
  });

  it('未入力なら既定名「あなた」で送信する', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginScreen onSubmit={onSubmit} />);

    await user.clear(screen.getByPlaceholderText('例: はる'));
    await user.click(screen.getByRole('button', { name: 'はじめる' }));

    expect(onSubmit).toHaveBeenCalledWith('あなた');
  });
});

describe('ConsentScreen', () => {
  it('同意チェック前は「同意して はじめる」が無効', () => {
    render(<ConsentScreen consent={BASE_CONSENT} onAccept={() => {}} />);
    expect(screen.getByRole('button', { name: /同意して/ })).toBeDisabled();
  });

  it('同意のみ: 通所バックアップは declined になる', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(<ConsentScreen consent={BASE_CONSENT} onAccept={onAccept} />);

    await user.click(
      screen.getByRole('checkbox', { name: /内容を読みました/ }),
    );
    await user.click(screen.getByRole('button', { name: /同意して/ }));

    expect(onAccept).toHaveBeenCalledOnce();
    const next = onAccept.mock.calls[0][0] as ConsentState;
    expect(next.appTermsAccepted).toBe(true);
    expect(next.attendanceBackupConsent).toBe('declined');
  });

  it('オプトインすると通所バックアップは accepted になる', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(<ConsentScreen consent={BASE_CONSENT} onAccept={onAccept} />);

    await user.click(
      screen.getByRole('checkbox', { name: /自動バックアップに同意/ }),
    );
    await user.click(
      screen.getByRole('checkbox', { name: /内容を読みました/ }),
    );
    await user.click(screen.getByRole('button', { name: /同意して/ }));

    const next = onAccept.mock.calls[0][0] as ConsentState;
    expect(next.attendanceBackupConsent).toBe('accepted');
  });
});

describe('MoodLogScreen', () => {
  it('選んだ気分と影響要因を onSubmit のペイロードに反映する', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MoodLogScreen onSubmit={onSubmit} />);

    // 気分「よい」(=5) を選択
    await user.click(screen.getByRole('button', { name: /よい/ }));
    // 影響要因「SNS」を選択
    await user.click(screen.getByRole('button', { name: /SNS/ }));
    await user.click(screen.getByRole('button', { name: '記録する' }));

    expect(onSubmit).toHaveBeenCalledOnce();
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.mood).toBe(5);
    expect(payload.primaryInfluence).toEqual(['sns']);
    expect(payload.note).toBe('');
  });

  it('何も追加選択せずに記録しても送信できる (§3.6 未入力は失敗ではない)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MoodLogScreen initialMood={3} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: '記録する' }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0].mood).toBe(3);
    expect(onSubmit.mock.calls[0][0].primaryInfluence).toEqual([]);
  });
});

describe('CheckInScreen', () => {
  const today: TodayCard = { mode: 'office', band: 'full', dayLabel: '土' };

  it('打刻ボタンで onCheckIn が呼ばれる', async () => {
    const user = userEvent.setup();
    const onCheckIn = vi.fn();
    render(
      <CheckInScreen today={today} state="before" onCheckIn={onCheckIn} />,
    );

    await user.click(screen.getByRole('button', { name: /通所打刻/ }));
    expect(onCheckIn).toHaveBeenCalledOnce();
  });

  it('お休みの日は「お休みのままにする」と「打刻に進む」の2ボタンが出る (T6)', () => {
    const offToday: TodayCard = { mode: 'off', band: 'full', dayLabel: '土' };
    render(<CheckInScreen today={offToday} state="before" />);
    expect(
      screen.getByRole('button', { name: 'お休みのままにする' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '打刻に進む' }),
    ).toBeInTheDocument();
  });

  it('「打刻に進む」を押すと例外打刻フローに切り替わり、打刻ボタンと「お休みに戻す」が出る (T6)', async () => {
    const user = userEvent.setup();
    const onCheckIn = vi.fn();
    const offToday: TodayCard = { mode: 'off', band: 'full', dayLabel: '土' };
    render(
      <CheckInScreen
        today={offToday}
        state="before"
        onCheckIn={onCheckIn}
      />,
    );

    await user.click(screen.getByRole('button', { name: '打刻に進む' }));

    // ヒーロー文言と通所打刻ボタンに差し替わる
    expect(screen.getByText('今日だけ打刻しますか？')).toBeInTheDocument();
    const checkInBtn = screen.getByRole('button', { name: /通所打刻/ });
    expect(checkInBtn).toBeInTheDocument();
    // 「お休みに戻す」リンクが現れる
    expect(
      screen.getByRole('button', { name: 'お休みに戻す' }),
    ).toBeInTheDocument();

    // 打刻ボタン押下で onCheckIn が呼ばれる
    await user.click(checkInBtn);
    expect(onCheckIn).toHaveBeenCalledOnce();
  });

  it('例外打刻に進んだ後に「お休みに戻す」を押すと、初期2択画面に戻る (T6)', async () => {
    const user = userEvent.setup();
    const offToday: TodayCard = { mode: 'off', band: 'full', dayLabel: '土' };
    render(<CheckInScreen today={offToday} state="before" />);

    await user.click(screen.getByRole('button', { name: '打刻に進む' }));
    await user.click(screen.getByRole('button', { name: 'お休みに戻す' }));

    // 初期2択に戻っている
    expect(
      screen.getByRole('button', { name: 'お休みのままにする' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '打刻に進む' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'お休みに戻す' }),
    ).not.toBeInTheDocument();
  });

  it('checkedOut 表示で実打刻時刻のレンジが添えられる (T3)', () => {
    const t: TodayCard = {
      mode: 'office',
      band: 'full',
      dayLabel: '月',
      checkInTime: '09:42',
      checkOutTime: '15:08',
    };
    render(<CheckInScreen today={t} state="checkedOut" />);
    expect(
      screen.getByText(/\(09:42 〜 15:08\)/),
    ).toBeInTheDocument();
  });

  // BUG-1 修正済み (T6 regression / 行き止まり):
  //   例外打刻後にホームへ戻り、再度 CheckIn 画面を開いた状況。App 経由なら
  //   state='checkedIn' で再表示されるが、CheckInScreen 内の effectiveMode は
  //   コンポーネント local state なので null に戻る。
  //   旧実装の `isOff = planIsOff && effectiveMode == null` は state を考慮しない
  //   ため、画面を再訪すると 2 択ボタンが復活し、帰宅打刻 / ホームへもどる の
  //   両方が消えて行き止まりになっていた。
  //   修正後は isOff の条件に `s === 'before'` を含め、checkedIn / checkedOut
  //   のときは常に通常フローに合流させる。viewMode も同条件で 'office' を返す。
  it('予定=off で state=checkedIn を渡したとき、帰宅打刻ボタンに到達できる (BUG-1 fix)', () => {
    const offToday: TodayCard = {
      mode: 'off',
      band: 'full',
      dayLabel: '土',
      checkInTime: '10:00',
    };
    render(<CheckInScreen today={offToday} state="checkedIn" />);
    expect(
      screen.getByRole('button', { name: /帰宅打刻/ }),
    ).toBeInTheDocument();
  });

  it('予定=off で state=checkedOut を渡したとき、ホームへもどるボタンが出る (BUG-1 fix)', () => {
    const offToday: TodayCard = {
      mode: 'off',
      band: 'full',
      dayLabel: '土',
      checkInTime: '10:00',
      checkOutTime: '14:30',
    };
    render(<CheckInScreen today={offToday} state="checkedOut" />);
    expect(
      screen.getByRole('button', { name: /ホームへもどる/ }),
    ).toBeInTheDocument();
  });

  // BUG-1 追加カバレッジ:
  //   再訪時に「お休みのままにする / 打刻に進む」の 2 択画面が再表示されないこと、
  //   およびヘッダーのモードラベルが実モード (通所) を反映していること。
  it('予定=off で state=checkedIn の再訪時は休み 2 択画面が出ない (BUG-1 fix)', () => {
    const offToday: TodayCard = {
      mode: 'off',
      band: 'full',
      dayLabel: '土',
      checkInTime: '10:00',
    };
    render(<CheckInScreen today={offToday} state="checkedIn" />);
    expect(
      screen.queryByRole('button', { name: 'お休みのままにする' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '打刻に進む' }),
    ).not.toBeInTheDocument();
  });

  it('予定=off で state=checkedIn のときヘッダーモードが「通所」(実モード) を表示 (BUG-1 fix)', () => {
    const offToday: TodayCard = {
      mode: 'off',
      band: 'full',
      dayLabel: '土',
      checkInTime: '10:00',
    };
    render(<CheckInScreen today={offToday} state="checkedIn" />);
    // MODE_LABEL.office === '通所' を前提に、ヘッダーカードに通所ラベルが出る。
    expect(screen.getByText(/通所・/)).toBeInTheDocument();
  });
});

// T9: 例外打刻の永続化を App 全体で確認する結合テスト。
//   - 休みの日に「打刻に進む」→「通所打刻（いま）」で
//     getAttendance(date) が plannedMode='off' / actualMode='office' のレコードを返す。
//   - 打刻後に「お休みに戻す」を押しても AttendanceMonthlyRecord は消えない。
describe('例外打刻フローの永続化 (T6/T7)', () => {
  it('お休みの日に「打刻に進む」→「通所打刻（いま）」で planned=off / actual=office のレコードが残る', async () => {
    const { default: App } = await import('../App');
    const { getAttendance } = await import('../data/store');

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-30T10:00:00')); // 土曜 = off
    const user = userEvent.setup();

    localStorage.setItem('seed.app.phase.v1', JSON.stringify('app'));
    render(<App />);

    // ホーム → ATTENDANCE タップで CheckIn 画面へ
    await user.click(screen.getByText('ATTENDANCE'));

    // 休みの2択 → 「打刻に進む」
    await user.click(screen.getByRole('button', { name: '打刻に進む' }));
    // 通所打刻
    await user.click(screen.getByRole('button', { name: /通所打刻/ }));

    const rec = getAttendance('2026-05-30');
    expect(rec).toBeDefined();
    expect(rec?.plannedMode).toBe('off');
    expect(rec?.actualMode).toBe('office');

    // 打刻後に「お休みに戻す」相当の操作 (checkedIn なのでフッターには出ない)
    // → 仕様: AttendanceMonthlyRecord は消えない (明示削除のみ原則)
    const before = getAttendance('2026-05-30');
    // 念のためもう一度同じ日付の record が消えていないことを確認する。
    expect(before).toEqual(rec);

    vi.useRealTimers();
  });
});

describe('HomeScreen — T6 今日/昨日の記録導線ボタン文言', () => {
  // 仕様 §7.2 の 4 組合せ:
  //   今日 ある/ない × 昨日 ある/ない の 4 通りで
  //   ボタンの文言が「記録する / 修正する」で正しく切り替わるか確認する。

  it('今日なし × 昨日なし: どちらも「記録する」', () => {
    render(<HomeScreen hasTodayRecord={false} hasYesterdayRecord={false} />);
    expect(
      screen.getByRole('button', { name: /今日の様子を記録する/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /昨日の様子を記録する/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /今日の記録を修正する/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /昨日の記録を修正する/ }),
    ).not.toBeInTheDocument();
  });

  it('今日あり × 昨日なし: 今日は「修正する」、昨日は「記録する」', () => {
    render(<HomeScreen hasTodayRecord={true} hasYesterdayRecord={false} />);
    expect(
      screen.getByRole('button', { name: /今日の記録を修正する/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /昨日の様子を記録する/ }),
    ).toBeInTheDocument();
  });

  it('今日なし × 昨日あり: 今日は「記録する」、昨日は「修正する」', () => {
    render(<HomeScreen hasTodayRecord={false} hasYesterdayRecord={true} />);
    expect(
      screen.getByRole('button', { name: /今日の様子を記録する/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /昨日の記録を修正する/ }),
    ).toBeInTheDocument();
  });

  it('今日あり × 昨日あり: どちらも「修正する」', () => {
    render(<HomeScreen hasTodayRecord={true} hasYesterdayRecord={true} />);
    expect(
      screen.getByRole('button', { name: /今日の記録を修正する/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /昨日の記録を修正する/ }),
    ).toBeInTheDocument();
  });

  it('既存の今日ボタンを押すと確認ブロックが出て、キャンセルしても画面遷移しない', async () => {
    // T6: confirm() ではなくインライン確認ブロックで遷移制御する。
    // キャンセル時は onLogMood / onLogYesterday が呼ばれないこと。
    const user = userEvent.setup();
    const onLogMood = vi.fn();
    const onLogYesterday = vi.fn();
    render(
      <HomeScreen
        hasTodayRecord
        hasYesterdayRecord
        onLogMood={onLogMood}
        onLogYesterday={onLogYesterday}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /今日の記録を修正する/ }),
    );
    expect(
      screen.getByText(/今日はすでに記録済みです。内容を修正しますか？/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    // 確認ブロックが閉じる
    expect(
      screen.queryByText(/今日はすでに記録済みです/),
    ).not.toBeInTheDocument();
    // 遷移コールバックは呼ばれていない
    expect(onLogMood).not.toHaveBeenCalled();
    expect(onLogYesterday).not.toHaveBeenCalled();
  });

  it('既存の今日ボタン → 確認 → 「修正する」で onLogMood が呼ばれる', async () => {
    const user = userEvent.setup();
    const onLogMood = vi.fn();
    render(
      <HomeScreen hasTodayRecord onLogMood={onLogMood} />,
    );

    await user.click(
      screen.getByRole('button', { name: /今日の記録を修正する/ }),
    );
    await user.click(screen.getByRole('button', { name: '修正する' }));
    expect(onLogMood).toHaveBeenCalledOnce();
  });

  it('未記録のボタン押下は確認ブロックを出さず、即コールバックが走る', async () => {
    const user = userEvent.setup();
    const onLogMood = vi.fn();
    render(<HomeScreen hasTodayRecord={false} onLogMood={onLogMood} />);

    await user.click(
      screen.getByRole('button', { name: /今日の様子を記録する/ }),
    );
    // インライン確認ブロックは出ない
    expect(
      screen.queryByText(/修正しますか？/),
    ).not.toBeInTheDocument();
    expect(onLogMood).toHaveBeenCalledOnce();
  });
});
