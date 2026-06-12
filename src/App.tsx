import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { deriveStage } from './data/stages';
import { saveJson } from './storage';
import type { AttendanceState, ConsentState, TodayCard } from './data/types';
import { flushOutboxOnce, syncHistoryOnce } from './api/sheets';
import {
  countRecordedDays,
  currentStreak,
  getAttendance,
  scheduleSlotFor,
  todayISO,
} from './data/store';
import { runMigrations } from './data/migrations';
import {
  loadInitialAppState,
  loadInitialConsent,
  loadInitialPhase,
  STORAGE_KEY_STATE,
  STORAGE_KEY_PHASE,
  STORAGE_KEY_CONSENT,
  WEEKDAY_JP_LABELS,
  type AppState,
  type Phase,
} from './data/appState';
import {
  appendUsageEvent,
  beginRecordSession,
  endRecordSession,
} from './data/usageLog';
import { useAttendanceActions } from './screens/app/useAttendanceActions';
import { OnboardingFlow } from './screens/app/OnboardingFlow';
import { MainRouter, type Route } from './screens/app/MainRouter';

export default function App() {
  const [phase, setPhase] = useState<Phase>(loadInitialPhase);
  const [consent, setConsent] = useState<ConsentState>(loadInitialConsent);
  const [route, setRoute] = useState<Route>('home');
  const [state, setState] = useState<AppState>(loadInitialAppState);
  /** mood 記録の対象日 (YYYY-MM-DD)。home から遷移する時にセット。 */
  const [moodTargetDate, setMoodTargetDate] = useState<string>(() => todayISO());
  /** mood 記録の対象日タイプ。'today'/'yesterday' どちらから来たか保持。 */
  const [moodTargetType, setMoodTargetType] = useState<'today' | 'yesterday'>(
    'today'
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

  // ── 利用ログ (docs/usage-log-spec.md) ──────────────────────
  // イベント種類 + 時刻のみを端末内に記録する。記録内容 (mood/note 等) は
  // いかなる形でも渡さない。外部送信なし。
  //
  // app_open: 起動時 1 回 + visible 復帰時。直前の app_open から 30 秒未満
  // なら記録しない (決定事項 D-3。StrictMode の二重 effect もこれで吸収)。
  const lastAppOpenAtRef = useRef(0);
  const logAppOpenDebounced = useCallback(() => {
    const nowMs = Date.now();
    if (nowMs - lastAppOpenAtRef.current < 30_000) return;
    lastAppOpenAtRef.current = nowMs;
    appendUsageEvent('app_open');
  }, []);
  useEffect(() => {
    // 起動時 1 回 (logAppOpenDebounced は useCallback で安定)
    logAppOpenDebounced();
  }, [logAppOpenDebounced]);

  // 進行中の記録セッション (record_open → save/abandon の相関 ID)。
  const recordSessionRef = useRef<string | null>(null);

  // route 遷移の前回値比較で record_open / record_abandon / history_open を計測。
  // mood 画面内の再レンダーでは多重記録しない (遷移時のみ発火)。
  const prevRouteRef = useRef<Route>(route);
  useEffect(() => {
    const prev = prevRouteRef.current;
    if (prev === route) return;
    prevRouteRef.current = route;
    if (prev === 'mood' && recordSessionRef.current != null) {
      // save 済みなら endRecordSession 側で no-op になる (二重 end 防止)
      endRecordSession(recordSessionRef.current, 'abandon');
      recordSessionRef.current = null;
    }
    if (route === 'mood') {
      recordSessionRef.current = beginRecordSession();
    }
    if (route === 'log') {
      appendUsageEvent('history_open');
    }
  }, [route]);

  // MoodLogScreen の保存成功直後に MainRouter から呼ばれる。
  // 記録内容は受け取らない (引数なし)。
  const handleRecordSaved = () => {
    if (recordSessionRef.current != null) {
      endRecordSession(recordSessionRef.current, 'save');
    }
  };

  // 起動時に1度だけ: schemaVersion マイグレ → モック履歴シード → オフラインキュー flush
  useEffect(() => {
    // 同意取得前でも安全に走るのが望ましい (DailyRecord の補完のみで外部送信なし)
    runMigrations();
    syncHistoryOnce(state.nickname);
    flushOutboxOnce();
    // 依存配列は空のまま (起動時1回だけ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 現在日 (YYYY-MM-DD) の追跡。後段の totalDays / streak / today などの
  // useMemo deps に入れて、日付跨ぎ時に再計算させる。
  //
  // T1-B: アプリを開きっぱなしで日付が跨いだとき、dateKey が再評価されないと
  // 「前日の打刻状態」のまま表示されてしまう。1 分ごとに todayISO() を再判定し、
  // 日付が変わったら state を bump する。visibilitychange でも即再評価する
  // (スマホでバックグラウンドにあった場合の復帰時に間に合わせる)。
  const [dateKey, setDateKey] = useState<string>(() => todayISO());
  useEffect(() => {
    const check = () => {
      const next = todayISO();
      setDateKey((prev) => (prev === next ? prev : next));
    };
    const id = window.setInterval(check, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        check();
        // 利用ログ: フォアグラウンド復帰を app_open として記録 (30秒デバウンス)
        logAppOpenDebounced();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [logAppOpenDebounced]);

  // ← 鳥成長は「ユニークな記録日数」から派生する。
  //    同じ日に何回 submit しても 1日分にしかカウントしない (連続日数も同様)。
  //
  // バグ③ 修正: deps に dateKey を含めないと、アプリを開きっぱなしで日付が
  // 跨いだとき currentStreak() が前日基準のまま固定されてしまい、ケア画面の
  // 鳥バー (totalDays) や streak が再計算されない。dateKey を追加することで
  // 日付跨ぎ後も自然に再評価される。
  const totalDays = useMemo(() => countRecordedDays(), [storeTick, dateKey]);
  const streak = useMemo(() => currentStreak(), [storeTick, dateKey]);
  const stage = deriveStage(streak, state.manualStage);

  // バグ修正: 記録がない日が続いても、過去最大ステージを保持する。
  // 到達した stage を manualStage に自動保存しておくことで、streak が 0 に
  // なっても deriveStage が manualStage 由来の値を維持し、ステージが後退
  // (= 卵に戻る) ことを防ぐ。
  // localStorage への保存先や記録項目に変更はなく、外部送信もしない。
  //
  // 鳥ステージ・種別 後退防止の仕様 (docs/specs/bird-stage-no-regression.md):
  //   - stage: この useEffect で manualStage を「単調増加」に保つことで後退防止。
  //   - species (state.eggSpecies): EggCustomizeScreen での明示選択と、
  //     全データ削除 (onAllDataDeleted → setState(INITIAL_STATE)) 以外では
  //     書き換わらない。詳細は仕様書 §5・§10 参照。
  useEffect(() => {
    if (stage > state.manualStage) {
      update({ manualStage: stage });
    }
    // update は setState ベースで安定。eslint deps はあえて stage / manualStage のみ。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, state.manualStage]);

  // 現在日 + ユーザの schedule から「今日のカード」を派生させる。
  // - state には固定値を持たない (T1: 旧 todayMode/todayBand 廃止)
  // - 実打刻時刻 (checkInTime / checkOutTime) は AttendanceMonthlyRecord から引く (T2)
  // - 日付が変わる or 打刻が増えるたびに再計算が走るよう deps に dateKey と storeTick を入れる
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
      // バグ② 修正: CheckInScreen のヘッダー日付を動的化するため
      // today.dateISO で現在日 (YYYY-MM-DD) を渡す。
      dateISO: dateKey,
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
      prev.attendanceState === next ? prev : { ...prev, attendanceState: next }
    );
  }, [dateKey]);

  const update = (patch: Partial<AppState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const attendance = useAttendanceActions({ state, today, update, bumpStore });

  const inner: ReactNode =
    phase !== 'app' ? (
      <OnboardingFlow
        phase={phase}
        state={state}
        consent={consent}
        setConsent={setConsent}
        setPhase={setPhase}
        setRoute={setRoute}
        update={update}
      />
    ) : (
      <MainRouter
        route={route}
        state={state}
        consent={consent}
        stage={stage}
        totalDays={totalDays}
        today={today}
        dateKey={dateKey}
        moodTargetDate={moodTargetDate}
        moodTargetType={moodTargetType}
        setRoute={setRoute}
        setPhase={setPhase}
        setConsent={setConsent}
        setState={setState}
        update={update}
        bumpStore={bumpStore}
        setMoodTargetDate={setMoodTargetDate}
        setMoodTargetType={setMoodTargetType}
        attendance={attendance}
        onRecordSaved={handleRecordSaved}
      />
    );

  return (
    <div className="phone-app-shell">
      <div className="phone-frame">{inner}</div>
    </div>
  );
}
