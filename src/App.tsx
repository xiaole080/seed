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
  SelectedRegion,
  Stage,
  TodayCard,
} from './data/types';
import { REGIONS, roundCoord } from './data/regions';
import {
  flushOutboxOnce,
  logCheckIn,
  logCheckOut,
  logMood,
  logSettings,
  syncHistoryOnce,
} from './api/sheets';
import { ConsentScreen } from './screens/ConsentScreen';
import { RegionSearchScreen } from './screens/RegionSearchScreen';
import { clearWeatherCache } from './data/weatherCache';
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

const WEEKDAY_JP_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

type Phase =
  | 'consent'
  | 'login'
  | 'setup-egg'
  | 'setup-attendance'
  | 'setup-records'
  | 'app';

type Route = TabId | 'mood' | 'reaction' | 'checkin' | 'regionSearch';

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
  /**
   * 選択中の地域。schemaVersion 0.2.0 で `RegionId` から `SelectedRegion` に拡張。
   * 永続化されたデータが string (旧 RegionId) の場合は normalizeRegion で
   * `{ kind: 'preset', presetId }` に正規化する。
   */
  region: SelectedRegion;
  manualStage: Stage;
  streak: number;
  totalDays: number;
  attendanceState: AttendanceState;
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
  region: { kind: 'preset', presetId: 'tokyo' },
  manualStage: 0,
  streak: 0,
  totalDays: 0,
  attendanceState: 'before',
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
  weatherApiConsent: 'notAsked',
  consentVersion: 'v1.1',
};

/**
 * 旧形式 (string = RegionId) を含む region 値を SelectedRegion へ正規化する。
 * schemaVersion 0.2.0 で `state.region` を SelectedRegion に切り替えたため、
 * localStorage に残っている旧データを読み取る際の安全弁。
 */
function normalizeRegion(raw: unknown): SelectedRegion {
  if (typeof raw === 'string') {
    if (raw in REGIONS) {
      return { kind: 'preset', presetId: raw as RegionId };
    }
    return { kind: 'preset', presetId: 'tokyo' };
  }
  if (raw && typeof raw === 'object') {
    const r = raw as Partial<SelectedRegion> & {
      kind?: string;
      presetId?: string;
      name?: string;
      lat?: number;
      lon?: number;
    };
    if (r.kind === 'preset' && typeof r.presetId === 'string' && r.presetId in REGIONS) {
      return { kind: 'preset', presetId: r.presetId as RegionId };
    }
    if (
      r.kind === 'custom' &&
      typeof r.name === 'string' &&
      typeof r.lat === 'number' &&
      typeof r.lon === 'number'
    ) {
      // 読み込み時防御 (§4.2): 旧データに小数3位以降が残っていた場合の救済。
      // 上流 (geocoding.ts / RegionSearchScreen) で丸めているが、リリース前の
      // データを抱えた端末を保護する。
      return {
        kind: 'custom',
        name: r.name,
        lat: roundCoord(r.lat),
        lon: roundCoord(r.lon),
      };
    }
  }
  return { kind: 'preset', presetId: 'tokyo' };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>(() =>
    loadJson<Phase>(STORAGE_KEY_PHASE, 'consent'),
  );
  const [consent, setConsent] = useState<ConsentState>(() => {
    // 旧 v1.0 ユーザの consent JSON には weatherApiConsent などの新規 field が
    // 入っていない可能性がある。DEFAULT_CONSENT を先に展開して欠損を埋め、
    // ロード結果で必要な field だけ上書きする。
    // consentVersion はロード値があれば優先 (旧 'v1.0' を残し、migrations 側で 'v1.1' に上げる)。
    const loaded = loadJson<Partial<ConsentState>>(STORAGE_KEY_CONSENT, {});
    return { ...DEFAULT_CONSENT, ...loaded };
  });
  const [route, setRoute] = useState<Route>('home');
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadJson<
      Partial<AppState> & { region?: unknown; todayMode?: unknown; todayBand?: unknown }
    >(STORAGE_KEY_STATE, {});
    // T1: 旧スキーマにあった todayMode / todayBand は派生値化したため捨てる。
    // 既存テスター端末で残っていても無視する (永続化時には自然に消える)。
    const { todayMode: _tm, todayBand: _tb, ...rest } = loaded;
    void _tm;
    void _tb;
    return {
      ...INITIAL_STATE,
      ...rest,
      // 旧データ (string の RegionId) を SelectedRegion へ正規化する。
      region: normalizeRegion(loaded.region ?? INITIAL_STATE.region),
    };
  });
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

  // 現在日 + ユーザの schedule から「今日のカード」を派生させる。
  // - state には固定値を持たない (T1: 旧 todayMode/todayBand 廃止)
  // - 実打刻時刻 (checkInTime / checkOutTime) は AttendanceMonthlyRecord から引く (T2)
  // - 日付が変わる or 打刻が増えるたびに再計算が走るよう deps に dateKey と storeTick を入れる
  const dateKey = todayISO();
  const today: TodayCard = useMemo(() => {
    const slot = scheduleSlotFor(dateKey, state.schedule);
    const [y, m, d] = dateKey.split('-').map(Number);
    const dayLabel = WEEKDAY_JP_LABELS[new Date(y, m - 1, d).getDay()];
    const rec = getAttendance(dateKey);
    return {
      mode: slot?.mode ?? 'off',
      band: slot?.band ?? 'full',
      dayLabel,
      checkInTime: rec?.checkIn,
      checkOutTime: rec?.checkOut,
    };
  }, [dateKey, state.schedule, storeTick]);

  // 起動時 (および日付跨ぎ後) に attendanceState を今日のレコードから再判定する。
  // 前日の 'checkedOut' を引きずって新しい日にも「退室済み」と表示しないようにする。
  useEffect(() => {
    const rec = getAttendance(dateKey);
    const next: AttendanceState =
      rec?.checkOut != null
        ? 'checkedOut'
        : rec?.checkIn != null
        ? 'checkedIn'
        : 'before';
    setState((prev) =>
      prev.attendanceState === next ? prev : { ...prev, attendanceState: next },
    );
  }, [dateKey]);

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
    // T6/T7: 予定が休み (off) の日でも CheckInScreen から「打刻に進む」で
    // 進入した場合は例外打刻として扱う。actualMode は 'office' を入れる
    // (plannedMode='off' + actualMode='office' で支援員側が例外を識別する)。
    const actual: TodayCard['mode'] =
      today.mode === 'off' ? 'office' : today.mode;
    upsertAttendance({
      ...rec,
      actualMode: actual,
      checkIn: time,
      missingClock: false,
    });
    bumpStore();
    logCheckIn(
      { mode: actual, band: today.band, state: 'checkedIn', time },
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
    // T6/T7: 退室時も例外打刻 (planned=off) の場合は actualMode='office' に揃える。
    const actual: TodayCard['mode'] =
      rec.actualMode ?? (today.mode === 'off' ? 'office' : today.mode);
    upsertAttendance({
      ...rec,
      actualMode: actual,
      checkOut: time,
      durationMinutes,
      missingClock: rec.checkIn == null, // 入室時刻が無いまま退室は未打刻扱い
    });
    bumpStore();
    logCheckOut(
      { mode: actual, band: today.band, state: 'checkedOut', time },
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
  } else if (route === 'regionSearch') {
    inner = (
      <RegionSearchScreen
        consent={consent.weatherApiConsent}
        onPick={(r) => {
          update({ region: r });
          const summary = r.kind === 'preset' ? r.presetId : 'custom';
          logSettings({ field: 'region', value: summary }, state.nickname);
          // 別地域に切り替えたら以前の天気キャッシュは捨てる (座標一致しないため
          // どのみち使われないが、明示的にクリア)。
          clearWeatherCache();
          setRoute('me');
        }}
        onBack={() => setRoute('me')}
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
        weatherConsent={consent.weatherApiConsent}
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
        onEnableWeather={() => setRoute('me')}
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
        weatherConsent={consent.weatherApiConsent}
        recordIds={state.recordIds}
        customRecordItems={state.customRecordItems}
        onTab={(t) => setRoute(t)}
        onChangeNickname={(v) => {
          update({ nickname: v });
          logSettings({ field: 'nickname', value: v }, v);
        }}
        onChangeRegion={(r) => {
          update({ region: r });
          // Sheets には地域の "種別" だけを送る (custom の name は送らない)。
          // custom の中身 (具体的な地名) はローカル限定として扱う。
          const summary =
            r.kind === 'preset' ? r.presetId : 'custom';
          logSettings({ field: 'region', value: summary }, state.nickname);
        }}
        onChangeWeatherConsent={(next) => {
          setConsent({ ...consent, weatherApiConsent: next });
          // 同意状態の変更は Sheets に値 (accepted/declined) のみ送る。
          logSettings(
            { field: 'weatherApiConsent', value: next },
            state.nickname,
          );
        }}
        onOpenRegionSearch={() => setRoute('regionSearch')}
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
