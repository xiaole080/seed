import { describe, it, expect } from 'vitest';
import {
  shiftISO,
  rangeFor,
  inRange,
  monthsInRange,
  filterDailyByRange,
  filterAttendanceByRange,
  countRecordedDaysInRange,
  moodSeries,
  averageMood,
  influenceRanking,
  classifyAttendance,
  attendanceSummary,
  frequency,
  averageTime,
  sleepStats,
  mealStats,
  exerciseStats,
  conditionStats,
  medicationStats,
  rangeOverview,
} from './historyStats';
import type { StoredDailyRecord } from './store';
import type { AttendanceMonthlyRecord, MissingnessFlags, Mood } from './types';

const NO_MISSING: MissingnessFlags = {
  noRecord: false,
  skippedMood: false,
  skippedPrimaryInfluence: false,
  skippedSleep: false,
  skippedMeal: false,
  skippedExercise: false,
  skippedCondition: false,
  skippedMedication: false,
  skippedAttendance: false,
  skippedNote: false,
};

function daily(
  date: string,
  over: Partial<StoredDailyRecord> = {},
): StoredDailyRecord {
  return {
    localRecordId: `r_${date}`,
    date,
    mood: 3,
    primaryInfluence: [],
    missingness: { ...NO_MISSING },
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...over,
  };
}

function att(
  date: string,
  over: Partial<AttendanceMonthlyRecord> = {},
): AttendanceMonthlyRecord {
  return {
    localAttendanceId: `att_${date}`,
    date,
    weekday: 'Mon',
    plannedMode: 'office',
    missingClock: false,
    edited: false,
    exportMonth: date.slice(0, 7),
    ...over,
  };
}

describe('shiftISO', () => {
  it('日数を加減算する', () => {
    expect(shiftISO('2026-05-23', -6)).toBe('2026-05-17');
    expect(shiftISO('2026-05-23', 0)).toBe('2026-05-23');
    expect(shiftISO('2026-05-23', 8)).toBe('2026-05-31');
  });

  it('月またぎ・年またぎを正しく扱う', () => {
    expect(shiftISO('2026-05-01', -1)).toBe('2026-04-30');
    expect(shiftISO('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftISO('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('うるう年・非うるう年の2月末を正しく扱う', () => {
    expect(shiftISO('2024-02-28', 1)).toBe('2024-02-29'); // うるう年
    expect(shiftISO('2026-02-28', 1)).toBe('2026-03-01'); // 非うるう年
    expect(shiftISO('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('大きな日数オフセットでも破綻しない', () => {
    expect(shiftISO('2026-05-23', 365)).toBe('2027-05-23');
    expect(shiftISO('2026-05-23', -365)).toBe('2025-05-23');
  });
});

describe('rangeFor', () => {
  it('7d は今日を含む過去7日', () => {
    expect(rangeFor('7d', '2026-05-23')).toEqual({
      start: '2026-05-17',
      end: '2026-05-23',
    });
  });

  it('14d は今日を含む過去14日', () => {
    expect(rangeFor('14d', '2026-05-23')).toEqual({
      start: '2026-05-10',
      end: '2026-05-23',
    });
  });

  it('month は当月1日〜今日', () => {
    expect(rangeFor('month', '2026-05-23')).toEqual({
      start: '2026-05-01',
      end: '2026-05-23',
    });
  });

  it('月初に 14d を選ぶと前月にまたがる', () => {
    expect(rangeFor('14d', '2026-05-03')).toEqual({
      start: '2026-04-20',
      end: '2026-05-03',
    });
  });

  it('年初に 7d を選ぶと前年にまたがる', () => {
    expect(rangeFor('7d', '2026-01-03')).toEqual({
      start: '2025-12-28',
      end: '2026-01-03',
    });
  });

  it('today がそのまま月初のとき month は1日のみ', () => {
    expect(rangeFor('month', '2026-05-01')).toEqual({
      start: '2026-05-01',
      end: '2026-05-01',
    });
  });
});

describe('inRange', () => {
  const range = { start: '2026-05-17', end: '2026-05-23' };
  it('両端を含む', () => {
    expect(inRange('2026-05-17', range)).toBe(true);
    expect(inRange('2026-05-23', range)).toBe(true);
  });
  it('範囲外は false', () => {
    expect(inRange('2026-05-16', range)).toBe(false);
    expect(inRange('2026-05-24', range)).toBe(false);
  });
});

describe('monthsInRange', () => {
  it('単月', () => {
    expect(monthsInRange({ start: '2026-05-01', end: '2026-05-23' })).toEqual([
      '2026-05',
    ]);
  });
  it('月またぎ', () => {
    expect(monthsInRange({ start: '2026-04-28', end: '2026-05-05' })).toEqual([
      '2026-04',
      '2026-05',
    ]);
  });
  it('年またぎ', () => {
    expect(monthsInRange({ start: '2025-12-28', end: '2026-01-03' })).toEqual([
      '2025-12',
      '2026-01',
    ]);
  });

  it('start と end が同じ月なら1要素', () => {
    expect(monthsInRange({ start: '2026-05-23', end: '2026-05-23' })).toEqual([
      '2026-05',
    ]);
  });

  it('12か月を超える長期レンジでも全月を列挙する', () => {
    const out = monthsInRange({ start: '2025-01-15', end: '2026-02-10' });
    expect(out).toHaveLength(14);
    expect(out[0]).toBe('2025-01');
    expect(out[out.length - 1]).toBe('2026-02');
  });
});

describe('filterDailyByRange', () => {
  it('期間内のみを日付昇順で返す', () => {
    const recs = [
      daily('2026-05-25'),
      daily('2026-05-18'),
      daily('2026-05-10'),
      daily('2026-05-20'),
    ];
    const out = filterDailyByRange(recs, {
      start: '2026-05-17',
      end: '2026-05-23',
    });
    expect(out.map((r) => r.date)).toEqual(['2026-05-18', '2026-05-20']);
  });
});

describe('filterAttendanceByRange', () => {
  it('期間内のみを返す', () => {
    const recs = [att('2026-05-10'), att('2026-05-20'), att('2026-05-30')];
    const out = filterAttendanceByRange(recs, {
      start: '2026-05-15',
      end: '2026-05-25',
    });
    expect(out.map((r) => r.date)).toEqual(['2026-05-20']);
  });

  it('同じ日付が重複したら後勝ちで1件に集約する', () => {
    const recs = [
      att('2026-05-20', { checkIn: '09:00' }),
      att('2026-05-20', { checkIn: '10:00' }),
    ];
    const out = filterAttendanceByRange(recs, {
      start: '2026-05-01',
      end: '2026-05-31',
    });
    expect(out).toHaveLength(1);
    expect(out[0].checkIn).toBe('10:00');
  });
});

describe('countRecordedDaysInRange', () => {
  it('ユニークな日数を数える', () => {
    expect(
      countRecordedDaysInRange([
        daily('2026-05-20'),
        daily('2026-05-21'),
        daily('2026-05-21'),
      ]),
    ).toBe(2);
  });

  it('空配列は 0', () => {
    expect(countRecordedDaysInRange([])).toBe(0);
  });
});

describe('moodSeries', () => {
  it('気分を記録した日のみを時系列で返す', () => {
    const out = moodSeries([
      daily('2026-05-20', { mood: 4 }),
      daily('2026-05-18', { mood: 2 }),
    ]);
    expect(out).toEqual([
      { date: '2026-05-18', mood: 2 },
      { date: '2026-05-20', mood: 4 },
    ]);
  });

  it('skippedMood の日は除外する', () => {
    const out = moodSeries([
      daily('2026-05-20', { mood: 4 }),
      daily('2026-05-21', {
        mood: 3,
        missingness: { ...NO_MISSING, skippedMood: true },
      }),
    ]);
    expect(out.map((p) => p.date)).toEqual(['2026-05-20']);
  });

  it('1〜5 の範囲外の壊れた mood は除外する', () => {
    const out = moodSeries([
      daily('2026-05-20', { mood: 4 }),
      daily('2026-05-21', { mood: 0 as Mood }),
      daily('2026-05-22', { mood: 9 as Mood }),
    ]);
    expect(out).toHaveLength(1);
  });

  it('記録1件のみでも安全に返す (point 1つ)', () => {
    const out = moodSeries([daily('2026-05-20', { mood: 5 })]);
    expect(out).toEqual([{ date: '2026-05-20', mood: 5 }]);
  });

  it('空配列は空配列 (例外を投げない)', () => {
    expect(moodSeries([])).toEqual([]);
  });

  it('missingness が undefined でも除外せず扱える', () => {
    const rec = daily('2026-05-20', { mood: 4 });
    // 破損データ相当: missingness を消す
    delete (rec as Partial<StoredDailyRecord>).missingness;
    const out = moodSeries([rec]);
    expect(out).toEqual([{ date: '2026-05-20', mood: 4 }]);
  });

  it('NaN の mood は範囲チェックで除外される', () => {
    const out = moodSeries([daily('2026-05-20', { mood: NaN as unknown as Mood })]);
    expect(out).toEqual([]);
  });
});

describe('averageMood', () => {
  it('記録した日だけで平均する (未記録日を0扱いしない)', () => {
    expect(
      averageMood([
        daily('2026-05-20', { mood: 3 }),
        daily('2026-05-21', { mood: 4 }),
      ]),
    ).toBe(3.5);
  });

  it('小数第1位に丸める', () => {
    expect(
      averageMood([
        daily('2026-05-20', { mood: 1 }),
        daily('2026-05-21', { mood: 2 }),
        daily('2026-05-22', { mood: 4 }),
      ]),
    ).toBe(2.3);
  });

  it('記録ゼロは null (NaN を返さない)', () => {
    expect(averageMood([])).toBeNull();
  });

  it('skippedMood しかなければ null', () => {
    expect(
      averageMood([
        daily('2026-05-20', {
          missingness: { ...NO_MISSING, skippedMood: true },
        }),
      ]),
    ).toBeNull();
  });

  it('記録1件のみならその値を返す (除算エラーにならない)', () => {
    expect(averageMood([daily('2026-05-20', { mood: 4 })])).toBe(4);
  });

  it('全日同じ気分なら丸めずその値', () => {
    expect(
      averageMood([
        daily('2026-05-20', { mood: 3 }),
        daily('2026-05-21', { mood: 3 }),
        daily('2026-05-22', { mood: 3 }),
      ]),
    ).toBe(3);
  });
});

describe('influenceRanking', () => {
  it('頻度降順で集計する', () => {
    const out = influenceRanking([
      daily('2026-05-20', { primaryInfluence: ['sleep', 'fatigue'] }),
      daily('2026-05-21', { primaryInfluence: ['sleep'] }),
      daily('2026-05-22', { primaryInfluence: ['sleep', 'money'] }),
    ]);
    expect(out[0]).toEqual({ id: 'sleep', count: 3 });
    expect(out.map((c) => c.count)).toEqual([3, 1, 1]);
  });

  it('同数は最初に出現した順 (安定ソート)', () => {
    const out = influenceRanking([
      daily('2026-05-20', { primaryInfluence: ['fatigue', 'money'] }),
    ]);
    expect(out.map((c) => c.id)).toEqual(['fatigue', 'money']);
  });

  it('影響要因の記録が無ければ空配列', () => {
    expect(influenceRanking([daily('2026-05-20')])).toEqual([]);
  });

  it('primaryInfluence が undefined の日があっても落ちない', () => {
    const rec = daily('2026-05-20', { primaryInfluence: ['sleep'] });
    const broken = daily('2026-05-21');
    delete (broken as Partial<StoredDailyRecord>).primaryInfluence;
    const out = influenceRanking([rec, broken]);
    expect(out).toEqual([{ id: 'sleep', count: 1 }]);
  });

  it('空配列は空配列', () => {
    expect(influenceRanking([])).toEqual([]);
  });
});

describe('classifyAttendance', () => {
  it('実績 (checkIn など) があれば attended', () => {
    expect(classifyAttendance(att('2026-05-20', { checkIn: '09:00' }))).toBe(
      'attended',
    );
    expect(
      classifyAttendance(att('2026-05-20', { actualMode: 'home' })),
    ).toBe('attended');
  });

  it('予定が休みなら off', () => {
    expect(
      classifyAttendance(att('2026-05-20', { plannedMode: 'off' })),
    ).toBe('off');
  });

  it('予定ありで打刻欠落なら unclocked (欠席と断定しない)', () => {
    expect(
      classifyAttendance(
        att('2026-05-20', { plannedMode: 'office', missingClock: true }),
      ),
    ).toBe('unclocked');
  });

  it('予定ありで実績未確定なら planned', () => {
    expect(
      classifyAttendance(
        att('2026-05-20', { plannedMode: 'office', missingClock: false }),
      ),
    ).toBe('planned');
  });

  it('checkOut だけでも実績ありとして attended', () => {
    expect(
      classifyAttendance(att('2026-05-20', { checkOut: '15:00' })),
    ).toBe('attended');
  });

  it('plannedMode が undefined なら off 扱い', () => {
    const rec = att('2026-05-20');
    delete (rec as Partial<AttendanceMonthlyRecord>).plannedMode;
    expect(classifyAttendance(rec)).toBe('off');
  });

  it('在宅予定で実績ありなら attended (在宅も実績に含む)', () => {
    expect(
      classifyAttendance(
        att('2026-05-20', { plannedMode: 'home', actualMode: 'home' }),
      ),
    ).toBe('attended');
  });
});

describe('attendanceSummary', () => {
  it('状態ごとに件数を集計する', () => {
    const s = attendanceSummary([
      att('2026-05-20', { checkIn: '09:00' }),
      att('2026-05-21', { plannedMode: 'off' }),
      att('2026-05-22', { plannedMode: 'office', missingClock: true }),
      att('2026-05-23', { plannedMode: 'office', missingClock: false }),
    ]);
    expect(s.attended).toBe(1);
    expect(s.off).toBe(1);
    expect(s.unclocked).toBe(1);
    expect(s.planned).toBe(1);
    expect(s.days).toHaveLength(4);
  });

  it('空配列はすべて 0', () => {
    const s = attendanceSummary([]);
    expect(s).toEqual({
      days: [],
      attended: 0,
      planned: 0,
      off: 0,
      unclocked: 0,
    });
  });
});

describe('frequency', () => {
  it('頻度降順で集計する', () => {
    expect(frequency(['a', 'b', 'a', 'c', 'a'])).toEqual([
      { id: 'a', count: 3 },
      { id: 'b', count: 1 },
      { id: 'c', count: 1 },
    ]);
  });

  it('空配列は空', () => {
    expect(frequency([])).toEqual([]);
  });
});

describe('averageTime', () => {
  it('HH:mm の平均を返す', () => {
    expect(averageTime(['06:00', '08:00'])).toBe('07:00');
    expect(averageTime(['23:00'])).toBe('23:00');
  });

  it('undefined を無視する', () => {
    expect(averageTime([undefined, '07:00', undefined])).toBe('07:00');
  });

  it('1件も無ければ null', () => {
    expect(averageTime([])).toBeNull();
    expect(averageTime([undefined])).toBeNull();
  });

  it('"HH:mm" 両方が NaN になる文字列は無視する', () => {
    // "ab:cd" は h も m も NaN になり Number.isNaN ガードで弾かれる。
    expect(averageTime(['ab:cd', '08:00'])).toBe('08:00');
  });

  it('空文字は無視する (falsy ガード)', () => {
    expect(averageTime(['', '08:00'])).toBe('08:00');
  });

  it('分が欠落/空白の壊れた時刻は無視する (null を返す)', () => {
    // コロン無し "12" は m が undefined → h*60+m が NaN になり弾かれる。
    expect(averageTime(['12'])).toBeNull();
    // 空白 "   " は h が NaN、m が undefined → 合算結果が NaN で弾かれる。
    expect(averageTime(['   '])).toBeNull();
  });

  it('壊れた時刻が混ざっても正常な時刻だけで平均する', () => {
    expect(averageTime(['12', '08:00'])).toBe('08:00');
    expect(averageTime(['   ', '06:00', '08:00'])).toBe('07:00');
  });

  it('日付をまたぐ平均は分の単純平均になる (循環平均はしない)', () => {
    // 23:30(1410) と 00:30(30) の単純平均 = 720分 = 12:00。
    // 仕様上の既知の挙動。回帰検知のために固定しておく。
    expect(averageTime(['23:30', '00:30'])).toBe('12:00');
  });
});

describe('記録項目別の傾向集計', () => {
  it('sleepStats: 睡眠記録のある日のみを母数にする', () => {
    const s = sleepStats([
      daily('2026-05-20', {
        sleep: {
          bedtime: '23:00',
          wakeTime: '07:00',
          sleepIssues: ['bad_dreams'],
          nightAwakenings: 'once',
        },
      }),
      daily('2026-05-21', {
        sleep: { bedtime: '01:00', sleepIssues: ['bad_dreams'] },
      }),
      daily('2026-05-22'), // 睡眠記録なし → 母数外
    ]);
    expect(s.recordedDays).toBe(2);
    // averageTime は分の単純平均: (23:00=1380 + 01:00=60) / 2 = 720分 = 12:00
    expect(s.avgBedtime).toBe('12:00');
    expect(s.issues[0]).toEqual({ id: 'bad_dreams', count: 2 });
    expect(s.awakenings[0]).toEqual({ id: 'once', count: 1 });
  });

  it('mealStats: mealStatus の分布を集計する', () => {
    const s = mealStats([
      daily('2026-05-20', { meal: { mealStatus: 'normal', mealsTaken: {} } }),
      daily('2026-05-21', { meal: { mealStatus: 'less', mealsTaken: {} } }),
      daily('2026-05-22'),
    ]);
    expect(s.recordedDays).toBe(2);
    expect(s.statuses.map((x) => x.id).sort()).toEqual(['less', 'normal']);
  });

  it('exerciseStats: activityFlags の頻度を集計する', () => {
    const s = exerciseStats([
      daily('2026-05-20', { exercise: { activityFlags: ['walk', 'stretch'] } }),
      daily('2026-05-21', { exercise: { activityFlags: ['walk'] } }),
    ]);
    expect(s.recordedDays).toBe(2);
    expect(s.activities[0]).toEqual({ id: 'walk', count: 2 });
  });

  it('conditionStats: conditionFlags の頻度を集計する', () => {
    const s = conditionStats([
      daily('2026-05-20', { condition: { conditionFlags: ['fatigue'] } }),
      daily('2026-05-21', { condition: { conditionFlags: ['none'] } }),
    ]);
    expect(s.recordedDays).toBe(2);
    expect(s.flags.map((x) => x.id).sort()).toEqual(['fatigue', 'none']);
  });

  it('medicationStats: medicationStatus の分布のみを集計する', () => {
    const s = medicationStats([
      daily('2026-05-20', { medication: { medicationStatus: 'as_planned' } }),
      daily('2026-05-21', { medication: { medicationStatus: 'as_planned' } }),
      daily('2026-05-22'),
    ]);
    expect(s.recordedDays).toBe(2);
    expect(s.statuses[0]).toEqual({ id: 'as_planned', count: 2 });
  });

  it('記録が無ければ recordedDays は 0・配列は空', () => {
    expect(sleepStats([]).recordedDays).toBe(0);
    expect(mealStats([]).statuses).toEqual([]);
    expect(exerciseStats([]).activities).toEqual([]);
    expect(conditionStats([]).flags).toEqual([]);
    expect(medicationStats([]).statuses).toEqual([]);
  });

  it('sleepStats: 空配列でも avgBedtime / avgWakeTime は null', () => {
    const s = sleepStats([]);
    expect(s.avgBedtime).toBeNull();
    expect(s.avgWakeTime).toBeNull();
    expect(s.issues).toEqual([]);
    expect(s.awakenings).toEqual([]);
  });

  it('sleepStats: sleep オブジェクトはあるが詳細が空でも落ちない', () => {
    const s = sleepStats([daily('2026-05-20', { sleep: {} })]);
    expect(s.recordedDays).toBe(1);
    expect(s.avgBedtime).toBeNull();
    expect(s.avgWakeTime).toBeNull();
    expect(s.issues).toEqual([]);
    expect(s.awakenings).toEqual([]);
  });

  it('sleepStats: avgWakeTime も平均される', () => {
    const s = sleepStats([
      daily('2026-05-20', { sleep: { wakeTime: '06:00' } }),
      daily('2026-05-21', { sleep: { wakeTime: '08:00' } }),
    ]);
    expect(s.avgWakeTime).toBe('07:00');
  });

  it('mealStats: meal はあるが mealStatus 未設定なら statuses は空', () => {
    const s = mealStats([
      daily('2026-05-20', { meal: { mealsTaken: {} } }),
    ]);
    expect(s.recordedDays).toBe(1);
    expect(s.statuses).toEqual([]);
  });

  it('exerciseStats: activityFlags が空配列でも落ちない', () => {
    const s = exerciseStats([
      daily('2026-05-20', { exercise: { activityFlags: [] } }),
    ]);
    expect(s.recordedDays).toBe(1);
    expect(s.activities).toEqual([]);
  });

  it('conditionStats: 「特になし」(none) も中立に数える', () => {
    const s = conditionStats([
      daily('2026-05-20', { condition: { conditionFlags: ['none'] } }),
      daily('2026-05-21', { condition: { conditionFlags: ['none'] } }),
    ]);
    expect(s.flags).toEqual([{ id: 'none', count: 2 }]);
  });
});

describe('rangeOverview', () => {
  it('期間全体の指標をまとめる', () => {
    const ov = rangeOverview(
      [
        daily('2026-05-20', { mood: 4, primaryInfluence: ['sleep'] }),
        daily('2026-05-21', {
          mood: 2,
          primaryInfluence: ['sleep'],
          sleep: { bedtime: '23:00' },
        }),
      ],
      [att('2026-05-20', { checkIn: '09:00' })],
    );
    expect(ov.recordedDays).toBe(2);
    expect(ov.moodCount).toBe(2);
    expect(ov.averageMood).toBe(3);
    expect(ov.sleepRecordedDays).toBe(1);
    expect(ov.attendedDays).toBe(1);
    expect(ov.influenceTop).toBe('sleep');
  });

  it('データが空でも安全な既定値を返す', () => {
    const ov = rangeOverview([], []);
    expect(ov.recordedDays).toBe(0);
    expect(ov.moodCount).toBe(0);
    expect(ov.averageMood).toBeNull();
    expect(ov.influenceTop).toBeNull();
    expect(ov.sleepRecordedDays).toBe(0);
    expect(ov.attendedDays).toBe(0);
  });

  it('気分1件のみでも NaN を出さず averageMood を返す', () => {
    const ov = rangeOverview([daily('2026-05-20', { mood: 5 })], []);
    expect(ov.moodCount).toBe(1);
    expect(ov.averageMood).toBe(5);
  });

  it('気分が全日 skippedMood なら averageMood は null・recordedDays は数える', () => {
    const ov = rangeOverview(
      [
        daily('2026-05-20', {
          missingness: { ...NO_MISSING, skippedMood: true },
        }),
      ],
      [],
    );
    expect(ov.recordedDays).toBe(1);
    expect(ov.moodCount).toBe(0);
    expect(ov.averageMood).toBeNull();
  });
});
