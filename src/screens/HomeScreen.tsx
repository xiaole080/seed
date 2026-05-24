import { useState } from 'react';
import { PALETTE, ROUNDED_FONT } from '../theme';
import { BottomTabs, type TabId } from '../components/BottomTabs';
import { BirdStage } from '../components/BirdStage';
import { REGIONS } from '../data/regions';
import { useWeather, type WeatherState } from '../components/useWeather';
import { WeatherWidget } from '../components/WeatherWidget';
import {
  STAGE_LABEL,
  dailyWhisperFor,
  getMilestone,
} from '../data/stages';
import type {
  AttendanceState,
  ConsentState,
  EggSpeciesId,
  SelectedRegion,
  Stage,
  TodayCard,
} from '../data/types';

interface HomeScreenProps {
  nickname?: string;
  stage?: Stage;
  totalDays?: number;
  today?: TodayCard | null;
  attendanceState?: AttendanceState;
  region?: SelectedRegion;
  /** 天気APIの同意状態。'accepted' のみ fetch する。 */
  weatherConsent?: ConsentState['weatherApiConsent'];
  species?: EggSpeciesId;
  eggName?: string;
  showWhisper?: boolean;
  label?: string;
  /** 今日の日付に DailyRecord が既に保存されているか */
  hasTodayRecord?: boolean;
  /** 昨日の日付に DailyRecord が既に保存されているか */
  hasYesterdayRecord?: boolean;
  onTab?: (t: TabId) => void;
  /** 今日分の記録 / 修正画面へ遷移 */
  onLogMood?: () => void;
  /** 昨日分の記録 / 修正画面へ遷移 */
  onLogYesterday?: () => void;
  onOpenCheckIn?: () => void;
  /** 天気を有効にする導線 (じぶん画面へ遷移) */
  onEnableWeather?: () => void;
}

const MODE_LABEL_HOME: Record<TodayCard['mode'], string> = {
  office: '通所',
  home: '在宅',
  off: '休み',
};
const BAND_LABEL_HOME: Record<TodayCard['band'], string> = {
  full: '一日',
  am: '午前のみ',
  pm: '午後のみ',
};

function attendanceLines(today: TodayCard | null, state: AttendanceState) {
  if (!today || today.mode === 'off') {
    // T5: 休みの日は文言を統一し、ATTENDANCE タップで CheckInScreen に遷移できるよう
    // 「打刻に進む →」のヒントを併記する (実際の表示は呼び出し側で isAttendable に従って付ける)。
    return { title: 'きょうはお休みの日', sub: 'ゆっくり過ごしてくださいね' };
  }
  const m = MODE_LABEL_HOME[today.mode] ?? '通所';
  const b = BAND_LABEL_HOME[today.band] ?? '一日';
  const title = `${m}・${b}`;
  let sub = '';
  if (state === 'before') {
    sub =
      today.mode === 'office'
        ? '到着したら打刻してね'
        : '在宅でつないでいきましょう';
  } else if (state === 'checkedIn') {
    sub = `${today.checkInTime ?? '— : —'} にチェックイン済み`;
  } else if (state === 'checkedOut') {
    sub = `${today.checkInTime ?? '— : —'} 〜 ${today.checkOutTime ?? '— : —'}`;
  }
  return { title, sub };
}

/** ヘッダの 1 行サマリ。useWeather の結果を流し込む。 */
function headerWeatherLine(
  weather: WeatherState,
  fallbackIcon: string,
  fallbackLabel: string,
  fallbackCond: string,
): { line1: string; line2: string } {
  const label = weather.label ?? fallbackLabel;
  if (weather.kind === 'ready' || weather.kind === 'offline') {
    const s = weather.snapshot;
    if (s) {
      const offlineTag = weather.kind === 'offline' ? ' (オフライン)' : '';
      return {
        line1: `${s.icon} ${label} ${Math.round(s.temperature)}° · ${s.cond}`,
        line2: `気圧 ${Math.round(s.pressure)}hPa${offlineTag}`,
      };
    }
  }
  if (weather.kind === 'loading') {
    return {
      line1: `${fallbackIcon} ${label} -° · 読み込み中…`,
      line2: '気圧 -hPa',
    };
  }
  // optedOut / error / 初期
  return {
    line1: `${fallbackIcon} ${label} -° · ${fallbackCond}`,
    line2: '気圧 -hPa',
  };
}

export function HomeScreen({
  nickname = 'はる',
  stage = 0,
  totalDays = 0,
  today = null,
  attendanceState = 'before',
  region = { kind: 'preset', presetId: 'tokyo' },
  weatherConsent = 'notAsked',
  species = 'chicken',
  eggName = '',
  showWhisper = true,
  label = '02 ホーム',
  hasTodayRecord = false,
  hasYesterdayRecord = false,
  onTab,
  onLogMood,
  onLogYesterday,
  onOpenCheckIn,
  onEnableWeather,
}: HomeScreenProps) {
  const milestone = getMilestone(totalDays);
  const whisper = dailyWhisperFor(stage, false);

  // 同意済みなら useWeather が fetch する。未同意なら kind:'optedOut' で
  // ネットワークアクセス 0。
  const weather = useWeather({ region, consent: weatherConsent });

  // フォールバック表示用 (天気未取得時のラベル・アイコン)
  const fb =
    region.kind === 'preset'
      ? REGIONS[region.presetId] ?? REGIONS.tokyo
      : { label: region.name, icon: '📍', cond: '—' };

  const header = headerWeatherLine(weather, fb.icon, fb.label, fb.cond);

  // 実日付を表示 (T6: ハードコード "5/2" / "土曜日" を撤去)
  const now = new Date();
  const mmdd = `${now.getMonth() + 1}/${now.getDate()}`;
  const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = `${WEEKDAY_JP[now.getDay()]}曜日`;
  const att = attendanceLines(today, attendanceState);
  // T5: 休みの日でも CheckInScreen への遷移は可。
  // 例外打刻の入り口は CheckInScreen 側 (お休みのままにする / 打刻に進む) で確認する。
  const isAttendable = !!today;
  const isOffDay = !!today && today.mode === 'off';

  // 「修正する」を押した時に出す確認ブロック (T6: confirm() ではなくインライン)
  const [confirmTarget, setConfirmTarget] = useState<'today' | 'yesterday' | null>(
    null,
  );

  const handleTodayClick = () => {
    if (hasTodayRecord) setConfirmTarget('today');
    else onLogMood?.();
  };
  const handleYesterdayClick = () => {
    if (hasYesterdayRecord) setConfirmTarget('yesterday');
    else onLogYesterday?.();
  };

  return (
    <div
      data-screen-label={label}
      style={{
        width: '100%',
        height: '100%',
        background: PALETTE.cream,
        fontFamily: ROUNDED_FONT,
        color: PALETTE.ink,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            padding: '8px 22px 10px',
            borderBottom: `1px solid ${PALETTE.sage}`,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9,
                color: PALETTE.inkSoft,
                letterSpacing: '0.18em',
                fontWeight: 700,
              }}
            >
              SEED · DAILY
            </div>
            <div
              style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 2 }}
            >
              VOL.{totalDays} · {nickname}'s edition
            </div>
          </div>
          <div
            style={{
              fontSize: 10,
              color: PALETTE.sageDeep,
              fontWeight: 700,
            }}
          >
            🤝 {milestone.label}
          </div>
        </div>

        <div
          style={{
            padding: '12px 22px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              fontSize: 56,
              lineHeight: 0.95,
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            {mmdd}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{weekday}</div>
            <div
              style={{
                fontSize: 10,
                color: PALETTE.inkSoft,
                marginTop: 3,
                lineHeight: 1.55,
              }}
            >
              {header.line1}
              <br />
              {header.line2}
            </div>
          </div>
        </div>

        {/* 天気ウィジェット (同意済みなら詳細表示、未同意なら案内のみ) */}
        <div style={{ padding: '0 22px 6px' }}>
          <WeatherWidget
            weather={weather}
            consent={weatherConsent}
            onEnableWeather={onEnableWeather}
          />
        </div>

        <div
          style={{
            padding: '6px 24px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <BirdStage stage={stage} size={168} species={species} />
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: PALETTE.sageDeep,
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            {STAGE_LABEL[stage]}
            {eggName ? ` · ${eggName}` : ''}
          </div>
        </div>

        {showWhisper && (
          <div
            style={{
              margin: '14px 24px 0',
              paddingLeft: 14,
              borderLeft: `2px solid ${PALETTE.sage}`,
              fontSize: 13,
              lineHeight: 1.7,
              color: PALETTE.ink,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: PALETTE.sageDeep,
                fontWeight: 700,
                letterSpacing: '0.08em',
                marginBottom: 4,
              }}
            >
              {(eggName || 'BIRD').toUpperCase()} · WHISPER
            </div>
            <div>{whisper}</div>
          </div>
        )}

        <div
          style={{
            margin: '16px 24px 0',
            paddingTop: 14,
            borderTop: `1px solid ${PALETTE.sage}`,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
          }}
        >
          <button
            onClick={() => isAttendable && onOpenCheckIn?.()}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              textAlign: 'left',
              color: 'inherit',
              fontFamily: 'inherit',
              cursor: isAttendable ? 'pointer' : 'default',
              display: 'block',
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: PALETTE.inkSoft,
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>ATTENDANCE</span>
              {isAttendable && (
                <span style={{ color: PALETTE.sageDeep, fontSize: 11 }}>›</span>
              )}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                textDecoration: isAttendable ? 'underline' : 'none',
                textDecorationColor: PALETTE.sage,
                textDecorationThickness: 1.5,
                textUnderlineOffset: 3,
              }}
            >
              {att.title}
            </div>
            <div
              style={{
                fontSize: 10,
                color: PALETTE.inkSoft,
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              {att.sub}
              {isAttendable && (
                <>
                  <br />
                  <span
                    style={{ color: PALETTE.sageDeep, fontWeight: 700 }}
                  >
                    {isOffDay ? '打刻に進む →' : 'タップで打刻 →'}
                  </span>
                </>
              )}
            </div>
          </button>
          <div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: PALETTE.inkSoft,
                marginBottom: 4,
              }}
            >
              RECORD
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              これまで {totalDays}日
            </div>
            <div
              style={{
                fontSize: 10,
                color: PALETTE.inkSoft,
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              すこしずつ、
              <br />
              あなたのペースで。
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* インライン確認ブロック (T6) */}
          {confirmTarget != null && (
            <div
              style={{
                background: PALETTE.creamSoft,
                borderRadius: 14,
                border: `1.5px solid ${PALETTE.sage}`,
                padding: 12,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: PALETTE.ink,
                  lineHeight: 1.6,
                  marginBottom: 10,
                }}
              >
                {confirmTarget === 'today'
                  ? '今日はすでに記録済みです。内容を修正しますか？'
                  : '昨日の記録を修正しますか？'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setConfirmTarget(null)}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: '#fff',
                    color: PALETTE.inkSoft,
                    borderRadius: 10,
                    padding: '9px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: ROUNDED_FONT,
                    cursor: 'pointer',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    const target = confirmTarget;
                    setConfirmTarget(null);
                    if (target === 'today') onLogMood?.();
                    else onLogYesterday?.();
                  }}
                  style={{
                    flex: 1.4,
                    border: 'none',
                    background: PALETTE.sageDeep,
                    color: '#fff',
                    borderRadius: 10,
                    padding: '9px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: ROUNDED_FONT,
                    cursor: 'pointer',
                  }}
                >
                  修正する
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleTodayClick}
            style={{
              width: '100%',
              height: 52,
              border: 'none',
              borderRadius: 16,
              background: PALETTE.sageDeep,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              boxShadow: '0 6px 16px rgba(127,169,130,0.28)',
              cursor: 'pointer',
            }}
          >
            {hasTodayRecord ? '今日の記録を修正する　→' : '今日の様子を記録する　→'}
          </button>
          <button
            onClick={handleYesterdayClick}
            style={{
              width: '100%',
              height: 48,
              border: `1.5px solid ${PALETTE.sage}`,
              borderRadius: 16,
              background: '#fff',
              color: PALETTE.sageDeep,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              cursor: 'pointer',
            }}
          >
            {hasYesterdayRecord
              ? '昨日の記録を修正する　→'
              : '昨日の様子を記録する　→'}
          </button>
        </div>
      </div>

      <BottomTabs active="home" onChange={onTab} />
    </div>
  );
}
