import { PALETTE } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { BottomTabs, type TabId } from '../components/BottomTabs';
import { DEFAULT_SCHEDULE } from '../data/attendance';
import type { Schedule } from '../data/types';
import { computeRelationshipProgress } from '../data/careView';
import { useCareScreen } from './care/useCareScreen';
import { NoticeBanner } from './care/NoticeBanner';
import { RelationshipSection } from './care/RelationshipSection';
import { RoutineSection } from './care/RoutineSection';
import { OneOffSection } from './care/OneOffSection';
import { ConcernSection } from './care/ConcernSection';
import { FloatingAddButton, FabDialog } from './care/FabDialog';

interface CareScreenProps {
  totalDays?: number;
  eggName?: string;
  nickname?: string;
  schedule?: Schedule;
  onTab?: (t: TabId) => void;
}

export function CareScreen({
  totalDays = 12,
  eggName = '',
  nickname,
  schedule = DEFAULT_SCHEDULE,
  onTab,
}: CareScreenProps) {
  const progress = computeRelationshipProgress(totalDays);
  const care = useCareScreen(nickname);

  return (
    <PhoneShell bg={PALETTE.creamSoft} label="07 ケア">
      <BackgroundLeaves />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '4px 22px 12px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        <div style={{ marginTop: 6, marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>ケア</div>
          <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 4 }}>
            ちいさな目標と、鳥からのことば
          </div>
        </div>

        {care.noticeOpen && <NoticeBanner onDismiss={care.dismissNotice} />}

        <RelationshipSection
          eggName={eggName}
          totalDays={totalDays}
          progress={progress}
        />

        {/* ② まいにちのリズム ─────────────────────────── */}
        <RoutineSection
          routines={care.routines}
          logs={care.routineLogs}
          schedule={schedule}
          today={care.today}
          onDone={care.onRoutineDone}
          onRest={care.onRoutineRest}
          onUpdate={care.onRoutineUpdate}
          onDelete={care.onRoutineDelete}
        />

        {/* ③ 今日だけタスク ─────────────────────────── */}
        <OneOffSection
          tasks={care.oneoffs}
          seeds={care.seeds}
          onToggle={care.onOneoffToggle}
          onDelete={care.onOneoffDelete}
          confirming={care.confirmDeleteOneoff}
          onAskDelete={care.setConfirmDeleteOneoff}
          recentReward={care.recentReward}
        />

        {/* ④ いつかやってみたいこと ─────────────────── */}
        <ConcernSection
          concerns={care.concerns}
          confirmDeleteId={care.confirmDeleteConcern}
          onAskDelete={care.setConfirmDeleteConcern}
          onDelete={care.onDeleteConcern}
          onToOneoff={care.onConcernToOneoff}
          onToRoutine={care.onConcernToRoutine}
        />

        <div style={{ height: 8 }} />
        <div
          style={{
            marginTop: 4,
            padding: '10px 12px',
            background: PALETTE.creamSoft,
            borderRadius: 12,
            fontSize: 11,
            color: PALETTE.inkSoft,
            lineHeight: 1.7,
            textAlign: 'center',
          }}
        >
          達成できなくても、大丈夫。
          <br />
          休んだ日も、関係に影響はでません。
        </div>
        <div style={{ height: 80 }} />
      </div>

      {/* FAB */}
      <FloatingAddButton onClick={() => care.setFabOpen(true)} />
      {care.fabOpen && (
        <FabDialog onCancel={() => care.setFabOpen(false)} onAdd={care.onFabAdd} />
      )}

      <BottomTabs active="care" onChange={onTab} />
    </PhoneShell>
  );
}
