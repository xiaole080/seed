import { PALETTE, ROUNDED_FONT } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { BottomTabs, type TabId } from '../components/BottomTabs';
import type {
  AttendanceState,
  ClosedDayActivity,
  TodayCard,
} from '../data/types';
import { useCheckInScreen } from './checkin/useCheckInScreen';
import { AttendanceStatusCard } from './checkin/AttendanceStatusCard';
import { HeroBlock } from './checkin/HeroBlock';
import { ClosedDayNotice } from './checkin/ClosedDayNotice';
import { CheckInActions } from './checkin/CheckInActions';
import { OffActions } from './checkin/OffActions';

interface CheckInScreenProps {
  today?: TodayCard;
  state?: AttendanceState;
  nickname?: string;
  /** 当日に保存済みの事務所休業日アクティビティ (案 X)。表示のみに使う。 */
  closedDayActivity?: ClosedDayActivity;
  onBack?: () => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onTab?: (t: TabId) => void;
  /**
   * T1-C: 「時刻を手で直す」インライン編集 → 保存。
   * 親側で upsertAttendance + bumpStore を行う。
   * checkOut が undefined のときは帰宅時刻なしで保存。
   */
  onTimeEdit?: (next: { checkIn?: string; checkOut?: string }) => void;
  /**
   * T3-B: 今日の打刻 (AttendanceMonthlyRecord) を丸ごと取り消す。
   * 親側で deleteAttendance(todayISO()) + bumpStore を行う。
   * §13.2: Sheets 既送信のぶんはここでは取り消せない (UI 側で注記)。
   */
  onDelete?: () => void;
  /**
   * 案 X: 事務所休業日の「軽い記録」(home_rest / outing / medical) を保存する。
   * 親側で setClosedDayActivity + bumpStore を行う。端末ローカル限定。
   */
  onClosedDayActivity?: (value: ClosedDayActivity) => void;
}

export function CheckInScreen({
  today = {
    mode: 'office',
    band: 'full',
    dayLabel: '土',
  },
  state = 'before',
  nickname = 'はる',
  closedDayActivity,
  onBack,
  onCheckIn,
  onCheckOut,
  onTab,
  onTimeEdit,
  onDelete,
  onClosedDayActivity,
}: CheckInScreenProps) {
  const vm = useCheckInScreen({
    today,
    state,
    onCheckIn,
    onCheckOut,
    onTimeEdit,
    onDelete,
  });

  return (
    <PhoneShell bg={PALETTE.cream} label="08 打刻">
      <BackgroundLeaves />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '4px 22px 16px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <button
            onClick={onBack}
            aria-label="もどる"
            style={{
              width: 44,
              height: 44,
              border: 'none',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.7)',
              fontSize: 18,
              cursor: 'pointer',
              color: PALETTE.ink,
              fontFamily: ROUNDED_FONT,
              flexShrink: 0,
            }}
          >
            ←
          </button>
          <div style={{ fontSize: 13, color: PALETTE.inkSoft }}>
            {vm.headerDateLabel}
          </div>
          <div style={{ width: 44 }} />
        </div>

        <div
          style={{
            marginTop: 14,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: PALETTE.inkSoft,
            }}
          >
            ATTENDANCE
          </div>
          <div style={{ flex: 1, height: 1, background: PALETTE.sage }} />
        </div>

        <AttendanceStatusCard
          today={today}
          viewMode={vm.viewMode}
          state={vm.s}
          c={vm.c}
          isOff={vm.isOff}
          inTime={vm.inTime}
          outTime={vm.outTime}
        />

        <HeroBlock
          heroEmoji={vm.heroEmoji}
          isOff={vm.isOff}
          planIsOff={vm.planIsOff}
          effectiveMode={vm.effectiveMode}
          state={vm.s}
          viewMode={vm.viewMode}
          today={today}
          nickname={nickname}
        />

        {vm.officeClosed && (
          <ClosedDayNotice
            closedDayActivity={closedDayActivity}
            onClosedDayActivity={onClosedDayActivity}
          />
        )}

        {/* 責任分界: スクロール領域内で伸縮してよいのはこのスペーサーだけ。
            他の中身ブロックは flexShrink:0 で自然高さを保ち、超過分は
            overflowY:auto によるスクロールに回す (カード圧縮バグの再発防止)。 */}
        <div style={{ flex: 1 }} />

        {!vm.isOff && (
          <CheckInActions
            state={vm.s}
            isOffice={vm.isOffice}
            officeClosed={vm.officeClosed}
            planIsOff={vm.planIsOff}
            effectiveMode={vm.effectiveMode}
            onCheckIn={vm.handleCheckIn}
            onCheckOut={vm.handleCheckOut}
            onBack={onBack}
            setEffectiveMode={vm.setEffectiveMode}
            editing={vm.editing}
            beginEdit={vm.beginEdit}
            cancelEdit={vm.cancelEdit}
            saveEdit={vm.saveEdit}
            draftIn={vm.draftIn}
            draftOut={vm.draftOut}
            setDraftIn={vm.setDraftIn}
            setDraftOut={vm.setDraftOut}
            editError={vm.editError}
            confirmingDelete={vm.confirmingDelete}
            setConfirmingDelete={vm.setConfirmingDelete}
            doDelete={vm.doDelete}
          />
        )}

        {vm.isOff && (
          <OffActions
            officeClosed={vm.officeClosed}
            onBack={onBack}
            onAttend={() => vm.setEffectiveMode('office')}
          />
        )}

        {/* T2-A/T2-B: 「打刻 ≠ 連絡」を明示する C 案文言。 */}
        <div
          style={{
            marginTop: 12,
            fontSize: 10,
            color: PALETTE.inkSoft,
            textAlign: 'center',
            lineHeight: 1.6,
            flexShrink: 0,
          }}
        >
          この打刻は記録のためのものです。
          <br />
          事業所への出欠の連絡は、これまでどおりお願いします。
        </div>
      </div>
      <BottomTabs active="home" onChange={onTab} />
    </PhoneShell>
  );
}
