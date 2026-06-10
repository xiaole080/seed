import type {
  ActivityFlag,
  ConditionFlag,
  MealStatus,
  MedicationStatus,
  NightAwakenings,
  SleepIssue,
} from '../../data/types';
import type { StoredDailyRecord } from '../../data/store';
import {
  sleepStats,
  mealStats,
  exerciseStats,
  conditionStats,
  medicationStats,
} from '../../data/historyStats';
import { SECTION_TITLE, EMPTY_COPY } from '../../data/historyCopy';
import {
  SLEEP_ISSUE_LABELS,
  MEAL_STATUS_LABELS,
  ACTIVITY_LABELS,
  CONDITION_LABELS,
  MED_STATUS_LABELS,
  NIGHT_AWAKENING_LABEL,
} from '../../data/historyView';
import { PALETTE } from '../../theme';
import { SectionCard, EmptyNote, ChipRow, CardHeading } from './parts';

// ON の記録項目だけカード表示する (T6 / T7)。
export function RecordItemCards({
  recordIds,
  records,
}: {
  recordIds: string[];
  records: StoredDailyRecord[];
}) {
  if (recordIds.length === 0) {
    return (
      <SectionCard>
        <EmptyNote text={EMPTY_COPY.noRecordItems} />
      </SectionCard>
    );
  }

  return (
    <>
      {recordIds.includes('sleep') && (
        <SectionCard>
          <SleepCard records={records} />
        </SectionCard>
      )}
      {recordIds.includes('meal') && (
        <SectionCard>
          <MealCard records={records} />
        </SectionCard>
      )}
      {recordIds.includes('exercise') && (
        <SectionCard>
          <ExerciseCard records={records} />
        </SectionCard>
      )}
      {recordIds.includes('condition') && (
        <SectionCard>
          <ConditionCard records={records} />
        </SectionCard>
      )}
      {recordIds.includes('meds') && (
        <SectionCard>
          <MedsCard records={records} />
        </SectionCard>
      )}
    </>
  );
}

function SleepCard({ records }: { records: StoredDailyRecord[] }) {
  const stats = sleepStats(records);
  return (
    <div>
      <CardHeading id="sleep" title={SECTION_TITLE.sleep} />
      {stats.recordedDays === 0 ? (
        <EmptyNote text={EMPTY_COPY.sleep} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>
            睡眠を記録した日: {stats.recordedDays}日
          </div>
          {(stats.avgBedtime || stats.avgWakeTime) && (
            <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>
              {stats.avgBedtime && <>入眠 だいたい {stats.avgBedtime}</>}
              {stats.avgBedtime && stats.avgWakeTime && ' ／ '}
              {stats.avgWakeTime && <>起床 だいたい {stats.avgWakeTime}</>}
            </div>
          )}
          {stats.awakenings.length > 0 && (
            <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>
              {NIGHT_AWAKENING_LABEL[stats.awakenings[0].id as NightAwakenings]}
              日が多めです
            </div>
          )}
          {stats.issues.length > 0 && (
            <ChipRow
              items={stats.issues.slice(0, 5).map((it) => ({
                key: it.id,
                label: SLEEP_ISSUE_LABELS[it.id as SleepIssue]?.label ?? it.id,
                icon: SLEEP_ISSUE_LABELS[it.id as SleepIssue]?.icon,
                count: it.count,
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MealCard({ records }: { records: StoredDailyRecord[] }) {
  const stats = mealStats(records);
  return (
    <div>
      <CardHeading id="meal" title={SECTION_TITLE.meal} />
      {stats.recordedDays === 0 ? (
        <EmptyNote text={EMPTY_COPY.meal} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>
            食事を記録した日: {stats.recordedDays}日
          </div>
          {stats.statuses.length > 0 && (
            <ChipRow
              items={stats.statuses.map((it) => ({
                key: it.id,
                label: MEAL_STATUS_LABELS[it.id as MealStatus]?.label ?? it.id,
                icon: MEAL_STATUS_LABELS[it.id as MealStatus]?.icon,
                count: it.count,
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ records }: { records: StoredDailyRecord[] }) {
  const stats = exerciseStats(records);
  return (
    <div>
      <CardHeading id="exercise" title={SECTION_TITLE.exercise} />
      {stats.recordedDays === 0 ? (
        <EmptyNote text={EMPTY_COPY.exercise} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>
            運動・活動を記録した日: {stats.recordedDays}日
          </div>
          {stats.activities.length > 0 && (
            <ChipRow
              items={stats.activities.slice(0, 6).map((it) => ({
                key: it.id,
                label: ACTIVITY_LABELS[it.id as ActivityFlag]?.label ?? it.id,
                icon: ACTIVITY_LABELS[it.id as ActivityFlag]?.icon,
                count: it.count,
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ConditionCard({ records }: { records: StoredDailyRecord[] }) {
  const stats = conditionStats(records);
  return (
    <div>
      <CardHeading id="condition" title={SECTION_TITLE.condition} />
      {stats.recordedDays === 0 ? (
        <EmptyNote text={EMPTY_COPY.condition} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>
            体調を記録した日: {stats.recordedDays}日
          </div>
          {stats.flags.length > 0 && (
            <ChipRow
              items={stats.flags.slice(0, 6).map((it) => ({
                key: it.id,
                label: CONDITION_LABELS[it.id as ConditionFlag]?.label ?? it.id,
                icon: CONDITION_LABELS[it.id as ConditionFlag]?.icon,
                count: it.count,
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MedsCard({ records }: { records: StoredDailyRecord[] }) {
  // 服薬は medicationStatus の分布のみ表示。薬名・用量などは扱わない。
  const stats = medicationStats(records);
  return (
    <div>
      <CardHeading id="meds" title={SECTION_TITLE.meds} />
      {stats.recordedDays === 0 ? (
        <EmptyNote text={EMPTY_COPY.meds} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>
            服薬を記録した日: {stats.recordedDays}日
          </div>
          {stats.statuses.length > 0 && (
            <ChipRow
              items={stats.statuses.map((it) => ({
                key: it.id,
                label:
                  MED_STATUS_LABELS[it.id as MedicationStatus]?.label ?? it.id,
                icon: MED_STATUS_LABELS[it.id as MedicationStatus]?.icon,
                count: it.count,
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}
