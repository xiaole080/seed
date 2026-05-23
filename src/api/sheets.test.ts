import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

// 成功レスポンスを返す fetch スタブ
function okFetch() {
  return vi.fn(
    async (_url: string, _init: RequestInit) =>
      new Response('{"ok":true}', { status: 200 }),
  );
}

beforeAll(() => {
  // モジュールが大量に出す診断ログを抑制する
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('sheets — VITE_SHEETS_ENDPOINT 未設定 (既定)', () => {
  it('sheetsConfigured は false', async () => {
    const m = await import('./sheets');
    expect(m.sheetsConfigured).toBe(false);
  });

  it('logMood は外部送信しない (fetch 未呼び出し・outbox 空)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const m = await import('./sheets');
    await m.logMood(
      { mood: 4, primaryInfluence: ['sleep'], selections: {} },
      'はる',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(m.getOutboxSize()).toBe(0);
  });

  it('syncHistoryOnce も no-op', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const m = await import('./sheets');
    await m.syncHistoryOnce('はる');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('sheets — VITE_SHEETS_ENDPOINT 設定あり', () => {
  beforeEach(() => {
    // モジュールは ENDPOINT を import 時に固定するので、毎回読み直す
    vi.resetModules();
    vi.stubEnv('VITE_SHEETS_ENDPOINT', 'https://example.test/exec');
  });

  it('sheetsConfigured は true', async () => {
    const m = await import('./sheets');
    expect(m.sheetsConfigured).toBe(true);
  });

  it('logMood は outbox に積み、成功すると drain する', async () => {
    const fetchSpy = okFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const m = await import('./sheets');
    await m.logMood(
      {
        mood: 4,
        primaryInfluence: ['sleep'],
        selections: { 'sleep.bedtime': '23:00' },
      },
      'はる',
    );
    expect(fetchSpy).toHaveBeenCalled();
    await vi.waitFor(() => expect(m.getOutboxSize()).toBe(0));
  });

  it('【プライバシー】Sheets へ送る payload に自由記述 note を含めない (§13.8)', async () => {
    const fetchSpy = okFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const m = await import('./sheets');
    await m.logMood(
      { mood: 2, primaryInfluence: ['fatigue'], selections: {} },
      'はる',
    );
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const init = fetchSpy.mock.calls[0][1];
    const body = init.body as string;
    const event = JSON.parse(body);
    expect(event.type).toBe('mood');
    // payload は mood / primaryInfluence / selections のみ。note は端末ローカル限定
    expect(Object.keys(event.payload).sort()).toEqual([
      'mood',
      'primaryInfluence',
      'selections',
    ]);
    expect(event.payload).not.toHaveProperty('note');
    expect(body).not.toContain('note');
  });

  it('【プライバシー T11】selections の *.otherText / influenceOtherText を外部送信から除外する', async () => {
    const fetchSpy = okFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const m = await import('./sheets');
    await m.logMood(
      {
        mood: 3,
        primaryInfluence: ['other'],
        // 呼び出し側でうっかり混入しても、sheets 側で除去されることを確認する
        selections: {
          'sleep.bedtime': '23:00',
          'sleep.otherText': '個人名や施設名',
          'meal.otherText': '隠れた事情',
          influenceOtherText: '影響のその他自由入力',
          note: 'はみ出した自由記述',
        } as Record<string, string | string[] | null>,
      },
      'はる',
    );
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const init = fetchSpy.mock.calls[0][1];
    const body = init.body as string;
    const event = JSON.parse(body);
    const keys = Object.keys(event.payload.selections);
    expect(keys).toEqual(['sleep.bedtime']);
    expect(body).not.toContain('otherText');
    expect(body).not.toContain('個人名');
    expect(body).not.toContain('隠れた事情');
    expect(body).not.toContain('はみ出した自由記述');
  });

  it('sanitizeMoodPayload は単体でも otherText / note を落とす', async () => {
    const m = await import('./sheets');
    const cleaned = m.sanitizeMoodPayload({
      mood: 4,
      primaryInfluence: ['sleep'],
      selections: {
        'sleep.bedtime': '23:00',
        'meal.otherText': '消えてほしい',
        influenceOtherText: '消えてほしい',
        note: '消えてほしい',
      } as Record<string, string | string[] | null>,
    });
    expect(Object.keys(cleaned.selections)).toEqual(['sleep.bedtime']);
  });

  it('【プライバシー H2】未知キー (unknownFreeText / userMemo 等) は外部送信ペイロードに含まれない', async () => {
    const fetchSpy = okFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const m = await import('./sheets');
    await m.logMood(
      {
        mood: 3,
        primaryInfluence: ['other'],
        selections: {
          'sleep.bedtime': '23:00',
          // 未知キー (将来の別命名で混入する可能性をホワイトリストで防ぐ)
          unknownFreeText: '個人情報',
          userMemo: '家族のこと',
          freeText: 'もうひとつ',
          comment: 'コメント',
          memo: 'メモ',
          userText: 'テキスト',
        } as Record<string, string | string[] | null>,
      },
      'はる',
    );
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const init = fetchSpy.mock.calls[0][1];
    const body = init.body as string;
    const event = JSON.parse(body);
    expect(Object.keys(event.payload.selections)).toEqual(['sleep.bedtime']);
    expect(body).not.toContain('unknownFreeText');
    expect(body).not.toContain('userMemo');
    expect(body).not.toContain('freeText');
    expect(body).not.toContain('個人情報');
    expect(body).not.toContain('家族のこと');
  });

  it('【プライバシー H2】sanitizeMoodPayload は値がオブジェクトの場合に捨てる (型ガード)', async () => {
    const m = await import('./sheets');
    const cleaned = m.sanitizeMoodPayload({
      mood: 4,
      primaryInfluence: ['sleep'],
      selections: {
        'sleep.bedtime': '23:00',
        // 型を裏切る不正な値: オブジェクト / undefined は捨てる
        'sleep.wakeTime': { secret: 'leaked' } as unknown as string,
        'sleep.nightAwakenings': undefined as unknown as string,
      },
    });
    expect(Object.keys(cleaned.selections)).toEqual(['sleep.bedtime']);
  });

  it('【プライバシー H1】logTask は taskId / impact / done だけを送り、自由文 (name / text) は載らない', async () => {
    const fetchSpy = okFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const m = await import('./sheets');
    // 呼び出し側がうっかり name / text などを載せても、sanitize で落ちる
    await m.logTask(
      {
        taskId: 'goal_001',
        impact: 'basic',
        done: true,
        name: '個人名や家族の事情',
        text: '自由文',
        memo: 'メモ',
      } as unknown as Parameters<typeof m.logTask>[0],
      'はる',
    );
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const init = fetchSpy.mock.calls[0][1];
    const body = init.body as string;
    const event = JSON.parse(body);
    expect(event.type).toBe('task');
    expect(Object.keys(event.payload).sort()).toEqual([
      'done',
      'impact',
      'taskId',
    ]);
    expect(event.payload).not.toHaveProperty('name');
    expect(event.payload).not.toHaveProperty('text');
    expect(body).not.toContain('"name"');
    expect(body).not.toContain('"text"');
    expect(body).not.toContain('個人名や家族の事情');
    expect(body).not.toContain('自由文');
  });

  it('sanitizeTaskPayload は不正な型をデフォルトに落とす', async () => {
    const m = await import('./sheets');
    const cleaned = m.sanitizeTaskPayload({
      taskId: 123 as unknown as string,
      impact: 'unknown' as unknown as 'basic',
      done: 'yes' as unknown as boolean,
      name: '消えてほしい',
    });
    expect(cleaned).toEqual({ taskId: '', impact: 'basic', done: false });
  });

  it('送信失敗 (HTTP 500) は outbox に残す', async () => {
    const fetchSpy = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response('error', { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const m = await import('./sheets');
    await m.logMood({ mood: 3, primaryInfluence: [], selections: {} });
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(m.getOutboxSize()).toBe(1);
  });

  it('HTTP 200 でも {"ok":false} は失敗扱いで outbox に残す', async () => {
    const fetchSpy = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response('{"ok":false,"error":"auth"}', { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const m = await import('./sheets');
    await m.logMood({ mood: 3, primaryInfluence: [], selections: {} });
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(m.getOutboxSize()).toBe(1);
  });

  it('flushOutboxOnce は滞留した outbox を送信して drain する', async () => {
    const fetchSpy = okFetch();
    vi.stubGlobal('fetch', fetchSpy);
    localStorage.setItem(
      'seed.outbox.v1',
      JSON.stringify([
        {
          type: 'mood',
          ts: '2026-05-23T00:00:00.000Z',
          client: 'c1',
          payload: { mood: 3, primaryInfluence: [], selections: {} },
        },
      ]),
    );
    const m = await import('./sheets');
    expect(m.getOutboxSize()).toBe(1);
    m.flushOutboxOnce();
    await vi.waitFor(() => expect(m.getOutboxSize()).toBe(0));
  });

  it('送信時に clientId を localStorage へ保存する', async () => {
    const fetchSpy = okFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const m = await import('./sheets');
    await m.logCheckIn(
      { mode: 'office', band: 'full', state: 'checkedIn', time: '9:42' },
      'はる',
    );
    expect(localStorage.getItem('seed.clientId')).toBeTruthy();
  });

  it('syncHistoryOnce は履歴を送信し、済みフラグを立てる', async () => {
    const fetchSpy = okFetch();
    vi.stubGlobal('fetch', fetchSpy);
    const m = await import('./sheets');
    await m.syncHistoryOnce('はる');
    expect(localStorage.getItem('seed.history.synced.v1')).toBeTruthy();
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(14);
  });

  it('既にシード済みなら syncHistoryOnce は何もしない', async () => {
    const fetchSpy = okFetch();
    vi.stubGlobal('fetch', fetchSpy);
    localStorage.setItem('seed.history.synced.v1', '2026-05-01T00:00:00.000Z');
    const m = await import('./sheets');
    await m.syncHistoryOnce('はる');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resetHistorySeed はシードフラグを消す', async () => {
    localStorage.setItem('seed.history.synced.v1', 'x');
    const m = await import('./sheets');
    m.resetHistorySeed();
    expect(localStorage.getItem('seed.history.synced.v1')).toBeNull();
  });
});
