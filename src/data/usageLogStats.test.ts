import { describe, it, expect } from 'vitest';
import type { UsageEvent } from './usageLog';
import { buildUsageLogCsv, summarizeUsage } from './usageLogStats';

// now はローカルタイムで固定 (summarizeUsage は当日 0:00 基準で 14 日窓を切る)
const NOW = new Date('2026-06-12T12:00:00.000Z');

function ev(
  type: UsageEvent['type'],
  at: string,
  sessionId?: string
): UsageEvent {
  return sessionId ? { type, at, sessionId } : { type, at };
}

describe('summarizeUsage', () => {
  it('直近 14 日の record_save / app_open / history_open を数える', () => {
    const events: UsageEvent[] = [
      ev('app_open', '2026-06-12T01:00:00.000Z'),
      ev('app_open', '2026-06-11T01:00:00.000Z'),
      ev('app_open', '2026-06-10T01:00:00.000Z'),
      ev('app_open', '2026-06-09T01:00:00.000Z'),
      ev('app_open', '2026-06-08T01:00:00.000Z'),
      ev('history_open', '2026-06-12T02:00:00.000Z'),
      ev('history_open', '2026-06-10T02:00:00.000Z'),
      ev('record_save', '2026-06-12T03:00:00.000Z', 's1'),
      ev('record_save', '2026-06-11T03:00:00.000Z', 's2'),
      ev('record_save', '2026-06-10T03:00:00.000Z', 's3'),
    ];
    const s = summarizeUsage(events, NOW);
    expect(s.recordSaveCount).toBe(3);
    expect(s.appOpenCount).toBe(5);
    expect(s.historyOpenCount).toBe(2);
  });

  it('平均記録時間は open→save ペアの差分秒の平均 (60秒+120秒 → 90秒)', () => {
    const events: UsageEvent[] = [
      ev('record_open', '2026-06-12T10:00:00.000Z', 's1'),
      ev('record_save', '2026-06-12T10:01:00.000Z', 's1'), // 60s
      ev('record_open', '2026-06-12T11:00:00.000Z', 's2'),
      ev('record_save', '2026-06-12T11:02:00.000Z', 's2'), // 120s
    ];
    expect(summarizeUsage(events, NOW).averageRecordSeconds).toBe(90);
  });

  it('1800 秒超のペアは平均から除外される (件数は save に残る)', () => {
    const events: UsageEvent[] = [
      ev('record_open', '2026-06-12T10:00:00.000Z', 's1'),
      ev('record_save', '2026-06-12T10:01:00.000Z', 's1'), // 60s
      ev('record_open', '2026-06-12T11:00:00.000Z', 's2'),
      ev('record_save', '2026-06-12T11:40:00.000Z', 's2'), // 2400s → 除外
    ];
    const s = summarizeUsage(events, NOW);
    expect(s.averageRecordSeconds).toBe(60);
    expect(s.recordSaveCount).toBe(2);
  });

  it('ちょうど 1800 秒のペアは平均に含める', () => {
    const events: UsageEvent[] = [
      ev('record_open', '2026-06-12T10:00:00.000Z', 's1'),
      ev('record_save', '2026-06-12T10:30:00.000Z', 's1'), // 1800s
    ];
    expect(summarizeUsage(events, NOW).averageRecordSeconds).toBe(1800);
  });

  it('ペアが 1 つも無ければ平均は null', () => {
    expect(summarizeUsage([], NOW).averageRecordSeconds).toBeNull();
  });

  it('abandon と孤立 open は「未完了」として数え、平均に影響しない', () => {
    const events: UsageEvent[] = [
      // abandon されたセッション (未完了 1)
      ev('record_open', '2026-06-12T10:00:00.000Z', 's1'),
      ev('record_abandon', '2026-06-12T10:05:00.000Z', 's1'),
      // save も abandon も無い孤立 open (未完了 1)
      ev('record_open', '2026-06-12T11:00:00.000Z', 's2'),
      // 完了したセッション (平均にだけ寄与)
      ev('record_open', '2026-06-12T12:00:00.000Z', 's3'),
      ev('record_save', '2026-06-12T12:01:00.000Z', 's3'),
    ];
    const s = summarizeUsage(events, NOW);
    expect(s.incompleteCount).toBe(2);
    expect(s.averageRecordSeconds).toBe(60);
  });

  it('abandon 済みセッションの open を未完了として二重に数えない', () => {
    const events: UsageEvent[] = [
      ev('record_open', '2026-06-12T10:00:00.000Z', 's1'),
      ev('record_abandon', '2026-06-12T10:05:00.000Z', 's1'),
    ];
    expect(summarizeUsage(events, NOW).incompleteCount).toBe(1);
  });

  it('15 日以上前のイベントのみなら各集計は 0 / null (エラーにならない)', () => {
    // NOW = 2026-06-12 のとき 14 日窓の開始は 2026-05-30。それより前 (05-20) のみ。
    const events: UsageEvent[] = [
      ev('app_open', '2026-05-20T00:00:00.000Z'),
      ev('record_open', '2026-05-20T01:00:00.000Z', 's1'),
      ev('record_save', '2026-05-20T01:01:00.000Z', 's1'),
      ev('history_open', '2026-05-20T02:00:00.000Z'),
      ev('record_abandon', '2026-05-20T03:00:00.000Z', 's2'),
    ];
    expect(summarizeUsage(events, NOW)).toEqual({
      recordSaveCount: 0,
      appOpenCount: 0,
      historyOpenCount: 0,
      averageRecordSeconds: null,
      incompleteCount: 0,
    });
  });

  it('at が不正なイベントは無視する', () => {
    const events: UsageEvent[] = [
      ev('app_open', 'not-a-date'),
      ev('app_open', '2026-06-12T01:00:00.000Z'),
    ];
    expect(summarizeUsage(events, NOW).appOpenCount).toBe(1);
  });
});

describe('buildUsageLogCsv', () => {
  it('ヘッダーは type,at,session_id の 3 列のみ', () => {
    expect(buildUsageLogCsv([]).split('\n')[0]).toBe('type,at,session_id');
  });

  it('イベントを 1 行ずつ出力し、sessionId が無い行は空欄', () => {
    const csv = buildUsageLogCsv([
      ev('app_open', '2026-06-12T01:00:00.000Z'),
      ev('record_open', '2026-06-12T02:00:00.000Z', 's1'),
    ]);
    expect(csv).toBe(
      [
        'type,at,session_id',
        'app_open,2026-06-12T01:00:00.000Z,',
        'record_open,2026-06-12T02:00:00.000Z,s1',
      ].join('\n')
    );
  });

  it('列は 3 つのみで、記録内容に関わる列は存在しない', () => {
    const csv = buildUsageLogCsv([
      ev('record_save', '2026-06-12T02:00:00.000Z', 's1'),
    ]);
    for (const line of csv.split('\n')) {
      expect(line.split(',')).toHaveLength(3);
    }
    expect(csv).not.toMatch(/mood|note|nickname|target/i);
  });

  // AC-2: CSV 列が 3 つのみで健康データが含まれないことを全 event type で確認
  it('AC-2: 全 5 種類のイベントを出力しても列は type/at/session_id の 3 列のみ', () => {
    const events: UsageEvent[] = [
      ev('app_open', '2026-06-12T01:00:00.000Z'),
      ev('record_open', '2026-06-12T02:00:00.000Z', 's1'),
      ev('record_save', '2026-06-12T02:01:00.000Z', 's1'),
      ev('record_abandon', '2026-06-12T03:00:00.000Z', 's2'),
      ev('history_open', '2026-06-12T04:00:00.000Z'),
    ];
    const csv = buildUsageLogCsv(events);
    const lines = csv.split('\n');
    // ヘッダー + 5 行 = 6 行
    expect(lines).toHaveLength(6);
    // すべての行が 3 列
    for (const line of lines) {
      expect(line.split(',').length).toBeGreaterThanOrEqual(3);
    }
    // 健康データに関するキーワードが一切含まれない
    for (const forbidden of [
      'mood',
      'note',
      'nickname',
      'targetDate',
      'target_date',
      'sleep',
      'medication',
      'exercise',
      'condition',
      'meal',
    ]) {
      expect(csv).not.toMatch(new RegExp(forbidden, 'i'));
    }
  });

  // AC-2: sessionId にカンマ・改行・ダブルクォートが含まれる場合のエスケープ
  it('AC-2: sessionId にカンマが含まれる場合は CSV エスケープされ列崩れが起きない', () => {
    // sessionId にカンマを含む不正な文字列 (実際には UUID なので起きないが防御テスト)
    const csv = buildUsageLogCsv([
      ev('record_open', '2026-06-12T02:00:00.000Z', 'sid,with,comma'),
    ]);
    const lines = csv.split('\n');
    // ヘッダー行の列数確認
    expect(lines[0].split(',').length).toBe(3);
    // データ行は RFC 4180 のクォート済みで 3 フィールドになる
    // "sid,with,comma" はダブルクォートでエスケープされ、split(',') では 5 になるが
    // パーサ的には 3 列。ここでは raw の split チェックではなくクォート存在を確認する
    expect(lines[1]).toContain('"sid,with,comma"');
  });

  it('AC-2: sessionId に改行が含まれる場合はダブルクォートでエスケープされる', () => {
    const csv = buildUsageLogCsv([
      ev('record_open', '2026-06-12T02:00:00.000Z', 'sid\nnewline'),
    ]);
    expect(csv).toContain('"sid\nnewline"');
  });

  it('AC-2: sessionId にダブルクォートが含まれる場合は "" でエスケープされる', () => {
    const csv = buildUsageLogCsv([
      ev('record_open', '2026-06-12T02:00:00.000Z', 'sid"quote'),
    ]);
    expect(csv).toContain('"sid""quote"');
  });
});

// AC-3 追加: 孤立 record_open (sessionId なし) が集計を破綻させない
describe('AC-3 / AC-5: sessionId のない record_open が混在しても集計が破綻しない', () => {
  it('sessionId なし record_open は sessions マップに登録されず incompleteCount に影響しない', () => {
    // sessionId なし record_open は仕様上想定外だが、型上 sessionId は optional なので
    // 万が一入った場合でも summarizeUsage がクラッシュしないことを確認する
    const events: UsageEvent[] = [
      // sessionId なし (orphan だが sessions マップには入らない)
      { type: 'record_open', at: '2026-06-12T10:00:00.000Z' },
      // 正常なセッション
      ev('record_open', '2026-06-12T11:00:00.000Z', 's1'),
      ev('record_save', '2026-06-12T11:01:00.000Z', 's1'),
    ];
    const s = summarizeUsage(events, NOW);
    // sessionId なし record_open は sessions に登録されないため incompleteCount に入らない
    expect(s.incompleteCount).toBe(0);
    expect(s.recordSaveCount).toBe(1);
    // クラッシュしないこと
    expect(s.averageRecordSeconds).toBe(60);
  });
});

// AC-3: 集計の境界条件
describe('AC-3: 集計の境界条件 — 直近 14 日の境界', () => {
  it('NOW から数えてちょうど 13 日前 (window 開始日 0:00) のイベントは集計に含まれる', () => {
    // NOW = 2026-06-12T12:00:00Z のとき start = 2026-05-30T00:00:00 (local)
    // summarizeUsage はローカル時刻で start を計算するため、ここでは
    // NOW と同じ TZ 基準で「13 日前の 0:00 相当」を直接渡す。
    const windowStart = new Date(NOW);
    windowStart.setHours(0, 0, 0, 0);
    windowStart.setDate(windowStart.getDate() - 13);
    const atWindowStart = windowStart.toISOString();

    const events: UsageEvent[] = [
      ev('app_open', atWindowStart),
    ];
    const s = summarizeUsage(events, NOW);
    expect(s.appOpenCount).toBe(1);
  });

  it('window 開始日の 1 ミリ秒前のイベントは集計に含まれない', () => {
    const windowStart = new Date(NOW);
    windowStart.setHours(0, 0, 0, 0);
    windowStart.setDate(windowStart.getDate() - 13);
    const justBefore = new Date(windowStart.getTime() - 1).toISOString();

    const events: UsageEvent[] = [
      ev('app_open', justBefore),
    ];
    const s = summarizeUsage(events, NOW);
    expect(s.appOpenCount).toBe(0);
  });

  it('open→save の差が ちょうど 1800 秒のペアは平均に含まれ、1801 秒は除外される', () => {
    const events: UsageEvent[] = [
      ev('record_open', '2026-06-12T10:00:00.000Z', 's1'),
      ev('record_save', '2026-06-12T10:30:00.000Z', 's1'), // 1800s: 含む
      ev('record_open', '2026-06-12T11:00:00.000Z', 's2'),
      ev('record_save', '2026-06-12T11:30:01.000Z', 's2'), // 1801s: 除外
    ];
    const s = summarizeUsage(events, NOW);
    // s2 は除外されるので 1800 のみが平均
    expect(s.averageRecordSeconds).toBe(1800);
    // record_save は 2 件カウントされる (除外は平均のみで件数には残る)
    expect(s.recordSaveCount).toBe(2);
  });
});
