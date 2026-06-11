import type { ReactNode } from 'react';
import { MoodLogScreen } from '../MoodLogScreen';
import { ReactionScreen } from '../ReactionScreen';
import { CheckInScreen } from '../CheckInScreen';
import { HomeScreen } from '../HomeScreen';
import { HistoryScreen } from '../HistoryScreen';
import { CareScreen } from '../CareScreen';
import { ProfileScreen } from '../ProfileScreen';
import { RegionSearchScreen } from '../RegionSearchScreen';
import type { TabId } from '../../components/BottomTabs';
import type { ConsentState, Stage, TodayCard } from '../../data/types';
import {
  getDailyRecord,
  todayISO,
  upsertDailyRecord,
} from '../../data/store';
import { buildDailyRecord } from '../../data/dailyMapper';
import { logMood, logSettings } from '../../api/sheets';
import { clearWeatherCache } from '../../data/weatherCache';
import {
  selectionsToPlain,
  isoDaysOffset,
  INITIAL_STATE,
  DEFAULT_CONSENT,
  type AppState,
  type Phase,
} from '../../data/appState';
import { useAttendanceActions } from './useAttendanceActions';

export type Route = TabId | 'mood' | 'reaction' | 'checkin' | 'regionSearch';

interface MainRouterProps {
  route: Route;
  state: AppState;
  consent: ConsentState;
  stage: Stage;
  totalDays: number;
  today: TodayCard;
  dateKey: string;
  moodTargetDate: string;
  moodTargetType: 'today' | 'yesterday';
  setRoute: (r: Route) => void;
  setPhase: (p: Phase) => void;
  setConsent: (c: ConsentState) => void;
  setState: (s: AppState) => void;
  update: (patch: Partial<AppState>) => void;
  bumpStore: () => void;
  setMoodTargetDate: (d: string) => void;
  setMoodTargetType: (t: 'today' | 'yesterday') => void;
  attendance: ReturnType<typeof useAttendanceActions>;
  /**
   * 利用ログ: 記録保存成功直後の通知 (record_save)。
   * 記録内容は渡さない (引数なし)。docs/usage-log-spec.md §4-T4。
   */
  onRecordSaved?: () => void;
}

// phase === 'app' のときの、route ベースの画面ルーティング。
export function MainRouter({
  route,
  state,
  consent,
  stage,
  totalDays,
  today,
  dateKey,
  moodTargetDate,
  moodTargetType,
  setRoute,
  setPhase,
  setConsent,
  setState,
  update,
  bumpStore,
  setMoodTargetDate,
  setMoodTargetType,
  attendance,
  onRecordSaved,
}: MainRouterProps): ReactNode {
  if (route === 'mood') {
    // 対象日と既存レコード (修正時のみ) を読み出して MoodLogScreen に渡す。
    const targetDate = moodTargetDate;
    const existing = getDailyRecord(targetDate);
    return (
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
          // 利用ログ: 保存成功を record_save として記録 (内容は渡さない)
          onRecordSaved?.();
          bumpStore();

          // lastMood だけ覚えておく (next-open のデフォルト用)。
          update({ lastMood: mood });

          // Sheets には気分・影響・詳細選択のみ送信。
          // 自由記述・*.otherText / influenceOtherText は端末ローカル限定 (§9.5 / §13.8)。
          logMood(
            {
              mood,
              primaryInfluence,
              selections: plain,
            },
            state.nickname
          );
          setRoute('reaction');
        }}
      />
    );
  }

  if (route === 'reaction') {
    return (
      <ReactionScreen
        stage={stage}
        nickname={state.nickname}
        mood={state.lastMood}
        species={state.eggSpecies}
        eggName={state.eggName}
        onHome={() => setRoute('home')}
      />
    );
  }

  if (route === 'regionSearch') {
    return (
      <RegionSearchScreen
        consent={consent.weatherApiConsent}
        onPick={(r) => {
          update({ region: r });
          const summary = r.kind === 'preset' ? r.presetId : 'custom';
          logSettings({ field: 'region', value: summary }, state.nickname);
          // 別地域に切り替えたら以前の天気キャッシュは捨てる。
          clearWeatherCache();
          setRoute('me');
        }}
        onBack={() => setRoute('me')}
      />
    );
  }

  if (route === 'checkin') {
    // 事務所休業日の「軽い記録」現在値を渡す (ボタン下の「記録済み」表示用)
    const todayDaily = getDailyRecord(dateKey);
    return (
      <CheckInScreen
        today={today}
        state={state.attendanceState}
        nickname={state.nickname}
        closedDayActivity={todayDaily?.closedDayActivity}
        onBack={() => setRoute('home')}
        onCheckIn={attendance.handleCheckIn}
        onCheckOut={attendance.handleCheckOut}
        onTimeEdit={attendance.handleTimeEdit}
        onDelete={attendance.handleDeleteToday}
        onClosedDayActivity={attendance.handleClosedDayActivity}
        onTab={(t) => setRoute(t)}
      />
    );
  }

  if (route === 'home') {
    const todayDate = todayISO();
    const yesterdayDate = isoDaysOffset(-1);
    return (
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
  }

  if (route === 'log') {
    return (
      <HistoryScreen recordIds={state.recordIds} onTab={(t) => setRoute(t)} />
    );
  }

  if (route === 'care') {
    return (
      <CareScreen
        totalDays={totalDays}
        eggName={state.eggName}
        nickname={state.nickname}
        schedule={state.schedule}
        onTab={(t) => setRoute(t)}
      />
    );
  }

  if (route === 'me') {
    return (
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
          const summary = r.kind === 'preset' ? r.presetId : 'custom';
          logSettings({ field: 'region', value: summary }, state.nickname);
        }}
        onChangeWeatherConsent={(next) => {
          setConsent({ ...consent, weatherApiConsent: next });
          // 同意状態の変更は Sheets に値 (accepted/declined) のみ送る。
          logSettings(
            { field: 'weatherApiConsent', value: next },
            state.nickname
          );
        }}
        onOpenRegionSearch={() => setRoute('regionSearch')}
        onChangeRecordItems={(ids, customs) => {
          // T5: ON/OFF 切替を state へ反映。state は localStorage に永続化される。
          update({ recordIds: ids, customRecordItems: customs });
          // 設定変更ログは項目数だけ送る (中身は送らない)。
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

  return null;
}
