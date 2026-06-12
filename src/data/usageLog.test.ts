import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  USAGE_LOG_KEY,
  USAGE_LOG_MAX_EVENTS,
  appendUsageEvent,
  beginRecordSession,
  clearUsageLog,
  endRecordSession,
  listUsageEvents,
} from './usageLog';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-12T10:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('appendUsageEvent / listUsageEvents', () => {
  it('append で type/at が記録され、list で取り出せる', () => {
    appendUsageEvent('app_open');
    expect(listUsageEvents()).toEqual([
      { type: 'app_open', at: '2026-06-12T10:00:00.000Z' },
    ]);
  });

  it('sessionId を渡したときだけ sessionId が付く', () => {
    appendUsageEvent('record_open', 'sid1');
    appendUsageEvent('history_open');
    const [a, b] = listUsageEvents();
    expect(a).toEqual({
      type: 'record_open',
      at: '2026-06-12T10:00:00.000Z',
      sessionId: 'sid1',
    });
    expect('sessionId' in b).toBe(false);
  });

  it('イベントは type/at/sessionId 以外のフィールドを持たない', () => {
    appendUsageEvent('record_open', 'sid1');
    appendUsageEvent('app_open');
    const raw = JSON.parse(localStorage.getItem(USAGE_LOG_KEY)!) as Record<
      string,
      unknown
    >[];
    for (const ev of raw) {
      for (const key of Object.keys(ev)) {
        expect(['type', 'at', 'sessionId']).toContain(key);
      }
    }
  });

  it('2000 件を超えると古いものから FIFO で破棄される', () => {
    const many = Array.from({ length: USAGE_LOG_MAX_EVENTS }, (_, i) => ({
      type: 'app_open',
      at: `2026-01-01T00:00:${(i % 60).toString().padStart(2, '0')}.000Z`,
    }));
    localStorage.setItem(USAGE_LOG_KEY, JSON.stringify(many));
    appendUsageEvent('history_open');
    const events = listUsageEvents();
    expect(events).toHaveLength(USAGE_LOG_MAX_EVENTS);
    expect(events[events.length - 1].type).toBe('history_open');
    // 先頭 (最古) の 1 件が落ちている
    expect(events[0].at).toBe(many[1].at);
  });

  it('キーが無いときは空配列', () => {
    expect(listUsageEvents()).toEqual([]);
  });

  it('壊れた JSON / 配列でない値は空配列として読み捨てる', () => {
    localStorage.setItem(USAGE_LOG_KEY, '{broken');
    expect(listUsageEvents()).toEqual([]);
    localStorage.setItem(USAGE_LOG_KEY, JSON.stringify({ not: 'array' }));
    expect(listUsageEvents()).toEqual([]);
  });

  it('type 不明・形式不正な要素は除外し、有効分のみ返す', () => {
    localStorage.setItem(
      USAGE_LOG_KEY,
      JSON.stringify([
        { type: 'app_open', at: '2026-06-10T00:00:00.000Z' },
        { type: 'unknown_event', at: '2026-06-10T00:00:01.000Z' },
        { type: 'record_save' }, // at 欠落
        null,
        'string',
        { type: 'history_open', at: '2026-06-10T00:00:02.000Z', extra: 'x' },
      ])
    );
    const events = listUsageEvents();
    expect(events).toEqual([
      { type: 'app_open', at: '2026-06-10T00:00:00.000Z' },
      { type: 'history_open', at: '2026-06-10T00:00:02.000Z' },
    ]);
    // 余計なフィールドは正規化で剥がれる
    expect('extra' in events[1]).toBe(false);
  });
});

describe('clearUsageLog', () => {
  it('キーごと削除され、list は空になる', () => {
    appendUsageEvent('app_open');
    clearUsageLog();
    expect(localStorage.getItem(USAGE_LOG_KEY)).toBeNull();
    expect(listUsageEvents()).toEqual([]);
  });
});

// ── AC-5 追加エッジケース ──────────────────────────────────────

describe('AC-5: private mode (setItem が throw) でも例外が表面化しない', () => {
  it('appendUsageEvent は saveJson が throw しても例外を外に出さない', () => {
    // storage.ts の saveJson は try/catch で囲んでいるため、
    // localStorage.setItem を throw させても appendUsageEvent が catch せず
    // 呼び出し元に例外が伝播しないことを確認する。
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
    try {
      expect(() => appendUsageEvent('app_open')).not.toThrow();
      expect(() => appendUsageEvent('record_open', 'sid')).not.toThrow();
      expect(() => beginRecordSession()).not.toThrow();
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it('clearUsageLog は removeItem が throw しても例外を外に出さない', () => {
    const removeSpy = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new DOMException('SecurityError');
      });
    try {
      expect(() => clearUsageLog()).not.toThrow();
    } finally {
      removeSpy.mockRestore();
    }
  });

  it('listUsageEvents は getItem が throw しても例外を外に出さず空配列を返す', () => {
    // loadJson は try/catch 内で getItem を呼ぶので、throw しても fallback を返す。
    const getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new DOMException('SecurityError');
      });
    try {
      expect(() => listUsageEvents()).not.toThrow();
      expect(listUsageEvents()).toEqual([]);
    } finally {
      getItemSpy.mockRestore();
    }
  });
});

describe('AC-5: 2000 件到達後に saveJson が quota エラーを出しても appendUsageEvent が例外を外に出さない', () => {
  it('上限 + 1 件目の setItem が quota エラーを throw しても呼び出し元がクラッシュしない', () => {
    // 2000 件をセット
    const many = Array.from({ length: USAGE_LOG_MAX_EVENTS }, (_, i) => ({
      type: 'app_open',
      at: `2026-01-01T00:00:${(i % 60).toString().padStart(2, '0')}.000Z`,
    }));
    localStorage.setItem(USAGE_LOG_KEY, JSON.stringify(many));

    // 2001 件目で setItem を quota エラーにする
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
    try {
      expect(() => appendUsageEvent('history_open')).not.toThrow();
    } finally {
      setItemSpy.mockRestore();
    }
  });
});

describe('AC-1: record_abandon が save 後に呼ばれても二重記録しない (endRecordSession)', () => {
  it('save → abandon → save の順でも events は open+save の 2 件のみ', () => {
    const sid = beginRecordSession();
    endRecordSession(sid, 'save');
    // save 後に abandon が来ても no-op
    endRecordSession(sid, 'abandon');
    // さらに save が来ても no-op
    endRecordSession(sid, 'save');
    const events = listUsageEvents();
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.type)).toEqual(['record_open', 'record_save']);
    expect(events.filter((e) => e.type === 'record_abandon')).toHaveLength(0);
  });

  it('abandon → save の順でも events は open+abandon の 2 件のみ (save が来ても no-op)', () => {
    const sid = beginRecordSession();
    endRecordSession(sid, 'abandon');
    endRecordSession(sid, 'save');
    const events = listUsageEvents();
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.type)).toEqual([
      'record_open',
      'record_abandon',
    ]);
  });
});

describe('AC-2: appendUsageEvent の引数に健康データ値が混入しないことを型で保証する', () => {
  it('appendUsageEvent に渡せるのは UsageEventType と省略可能な sessionId のみ — 生 JSON に余計フィールドがない', () => {
    // 正常系: 健康データなし
    appendUsageEvent('record_save', 'sid-clean');
    const raw = JSON.parse(
      localStorage.getItem(USAGE_LOG_KEY) ?? '[]'
    ) as Record<string, unknown>[];
    expect(raw).toHaveLength(1);
    const keys = Object.keys(raw[0]);
    // type / at / sessionId 以外のフィールドが存在しないこと
    expect(keys.every((k) => ['type', 'at', 'sessionId'].includes(k))).toBe(
      true
    );
    // mood / note / nickname / targetDate 等が一切含まれないこと
    const rawStr = JSON.stringify(raw[0]);
    for (const forbidden of [
      'mood',
      'note',
      'nickname',
      'targetDate',
      'target_date',
      'sleep',
      'medication',
    ]) {
      expect(rawStr).not.toContain(forbidden);
    }
  });
});

describe('AC-5: saveJson 呼び出し時に例外が起きても listUsageEvents が有効分を返す (readは別トランザクション)', () => {
  it('saveJson が途中で失敗してもそれ以前の有効データは listUsageEvents で読める', () => {
    // まず 1 件正常に保存
    appendUsageEvent('app_open');
    const before = listUsageEvents();
    expect(before).toHaveLength(1);

    // 次の setItem が失敗するようにモック
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        throw new DOMException('QuotaExceededError');
      });
    try {
      appendUsageEvent('history_open'); // この追記は失敗する
    } finally {
      setItemSpy.mockRestore();
    }

    // 失敗した追記の前のデータは保持されている
    expect(listUsageEvents()).toHaveLength(1);
    expect(listUsageEvents()[0].type).toBe('app_open');
  });
});

describe('beginRecordSession / endRecordSession', () => {
  it('begin で record_open が sessionId 付きで記録され、ID が返る', () => {
    const sid = beginRecordSession();
    expect(sid).toBeTruthy();
    expect(listUsageEvents()).toEqual([
      { type: 'record_open', at: '2026-06-12T10:00:00.000Z', sessionId: sid },
    ]);
  });

  it('begin は呼ぶたびに異なる sessionId を発番する', () => {
    expect(beginRecordSession()).not.toBe(beginRecordSession());
  });

  it("end('save') で同じ sessionId の record_save が記録される", () => {
    const sid = beginRecordSession();
    endRecordSession(sid, 'save');
    const events = listUsageEvents();
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ type: 'record_save', sessionId: sid });
  });

  it("end('abandon') で record_abandon が記録される", () => {
    const sid = beginRecordSession();
    endRecordSession(sid, 'abandon');
    expect(listUsageEvents()[1]).toMatchObject({
      type: 'record_abandon',
      sessionId: sid,
    });
  });

  it('同一セッションへの二重 end は no-op (save 後の abandon を防ぐ)', () => {
    const sid = beginRecordSession();
    endRecordSession(sid, 'save');
    endRecordSession(sid, 'abandon');
    endRecordSession(sid, 'save');
    const events = listUsageEvents();
    expect(events).toHaveLength(2);
    expect(events.filter((e) => e.type === 'record_abandon')).toHaveLength(0);
  });

  it('crypto.randomUUID が無くてもフォールバックで ID を発番できる', () => {
    const spy = vi
      .spyOn(crypto, 'randomUUID')
      .mockImplementation((() => {
        throw new Error('unavailable');
      }) as never);
    try {
      const sid = beginRecordSession();
      expect(sid).toBeTruthy();
      expect(listUsageEvents()[0].sessionId).toBe(sid);
    } finally {
      spy.mockRestore();
    }
  });
});
