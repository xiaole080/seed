import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LoginScreen } from './screens/LoginScreen';
import { EggCustomizeScreen } from './screens/EggCustomizeScreen';
import { AttendanceSetupScreen } from './screens/AttendanceSetupScreen';
import { RecordItemsSetupScreen } from './screens/RecordItemsSetupScreen';
import { HomeScreen } from './screens/HomeScreen';
import { MoodLogScreen } from './screens/MoodLogScreen';
import { ReactionScreen } from './screens/ReactionScreen';
import { CheckInScreen } from './screens/CheckInScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { CareScreen } from './screens/CareScreen';
import type { TabId } from './components/BottomTabs';
import { DEFAULT_SCHEDULE } from './data/attendance';
import { DEFAULT_RECORD_IDS } from './data/records';
import { deriveStage } from './data/stages';
import { loadJson, saveJson } from './storage';
import type {
  AttendanceMonthlyRecord,
  AttendanceState,
  ConsentState,
  EggSpeciesId,
  EggTraitId,
  Mood,
  RecordPreset,
  RegionId,
  Schedule,
  Stage,
  TodayCard,
} from './data/types';
import {
  flushOutboxOnce,
  logCheckIn,
  logCheckOut,
  logMood,
  logSettings,
  syncHistoryOnce,
} from './api/sheets';
import { ConsentScreen } from './screens/ConsentScreen';
import {
  countRecordedDays,
  currentStreak,
  getAttendance,
  getDailyRecord,
  nowHHmm,
  nowISO,
  scheduleSlotFor,
  todayISO,
  upsertAttendance,
  upsertDailyRecord,
  weekdayEnFor,
} from './data/store';
import { buildDailyRecord } from './data/dailyMapper';
import { runMigrations } from './data/migrations';

function selectionsToPlain(
  sel: Record<string, string | null | Set<string>>,
): Record<string, string | string[] | null> {
  const out: Record<string, string | string[] | null> = {};
  for (const [k, v] of Object.entries(sel)) {
    out[k] = v instanceof Set ? Array.from(v) : v;
  }
  return out;
}

function diffMinutes(start: string, end: string): number | undefined {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return undefined;
  return eh * 60 + em - (sh * 60 + sm);
}

type Phase =
  | 'consent'
  | 'login'
  | 'setup-egg'
  | 'setup-attendance'
  | 'setup-records'
  | 'app';

type Route = TabId | 'mood' | 'reaction' | 'checkin';

/** YYYY-MM-DD で今日からの offset 日を返す (offset=-1 は昨日) */
function isoDaysOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface AppState {
  nickname: string;
  schedule: Schedule;
  recordIds: string[];
  /** じぶん画面で追加されたカスタム記録項目 (永続化対象) */
  customRecordItems: RecordPreset[];
  region: RegionId;
  manualStage: Stage;
  streak: number;
  totalDays: number;
  attendanceState: AttendanceState;
  todayMode: TodayCard['mode'];
  todayBand: TodayCard['band'];
  lastMood: Mood;
  eggSpecies: EggSpeciesId;
  eggTrait: EggTraitId | null;
  eggName: string;
  showWhisper: boolean;
}

const INITIAL_STATE: AppState = {
  nickname: 'はる',
  schedule: DEFAULT_SCHEDULE,
  recordIds: DEFAULT_RECORD_IDS,
  customRecordItems: [],
  region: 'tokyo',
  manualStage: 0,
  streak: 0,
  totalDays: 0,
  attendanceState: 'before',
  todayMode: 'office',
  todayBand: 'full',
  lastMood: 4,
  eggSpecies: 'chicken',
  eggTrait: null,
  eggName: '',
  showWhisper: true,
};

const STORAGE_KEY_STATE   = 'seed.app.state.v1';
const STORAGE_KEY_PHASE   = 'seed.app.phase.v1';
const STORAGE_KEY_CONSENT = 'seed.consent.v1';

const DEFAULT_CONSENT: ConsentState = {
  appTermsAccepted: false,
  attendanceBackupConsent: 'notAsked',
  attendanceExportConsent: 'notAsked',
  researchConsent: 'notAsked',
  consentVersion: 'v1.0',
};

export default function App() {
  const [phase, setPhase] = useState<Phase>(() =>
    loadJson<Phase>(STORAGE_KEY_PHASE, 'consent'),
  );
  const [consent, setConsent] = useState<ConsentState>(() =>
    loadJson<ConsentState>(STORAGE_KEY_CONSENT, DEFAULT_CONSENT),
  );
  const [route, setRoute] = useState<Route>('home');
  const [state, setState] = useState<AppState>(() => ({
    ...INITIAL_STATE,
    ...loadJson<Partial<AppState>>(STORAGE_KEY_STATE, {}),
  }));
  /** mood 記録の対象日 (YYYY-MM-DD)。home から遷移する時にセット。 */
  const [moodTargetDate, setMoodTargetDate] = useState<string>(() => todayISO());
  /** mood 記録の対象日タイプ。'today'/'yesterday' どちらから来たか保持。 */
  const [moodTargetType, setMoodTargetType] = useState<'today' | 'yesterday'>(
    'today',
  );

  // ストア書き込み(気分記録/打刻)があるたびに +1 する。
  // useMemo の依存に入れて totalDays / streak / 鳥ステージを再計算させる。
  const [storeTick, setStoreTick] = useState(0);
  const bumpStore = () => setStoreTick((n) => n + 1);

  // 永続化: phase / state / consent が変わるたびに localStorage へ
  useEffect(() => {
    saveJson(STORAGE_KEY_PHASE, phase);
  }, [phase]);
  useEffect(() => {
    saveJson(STORAGE_KEY_STATE, state);
  }, [state]);
  useEffect(() => {
    saveJson(STORAGE_KEY_CONSENT, consent);
  }, [consent]);

  // 起動時に1度だけ: schemaVersion マイグレ → モック履歴シード → オフラインキュー flush
  useEffect(() => {
    // 同意取得前でも安全に走るのが望ましい (DailyRecord の補完のみで外部送信なし)
    runMigrations();
    syncHistoryOnce(state.nickname);
    flushOutboxOnce();
    // 依存配列は空のまま (起動時1回だけ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ← 鳥成長は「ユニークな記録日数」から派生する。
  //    同じ日に何回 submit しても 1日分にしかカウントしない (連続日数も同様)。
  const totalDays = useMemo(() => countRecordedDays(), [storeTick]);
  const streak    = useMemo(() => currentStreak(),    [storeTick]);
  const stage     = deriveStage(streak, state.manualStage);

  const today: TodayCard = useMemo(
    () => ({
      mode: state.todayMode,
      band: state.todayBand,
      dayLabel: '土',
      checkInTime: '9:42',
      checkOutTime: '15:08',
    }),
    [state.todayMode, state.todayBand],
  );

  const update = (patch: Partial<AppState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  // ── 通所打刻ハンドラ (A1/A3): 端末ストアへも同時に書く ──
  const ensureTodayAttendance = (): AttendanceMonthlyRecord => {
    const date = todayISO();
    const existing = getAttendance(date);
    if (existing) return existing;
    const slot = scheduleSlotFor(date, state.schedule);
    const exportMonth = date.slice(0, 7); // YYYY-MM
    const rec: AttendanceMonthlyRecord = {
      localAttendanceId: `att_${date}`,
      date,
      weekday: weekdayEnFor(date),
      plannedMode: slot?.mode ?? 'off',
      plannedBand: slot?.band,
      actualMode: undefined,
      checkIn: undefined,
      checkOut: undefined,
      durationMinutes: undefined,
      // 予定が休みでなく実打刻もまだ → 未打刻フラグ true
      missingClock: (slot?.mode ?? 'off') !== 'off',
      edited: false,
      exportMonth,
    };
    upsertAttendance(rec);
    return rec;
  };

  const handleCheckIn = () => {
    update({ attendanceState: 'checkedIn' });
    const time = nowHHmm();
    const rec = ensureTodayAttendance();
    upsertAttendance({
      ...rec,
      actualMode: today.mode,
      checkIn: time,
      missingClock: false,
    });
    bumpStore();
    logCheckIn(
      { mode: today.mode, band: today.band, state: 'checkedIn', time },
      state.nickname,
    );
  };

  const handleCheckOut = () => {
    update({ attendanceState: 'checkedOut' });
    const time = nowHHmm();
    const rec = ensureTodayAttendance();
    const checkIn = rec.checkIn;
    const durationMinutes =
      checkIn != null ? diffMinutes(checkIn, time) : undefined;
    upsertAttendance({
      ...rec,
      actualMode: rec.actualMode ?? today.mode,
      checkOut: time,
      durationMinutes,
      missingClock: rec.checkIn == null, // 入室時刻が無いまま退室は未打刻扱い
    });
    bumpStore();
    logCheckOut(
      { mode: today.mode, band: today.band, state: 'checkedOut', time },
      state.nickname,
    );
  };

  let inner: ReactNode = null;
  if (phase === 'consent') {
    inner = (
      <ConsentScreen
        consent={consent}
        onAccept={(next) => {
          setConsent({
            ...next,
            appTermsAccepted: true,
            consentedAt: nowISO(),
          });
          setPhase('login');
        }}
      />
    );
  } else if (phase === 'login') {
    inner = (
      <LoginScreen
        nickname={state.nickname}
        onChange={(v) => update({ nickname: v })}
        onSubmit={(v) => {
          update({ nickname: v });
          setPhase('setup-egg');
        }}
      />
    );
  } else if (phase === 'setup-egg') {
    inner = (
      <EggCustomizeScreen
        initialSpecies={state.eggSpecies}
        initialTrait={state.eggTrait}
        initialName={state.eggName}
        onSave={({ eggSpecies, eggTrait, eggName }) => {
          update({ eggSpecies, eggTrait, eggName });
          setPhase('setup-attendance');
        }}
        onSkip={() => setPhase('setup-attendance')}
      />
    );
  } else if (phase === 'setup-attendance') {
    inner = (
      <AttendanceSetupScreen
        initial={state.schedule}
        onSave={(s) => {
          update({ schedule: s });
          setPhase('setup-records');
        }}
        onSkip={() => setPhase('setup-records')}
      />
    );
  } else if (phase === 'setup-records') {
    inner = (
      <RecordItemsSetupScreen
        initialIds={state.recordIds}
        onSave={(ids) => {
          update({ recordIds: ids });
          setPhase('app');
          setRoute('home');
        }}
        onSkip={() => {
          setPhase('app');
          setRoute('home');
        }}
      />
    );
  } else if (route === 'mood') {
    // 対象日と既存レコード (修正時のみ) を読み出して MoodLogScreen に渡す。
    const targetDate = moodTargetDate;
    const existing = getDailyRecord(targetDate);
    inner = (
      <MoodLogScreen
        initialMood={existing?.mood ?? state.lastMood}
        enabledCategoryIds={state.recordIds}
        targetDate={targetDate}
        initialRecord={existing}
        onCancel={() => setRoute('home')}
        onSubmit={({
          mood,
          primaryInfluence,
          selections,
          note,
          influenceOtherText,
          sectionOtherTexts,
        }) => {
          const plain = selectionsToPlain(selections);

          // A1: 端末ストアへ DailyRecord として保存 (自由記述もここだけ)
          const previous = getDailyRecord(targetDate);
          const daily = buildDailyRecord({
            mood,
            primaryInfluence,
            selections: plain,
            note,
            enabledCategoryIds: state.recordIds,
            date: targetDate,
            previous,
            influenceOtherText,
            sectionOtherTexts,
            edited: previous != null,
            targetDateType: moodTargetType,
          });
          upsertDailyRecord(daily);
          bumpStore();

          // lastMood だけ覚えておく (next-open のデフォルト用)。
          // totalDays / streak はストアから派生するので state では持たない。
          update({ lastMood: mood });

          // Sheets には気分・影響・詳細選択のみ送信。
          // 自由記述・*.otherText / influenceOtherText は端末ローカル限定 (§9.5 / §13.8)。
          // ※ sheets.ts 側でも otherText / note を確実に除去するフィルタを持つ。
          logMood(
            {
              mood,
              primaryInfluence,
              selections: plain,
            },
            state.nickname,
          );
          setRoute('reaction');
        }}
      />
    );
  } else if (route === 'reaction') {
    inner = (
      <ReactionScreen
        stage={stage}
        nickname={state.nickname}
        mood={state.lastMood}
        species={state.eggSpecies}
        eggName={state.eggName}
        onHome={() => setRoute('home')}
      />
    );
  } else if (route === 'checkin') {
    inner = (
      <CheckInScreen
        today={today}
        state={state.attendanceState}
        nickname={state.nickname}
        onBack={() => setRoute('home')}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onTab={(t) => setRoute(t)}
      />
    );
  } else if (route === 'home') {
    const todayDate = todayISO();
    const yesterdayDate = isoDaysOffset(-1);
    inner = (
      <HomeScreen
        nickname={state.nickname}
        stage={stage}
        totalDays={totalDays}
        today={today}
        attendanceState={state.attendanceState}
        region={state.region}
        species={state.eggSpecies}
        eggName={state.eggName}
        showWhisper={state.showWhisper}
        hasTodayRecord={getDailyRecord(todayDate) != null}
        hasYesterdayRecord={getDailyRecord(yesterdayDate) != null}
        onTab={(t) => setRoute(t)}
        onLogMood={() => {
          setMoodTargetDate(todayDate);
          setMoodTargetType('today');
          setRoute('mood');
        }}
        onLogYesterday={() => {
          setMoodTargetDate(yesterdayDate);
          setMoodTargetType('yesterday');
          setRoute('mood');
        }}
        onOpenCheckIn={() => setRoute('checkin')}
      />
    );
  } else if (route === 'log') {
    inner = (
      <HistoryScreen
        recordIds={state.recordIds}
        onTab={(t) => setRoute(t)}
      />
    );
  } else if (route === 'care') {
    inner = (
      <CareScreen
        totalDays={totalDays}
        eggName={state.eggName}
        nickname={state.nickname}
        onTab={(t) => setRoute(t)}
      />
    );
  } else if (route === 'me') {
    inner = (
      <ProfileScreen
        nickname={state.nickname}
        schedule={state.schedule}
        region={state.region}
        recordIds={state.recordIds}
        customRecordItems={state.customRecordItems}
        onTab={(t) => setRoute(t)}
        onChangeNickname={(v) => {
          update({ nickname: v });
          logSettings({ field: 'nickname', value: v }, v);
        }}
        onChangeRegion={(r) => {
          update({ region: r });
          logSettings({ field: 'region', value: r }, state.nickname);
        }}
        onChangeRecordItems={(ids, customs) => {
          // T5: ON/OFF 切替を state へ反映。state は localStorage に永続化される。
          // これでリロードなしで MoodLog / History にも反映される。
          update({ recordIds: ids, customRecordItems: customs });
          // 設定変更ログは項目数だけ送る (中身は送らない: customs のラベルは
          // 自由記述に準ずる扱いとしてローカル限定)。
          logSettings({ field: 'recordIds', value: ids.length }, state.nickname);
        }}
        onAllDataDeleted={() => {
          // A6: 削除後は同意取り直しから
          setState(INITIAL_STATE);
          setConsent(DEFAULT_CONSENT);
          setPhase('consent');
          setRoute('home');
          bumpStore();
        }}
      />
    );
  }

  return (
    <div className="phone-app-shell">
      <div className="phone-frame">{inner}</div>
    </div>
  );
}
