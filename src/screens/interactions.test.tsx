// 主要なデータ入力画面の操作テスト。
// 同意・ニックネーム・気分記録・打刻という、記録の発生点を重点的に検証する。
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConsentState, TodayCard } from '../data/types';

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
  consentVersion: 'v1.0',
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
