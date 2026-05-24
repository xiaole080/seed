// CareScreen 3 層構造リデザイン (T1〜T13) の受け入れ条件 9 件を UI レベルで検証する。
//
// PM 仕様 §受け入れ条件:
//  ① ルーティンを「毎日」で登録すると、翌日もそのまま出てくる
//  ② 「月水金」で登録すると、火・木・土・日には出てこない
//  ③ ストリーク数字が、日付が変わっても正しい連続日数を保つ
//  ④ 「ひと休み」を押すとストリークが途切れない
//  ⑤ いつかリストから「今日だけやってみる」を押すと、今日のリズム欄に出る
//  ⑥ いつかリストから「まいにちにする」を押すとルーティンに昇格
//  ⑦ サッと追加ボタンから 3 種類どれにも保存できる
//  ⑧ 既存ユーザーの smallGoals / concernGoals が消えない（移行できている）
//  ⑨ 鳥との関係セクションは変わらず動く
//
// 加えて: 禁止文言走査 / FAB エッジケース / paused 中の動作 / logTask に text が乗らない。

import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CareScreen } from './CareScreen';
import {
  ROUTINES_KEY,
  NOTICE_ROUTINES_DISMISSED_KEY,
  CARE_GOALS_KEY,
} from '../data/store';
import {
  addRoutine,
  setRoutineLog,
  loadRoutineLogs,
  loadRoutines,
  loadOneOffTasks,
} from '../data/routines';
import { runMigrations } from '../data/migrations';

beforeEach(() => {
  localStorage.clear();
  // userEvent は内部で setTimeout を使うため、Date のみ fake にする
  // (timer まで fake にすると user.click() が無限待機して timeout する)。
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 4, 25, 10, 0, 0)); // 2026-05-25 月曜
});

afterEach(() => {
  vi.useRealTimers();
});

function renderCare(props: Parameters<typeof CareScreen>[0] = {}) {
  // 初回バナーは UI ノイズを減らすため dismissed=true の状態で描画する。
  localStorage.setItem(NOTICE_ROUTINES_DISMISSED_KEY, JSON.stringify(true));
  return render(<CareScreen {...props} />);
}

describe('CareScreen 受け入れ ①〜⑨', () => {
  it('① 毎日ルーティンは翌日にも残る', async () => {
    const user = userEvent.setup();
    const { unmount } = renderCare();
    await user.click(screen.getByRole('button', { name: 'サッと追加' }));
    await user.type(
      screen.getByPlaceholderText('例: 朝、窓を開ける'),
      '朝、窓を開ける',
    );
    await user.click(screen.getByRole('button', { name: 'まいにち' }));
    expect(loadRoutines()).toHaveLength(1);

    unmount();
    vi.setSystemTime(new Date(2026, 4, 26, 10, 0, 0)); // 翌日 火曜
    renderCare();
    expect(screen.getByText('朝、窓を開ける')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '達成にする' }),
    ).toBeInTheDocument();
  });

  it('② 月水金: 火曜には対象外として描画され、達成ボタンが出ない', () => {
    addRoutine({
      text: 'ストレッチ',
      frequency: 'weekdays',
      weekdays: [0, 2, 4],
    });
    vi.setSystemTime(new Date(2026, 4, 26, 10, 0, 0)); // 火曜
    renderCare();
    expect(screen.getByText('ストレッチ')).toBeInTheDocument();
    expect(screen.getByText('きょうは おやすみの曜日')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /達成にする|達成を取り消す/ }),
    ).not.toBeInTheDocument();
  });

  it('② 月水金: 月曜には対象になる', () => {
    addRoutine({
      text: 'ストレッチ',
      frequency: 'weekdays',
      weekdays: [0, 2, 4],
    });
    renderCare();
    expect(
      screen.getByRole('button', { name: '達成にする' }),
    ).toBeInTheDocument();
  });

  it('③ 連続 done 3 日 → 🔥 3日 つづいてるよ', () => {
    const r = addRoutine({ text: '朝の散歩', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-25', 'done');
    setRoutineLog(r.id, '2026-05-24', 'done');
    setRoutineLog(r.id, '2026-05-23', 'done');
    renderCare();
    expect(screen.getByText(/🔥\s*3日\s*つづいてるよ/)).toBeInTheDocument();
  });

  it('③ ストリーク 0 のとき 🔥 表示は出ない', () => {
    addRoutine({ text: 'A', frequency: 'daily' });
    renderCare();
    expect(screen.queryByText(/🔥/)).not.toBeInTheDocument();
  });

  it('④ rest を挟んでも streak は途切れない', () => {
    const r = addRoutine({ text: '朝の散歩', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-25', 'done');
    setRoutineLog(r.id, '2026-05-24', 'rest');
    setRoutineLog(r.id, '2026-05-23', 'done');
    setRoutineLog(r.id, '2026-05-22', 'done');
    renderCare();
    expect(screen.getByText(/🔥\s*3日\s*つづいてるよ/)).toBeInTheDocument();
  });

  it('④ ひと休みボタンで当日 rest が保存される', async () => {
    const user = userEvent.setup();
    const r = addRoutine({ text: 'A', frequency: 'daily' })!;
    renderCare();
    await user.click(screen.getByRole('button', { name: 'ひと休み' }));
    expect(loadRoutineLogs()[r.id]?.['2026-05-25']).toBe('rest');
  });

  it('⑤ Concern の今日だけやってみる → OneOff が増え、Concern は残る', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      CARE_GOALS_KEY,
      JSON.stringify({
        smallGoals: [],
        concernGoals: [
          {
            id: 'cg_1',
            text: '本屋に行く',
            createdAt: '2026-05-22T00:00:00.000Z',
          },
        ],
      }),
    );
    renderCare();
    expect(screen.getByText('本屋に行く')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: '今日だけやってみる' }),
    );
    const tasks = loadOneOffTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].text).toBe('本屋に行く');
    expect(tasks[0].fromConcernId).toBe('cg_1');
    // concern は残るので、同じ文字列が複数箇所に出る
    expect(screen.getAllByText('本屋に行く').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByLabelText('いつかリスト由来').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('⑥ Concern のまいにちにする → daily Routine 作成 + Concern 削除', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      CARE_GOALS_KEY,
      JSON.stringify({
        smallGoals: [],
        concernGoals: [
          {
            id: 'cg_1',
            text: '朝散歩',
            createdAt: '2026-05-22T00:00:00.000Z',
          },
        ],
      }),
    );
    renderCare();
    await user.click(screen.getByRole('button', { name: 'まいにちにする' }));
    const routines = loadRoutines();
    expect(routines).toHaveLength(1);
    expect(routines[0].text).toBe('朝散歩');
    expect(routines[0].frequency).toBe('daily');
    const raw = JSON.parse(localStorage.getItem(CARE_GOALS_KEY) ?? '{}');
    expect(raw.concernGoals).toHaveLength(0);
  });

  it('⑦ FAB から 3 種類どれにも保存できる', async () => {
    const user = userEvent.setup();
    renderCare();

    await user.click(screen.getByRole('button', { name: 'サッと追加' }));
    await user.type(
      screen.getByPlaceholderText('例: 朝、窓を開ける'),
      'お茶を1杯',
    );
    await user.click(screen.getByRole('button', { name: '今日だけ' }));
    expect(loadOneOffTasks()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'サッと追加' }));
    await user.type(
      screen.getByPlaceholderText('例: 朝、窓を開ける'),
      '寝る前ストレッチ',
    );
    await user.click(screen.getByRole('button', { name: 'まいにち' }));
    expect(loadRoutines()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'サッと追加' }));
    await user.type(
      screen.getByPlaceholderText('例: 朝、窓を開ける'),
      '本屋に寄る',
    );
    await user.click(screen.getByRole('button', { name: 'いつか' }));
    const raw = JSON.parse(localStorage.getItem(CARE_GOALS_KEY) ?? '{}');
    expect(raw.concernGoals).toHaveLength(1);
  });

  it('⑦ FAB ダイアログ: 空入力では 3 ボタンが disabled', async () => {
    const user = userEvent.setup();
    renderCare();
    await user.click(screen.getByRole('button', { name: 'サッと追加' }));
    expect(screen.getByRole('button', { name: '今日だけ' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'まいにち' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'いつか' })).toBeDisabled();
  });

  it('⑦ FAB ダイアログ: 空白だけでも disabled (trim 確認)', async () => {
    const user = userEvent.setup();
    renderCare();
    await user.click(screen.getByRole('button', { name: 'サッと追加' }));
    await user.type(screen.getByPlaceholderText('例: 朝、窓を開ける'), '   ');
    expect(screen.getByRole('button', { name: '今日だけ' })).toBeDisabled();
  });

  it('⑧ 旧 smallGoals が OneOff に移行されて描画され、concern も残る', () => {
    localStorage.setItem('seed.schema.version', JSON.stringify('0.2.0'));
    localStorage.setItem(
      CARE_GOALS_KEY,
      JSON.stringify({
        smallGoals: [
          {
            id: 'sg_1',
            date: '2026-05-25',
            text: '昨日からの目標',
            done: false,
            createdAt: '2026-05-24T00:00:00.000Z',
          },
        ],
        concernGoals: [
          {
            id: 'cg_1',
            text: '気になっていること',
            createdAt: '2026-05-22T00:00:00.000Z',
          },
        ],
      }),
    );
    runMigrations();
    renderCare();
    expect(screen.getByText('昨日からの目標')).toBeInTheDocument();
    expect(screen.getByText('気になっていること')).toBeInTheDocument();
    const care = JSON.parse(localStorage.getItem(CARE_GOALS_KEY) ?? '{}');
    expect(care.smallGoals).toEqual([]);
    expect(care.concernGoals).toHaveLength(1);
  });

  it('⑨ 鳥との関係セクションが描画され、累計日数が反映される', () => {
    renderCare({ totalDays: 42 });
    expect(screen.getByText('鳥との関係')).toBeInTheDocument();
    expect(screen.getByText(/累計\s*42\s*日の記録から/)).toBeInTheDocument();
  });

  it('⑨ eggName 指定時は {eggName}との関係 になる', () => {
    renderCare({ eggName: 'ぴよ', totalDays: 5 });
    expect(screen.getByText('ぴよとの関係')).toBeInTheDocument();
  });
});

describe('CareScreen 追加チェック', () => {
  it('paused: true のとき streak 非表示 / 達成ボタン非表示', () => {
    const r = addRoutine({ text: 'paused R', frequency: 'daily' })!;
    setRoutineLog(r.id, '2026-05-25', 'done');
    const list = loadRoutines();
    localStorage.setItem(
      ROUTINES_KEY,
      JSON.stringify(
        list.map((x) => (x.id === r.id ? { ...x, paused: true } : x)),
      ),
    );
    renderCare();
    expect(screen.queryByText(/🔥/)).not.toBeInTheDocument();
    expect(screen.getAllByText('ひと休み中').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.queryByRole('button', { name: /達成にする|達成を取り消す/ }),
    ).not.toBeInTheDocument();
  });

  it('paused のカードは最下部に並ぶ', () => {
    addRoutine({ text: 'アクティブ', frequency: 'daily' });
    const paused = addRoutine({ text: 'ねむり中', frequency: 'daily' })!;
    const list = loadRoutines();
    localStorage.setItem(
      ROUTINES_KEY,
      JSON.stringify(
        list.map((x) =>
          x.id === paused.id ? { ...x, paused: true } : x,
        ),
      ),
    );
    renderCare();
    const active = screen.getByText('アクティブ');
    const sleepy = screen.getByText('ねむり中');
    expect(
      active.compareDocumentPosition(sleepy) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('同じ routine の達成を 2 回タップすると取り消される', async () => {
    const user = userEvent.setup();
    const r = addRoutine({ text: 'X', frequency: 'daily' })!;
    renderCare();
    await user.click(screen.getByRole('button', { name: '達成にする' }));
    expect(loadRoutineLogs()[r.id]?.['2026-05-25']).toBe('done');
    await user.click(
      screen.getByRole('button', { name: '達成を取り消す' }),
    );
    expect(loadRoutineLogs()[r.id]?.['2026-05-25']).toBeUndefined();
  });

  it('OneOff の自由記述: 絵文字・スクリプト風文字列でも壊れない', async () => {
    const user = userEvent.setup();
    renderCare();
    await user.click(screen.getByRole('button', { name: 'サッと追加' }));
    const evil = '<script>alert(1)</script> 🌱 日本語 & 記号';
    await user.type(
      screen.getByPlaceholderText('例: 朝、窓を開ける'),
      evil,
    );
    await user.click(screen.getByRole('button', { name: '今日だけ' }));
    const tasks = loadOneOffTasks();
    expect(tasks).toHaveLength(1);
    // textContent としてエスケープ済みで描画される
    expect(tasks[0].text).toContain('<script>');
    expect(screen.getByText(tasks[0].text)).toBeInTheDocument();
  });

  it('FAB ダイアログ: 背景タップで閉じる (入力破棄)', async () => {
    const user = userEvent.setup();
    renderCare();
    await user.click(screen.getByRole('button', { name: 'サッと追加' }));
    await user.type(
      screen.getByPlaceholderText('例: 朝、窓を開ける'),
      '未確定',
    );
    await user.click(screen.getByRole('dialog'));
    expect(
      screen.queryByPlaceholderText('例: 朝、窓を開ける'),
    ).not.toBeInTheDocument();
    expect(loadOneOffTasks()).toHaveLength(0);
    expect(loadRoutines()).toHaveLength(0);
  });

  it('FAB ダイアログ: キャンセルボタンでも閉じる', async () => {
    const user = userEvent.setup();
    renderCare();
    await user.click(screen.getByRole('button', { name: 'サッと追加' }));
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(
      screen.queryByPlaceholderText('例: 朝、窓を開ける'),
    ).not.toBeInTheDocument();
  });

  it('初回バナー: dismissed 未設定なら表示される', () => {
    render(<CareScreen />);
    expect(
      screen.getByText('『まいにちのリズム』が追加されました'),
    ).toBeInTheDocument();
  });

  it('初回バナー: × で閉じると localStorage の dismissed が立つ', async () => {
    const user = userEvent.setup();
    render(<CareScreen />);
    await user.click(screen.getByLabelText('閉じる'));
    expect(
      screen.queryByText('『まいにちのリズム』が追加されました'),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(NOTICE_ROUTINES_DISMISSED_KEY)).toBe('true');
  });

  it('初回バナー: dismissed=true なら再表示しない', () => {
    localStorage.setItem(NOTICE_ROUTINES_DISMISSED_KEY, JSON.stringify(true));
    render(<CareScreen />);
    expect(
      screen.queryByText('『まいにちのリズム』が追加されました'),
    ).not.toBeInTheDocument();
  });

  it('logTask の外部送信ペイロードに自由記述 text が混入していない', async () => {
    const user = userEvent.setup();
    const sheets = await import('../api/sheets');
    const spy = vi.spyOn(sheets, 'logTask');
    renderCare();
    await user.click(screen.getByRole('button', { name: 'サッと追加' }));
    await user.type(
      screen.getByPlaceholderText('例: 朝、窓を開ける'),
      '秘密のメモ',
    );
    await user.click(screen.getByRole('button', { name: '今日だけ' }));
    await user.click(screen.getByRole('button', { name: '達成にする' }));
    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['done', 'impact', 'taskId']);
    for (const v of Object.values(payload)) {
      expect(String(v)).not.toContain('秘密のメモ');
    }
    spy.mockRestore();
  });
});

describe('CareScreen 文言走査', () => {
  it('フッターに「達成できなくても、大丈夫。」が残っている', () => {
    renderCare();
    expect(
      screen.getByText(/達成できなくても、大丈夫。/),
    ).toBeInTheDocument();
  });

  it('基本セクション語彙が揃っている', () => {
    renderCare();
    expect(
      screen.getByRole('button', { name: 'サッと追加' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/まいにちのリズム/)).toBeInTheDocument();
    expect(screen.getByText(/今日だけタスク/)).toBeInTheDocument();
    expect(screen.getByText(/いつかやってみたいこと/)).toBeInTheDocument();
  });

  it('禁止語: 指示・強制ニュアンスのある語が描画されていない', () => {
    renderCare({ totalDays: 5, eggName: 'ぴよ' });
    const root = document.body.textContent ?? '';
    const banned = [
      'がんばれ',
      'がんばろう',
      '努力',
      'やらないと',
      '達成しないと',
      '失敗',
      'サボった',
    ];
    for (const w of banned) {
      expect(root).not.toContain(w);
    }
  });
});
