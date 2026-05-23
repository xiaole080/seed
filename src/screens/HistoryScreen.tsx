import { useMemo, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { BottomTabs, type TabId } from '../components/BottomTabs';
import { MOODS, PRIMARY_INFLUENCES, CATEGORY_BY_ID } from '../data/moods';
import { RECORD_PRESETS, DEFAULT_RECORD_IDS } from '../data/records';
import type {
  ActivityFlag,
  AttendanceMonthlyRecord,
  ConditionFlag,
  MealStatus,
  MedicationStatus,
  NightAwakenings,
  PrimaryInfluence,
  SleepIssue,
} from '../data/types';
// データは localStorage の読み取りのみ。書き込み・外部送信は行わない。
import { listDailyRecords, listAttendanceByMonth, todayISO } from '../data/store';
import type { StoredDailyRecord } from '../data/store';
import {
  rangeFor,
  monthsInRange,
  filterDailyByRange,
  filterAttendanceByRange,
  moodSeries,
  averageMood,
  countRecordedDaysInRange,
  influenceRanking,
  attendanceSummary,
  sleepStats,
  mealStats,
  exerciseStats,
  conditionStats,
  medicationStats,
  rangeOverview,
  datesInRange,
  type HistoryRange,
  type AttendanceDay,
} from '../data/historyStats';
import {
  RANGE_LABEL,
  RANGE_TERM,
  SUMMARY_COPY,
  EMPTY_COPY,
  SECTION_TITLE,
  ATTEND_STATUS_LABEL,
  NOTE_COPY,
} from '../data/historyCopy';

interface HistoryScreenProps {
  /** 「じぶん」画面で ON の記録項目。既定は全 5 項目 ON。 */
  recordIds?: string[];
  /** 初期の期間モード。既定は 7 日。 */
  initialRange?: HistoryRange;
  onTab?: (t: TabId) => void;
}

const RANGES: HistoryRange[] = ['7d', '14d', 'month'];

// 詳細記録カテゴリの label/icon を CATEGORIES のサブ質問選択肢から引くための補助。
function optionLabelMap(
  categoryId: string,
  sectionId: string,
): Record<string, { label: string; icon?: string }> {
  const cat = CATEGORY_BY_ID[categoryId];
  const section = cat?.sections.find((s) => s.id === sectionId);
  const out: Record<string, { label: string; icon?: string }> = {};
  for (const o of section?.options ?? []) {
    out[o.id] = { label: o.label, icon: o.icon };
  }
  return out;
}

const SLEEP_ISSUE_LABELS = optionLabelMap('sleep', 'issues');
const MEAL_STATUS_LABELS = optionLabelMap('meal', 'mealStatus');
const ACTIVITY_LABELS = optionLabelMap('exercise', 'activityFlags');
const CONDITION_LABELS = optionLabelMap('condition', 'conditionFlags');
const MED_STATUS_LABELS = optionLabelMap('meds', 'medicationStatus');

const NIGHT_AWAKENING_LABEL: Record<NightAwakenings, string> = {
  none: '夜中に起きなかった',
  once: '夜中に1回起きた',
  multiple: '夜中に2回以上起きた',
};

const PRESET_BY_ID = Object.fromEntries(RECORD_PRESETS.map((p) => [p.id, p]));

export function HistoryScreen({
  recordIds = DEFAULT_RECORD_IDS,
  initialRange = '7d',
  onTab,
}: HistoryScreenProps) {
  const [range, setRange] = useState<HistoryRange>(initialRange);

  // localStorage 読み取りは1回だけ。期間切替は下の useMemo で再計算する。
  const allDaily = useMemo<StoredDailyRecord[]>(() => listDailyRecords(), []);
  const today = useMemo(() => todayISO(), []);

  const dateRange = useMemo(() => rangeFor(range, today), [range, today]);

  const daily = useMemo(
    () => filterDailyByRange(allDaily, dateRange),
    [allDaily, dateRange],
  );

  // 通所ストアは月単位取得 → レンジが触れる月をすべて読み、レンジで再フィルタ。
  const attendance = useMemo(() => {
    const merged = monthsInRange(dateRange).flatMap((m) =>
      listAttendanceByMonth(m),
    );
    return filterAttendanceByRange(merged, dateRange);
  }, [dateRange]);

  const overview = useMemo(
    () => rangeOverview(daily, attendance),
    [daily, attendance],
  );

  const summaryText = useMemo(() => {
    if (overview.recordedDays === 0) return SUMMARY_COPY.noRecords;
    if (range === 'month') {
      return SUMMARY_COPY.monthlyReview(
        overview.recordedDays,
        overview.averageMood,
      );
    }
    return SUMMARY_COPY.recorded(RANGE_TERM[range], overview.recordedDays);
  }, [overview, range]);

  return (
    <PhoneShell bg={PALETTE.creamSoft} label="06 きろく">
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>きろく</div>
          <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 4 }}>
            {RANGE_TERM[range]}の あなたの 様子です
          </div>
        </div>

        {/* 期間切替タブ (T1) */}
        <div
          style={{
            display: 'flex',
            background: '#fff',
            borderRadius: 14,
            padding: 4,
            boxShadow: CARD_SHADOW,
            marginBottom: 12,
            gap: 2,
          }}
        >
          {RANGES.map((r) => {
            const sel = range === r;
            return (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  flex: 1,
                  border: 'none',
                  cursor: 'pointer',
                  background: sel ? PALETTE.sageDeep : 'transparent',
                  color: sel ? '#fff' : PALETTE.inkSoft,
                  padding: '9px 4px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontFamily: ROUNDED_FONT,
                  fontWeight: sel ? 700 : 500,
                  transition: 'all .12s',
                }}
              >
                {RANGE_LABEL[r]}
              </button>
            );
          })}
        </div>

        {/* 責めないサマリー一言 (T2) */}
        <div
          style={{
            fontSize: 11.5,
            color: PALETTE.sageDeep,
            fontWeight: 600,
            marginBottom: 14,
            padding: '10px 12px',
            background: PALETTE.sageSoft,
            borderRadius: 12,
            lineHeight: 1.5,
          }}
        >
          🌱 {summaryText}
        </div>

        {/* サマリーカード3つ (実データ) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <StatCard
            label="記録した日"
            value={String(countRecordedDaysInRange(daily))}
            sub="日"
          />
          <StatCard
            label="記録した日の平均"
            value={overview.averageMood == null ? '—' : String(overview.averageMood)}
            sub={overview.averageMood == null ? '' : '/5'}
          />
          <StatCard
            label="通所した日"
            value={String(overview.attendedDays)}
            sub="日"
          />
        </div>

        {/* 気分の可視化 (T3) */}
        <SectionCard>
          <MoodTrend records={daily} rangeLabel={RANGE_LABEL[range]} />
        </SectionCard>

        {/* 影響要因ランキング (T4) */}
        <SectionCard>
          <InfluenceRanking records={daily} />
        </SectionCard>

        {/* 通所リズム (T5) */}
        <SectionCard>
          <AttendanceSection records={attendance} />
        </SectionCard>

        {/* ON の記録項目だけカード表示 (T6 / T7) */}
        <RecordItemCards recordIds={recordIds} records={daily} />

        {/* T13: OFF項目に過去データがある場合の控えめ表示 */}
        <HiddenItemsNote recordIds={recordIds} records={daily} />

        {/* T12: 日付つき時系列。記録なしの日も空きとして表示する。 */}
        <DateTimeline
          dates={datesInRange(dateRange)}
          daily={daily}
          attendance={attendance}
          recordIds={recordIds}
        />

        {/* さいきんのきろく + 自由記述折りたたみ (T7) */}
        <RecentRecords records={daily} />
      </div>
      <BottomTabs active="log" onChange={onTab} />
    </PhoneShell>
  );
}

// ── 汎用パーツ ───────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '12px 8px',
        boxShadow: CARD_SHADOW,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 10, color: PALETTE.inkSoft, marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: PALETTE.sageDeep,
          lineHeight: 1,
        }}
      >
        {value}
        {sub && (
          <span
            style={{ fontSize: 11, color: PALETTE.inkSoft, marginLeft: 2 }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 18,
        padding: '16px 14px',
        boxShadow: CARD_SHADOW,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
      {title}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: PALETTE.inkSoft,
        padding: '10px 4px',
        lineHeight: 1.6,
      }}
    >
      {text}
    </div>
  );
}

/** 頻度チップの並び */
function ChipRow({
  items,
}: {
  items: { key: string; label: string; icon?: string; count: number }[];
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((it) => (
        <span
          key={it.key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: PALETTE.sageSoft,
            color: PALETTE.inkSoft,
            borderRadius: 999,
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {it.icon && <span>{it.icon}</span>}
          <span>{it.label}</span>
          <span style={{ color: PALETTE.sageDeep, fontWeight: 700 }}>
            {it.count}
          </span>
        </span>
      ))}
    </div>
  );
}

// ── 気分の可視化 (T3) ────────────────────────────────────────

function MoodTrend({
  records,
  rangeLabel,
}: {
  records: StoredDailyRecord[];
  rangeLabel: string;
}) {
  const series = moodSeries(records);
  const avg = averageMood(records);

  const Header = (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700 }}>{SECTION_TITLE.mood}</div>
      <div style={{ fontSize: 10, color: PALETTE.inkSoft }}>{rangeLabel}</div>
    </div>
  );

  if (series.length === 0) {
    return (
      <div>
        {Header}
        <EmptyNote text={EMPTY_COPY.mood} />
      </div>
    );
  }

  const W = 300;
  const H = 140;
  const P = 16;
  // 1件のときも除算で落ちないよう、分母を最低 1 にする。
  const denom = Math.max(series.length - 1, 1);
  const points = series.map((p, i) => {
    const x =
      series.length === 1
        ? W / 2
        : P + (i / denom) * (W - 2 * P);
    const y = H - P - ((p.mood - 1) / 4) * (H - 2 * P);
    return [x, y] as const;
  });
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`)
    .join(' ');

  return (
    <div>
      {Header}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {[1, 2, 3, 4, 5].map((v) => {
          const y = H - P - ((v - 1) / 4) * (H - 2 * P);
          return (
            <line
              key={v}
              x1={P}
              x2={W - P}
              y1={y}
              y2={y}
              stroke={PALETTE.sageSoft}
              strokeWidth="1"
              strokeDasharray={v === 3 ? '0' : '2 4'}
            />
          );
        })}
        {points.length >= 2 && (
          <path
            d={path}
            fill="none"
            stroke={PALETTE.sageDeep}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={i === points.length - 1 ? 5 : 3.5}
            fill="#fff"
            stroke={PALETTE.sageDeep}
            strokeWidth={i === points.length - 1 ? 2.5 : 1.5}
          />
        ))}
        <text x="4" y={P + 3} fontSize="9" fill={PALETTE.inkSoft}>
          げんき
        </text>
        <text x="4" y={H - P + 3} fontSize="9" fill={PALETTE.inkSoft}>
          つらい
        </text>
      </svg>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          marginTop: 8,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>記録した日: {series.length}日</span>
        {avg != null && (
          <span>
            記録した日の平均:{' '}
            <span style={{ color: PALETTE.sageDeep, fontWeight: 700 }}>
              {avg}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

// ── 影響要因ランキング (T4) ──────────────────────────────────

const INFLUENCE_BY_ID = Object.fromEntries(
  PRIMARY_INFLUENCES.map((p) => [p.id, p]),
);

function InfluenceRanking({ records }: { records: StoredDailyRecord[] }) {
  const ranking = influenceRanking(records).slice(0, 5);

  return (
    <div>
      <SectionHeading title={SECTION_TITLE.influence} />
      {ranking.length === 0 ? (
        <EmptyNote text={EMPTY_COPY.influence} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {ranking.map((it) => {
            const opt = INFLUENCE_BY_ID[it.id as PrimaryInfluence];
            return (
              <div
                key={it.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: PALETTE.sageSoft,
                  borderRadius: 10,
                  padding: '8px 10px',
                }}
              >
                <span style={{ fontSize: 15 }}>{opt?.icon ?? '✨'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>
                  {opt?.label ?? it.id}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: PALETTE.sageDeep,
                    fontWeight: 700,
                  }}
                >
                  {it.count}回
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 通所リズム (T5) ──────────────────────────────────────────

const ATTEND_CELL: Record<
  AttendanceDay['status'],
  { bg: string; fg: string; mark: string }
> = {
  attended: { bg: PALETTE.sageDeep, fg: '#fff', mark: '🌱' },
  planned: { bg: '#B8D4B5', fg: '#fff', mark: '·' },
  off: { bg: PALETTE.sageSoft, fg: PALETTE.inkSoft, mark: '·' },
  unclocked: { bg: PALETTE.amberSoft, fg: PALETTE.inkSoft, mark: '?' },
};

function AttendanceSection({
  records,
}: {
  records: AttendanceMonthlyRecord[];
}) {
  const summary = attendanceSummary(records);

  return (
    <div>
      <SectionHeading title={SECTION_TITLE.attendance} />
      {summary.days.length === 0 ? (
        <EmptyNote text={EMPTY_COPY.attendance} />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
            }}
          >
            {summary.days.map((d) => {
              const cell = ATTEND_CELL[d.status];
              return (
                <div
                  key={d.date}
                  title={`${d.date} · ${ATTEND_STATUS_LABEL[d.status]}`}
                  style={{
                    aspectRatio: '1',
                    background: cell.bg,
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: cell.fg,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <span>{cell.mark}</span>
                  <span style={{ fontSize: 8, fontWeight: 600 }}>
                    {Number(d.date.slice(-2))}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 10,
              fontSize: 10,
              color: PALETTE.inkSoft,
            }}
          >
            <LegendDot color={ATTEND_CELL.attended.bg} label="通所済み" />
            <LegendDot color={ATTEND_CELL.planned.bg} label="通所予定" />
            <LegendDot color={ATTEND_CELL.unclocked.bg} label="未打刻" />
            <LegendDot color={ATTEND_CELL.off.bg} label="休み" />
          </div>
          <div
            style={{
              fontSize: 11,
              color: PALETTE.inkSoft,
              marginTop: 8,
              lineHeight: 1.6,
            }}
          >
            通所済み {summary.attended}日 ／ 未打刻 {summary.unclocked}日
          </div>
        </>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          width: 10,
          height: 10,
          background: color,
          borderRadius: 3,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}

// ── ON の記録項目カード (T6 / T7) ────────────────────────────

function RecordItemCards({
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

function CardHeading({ id, title }: { id: string; title: string }) {
  const preset = PRESET_BY_ID[id];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
      }}
    >
      <span style={{ fontSize: 15 }}>{preset?.icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{title}</span>
    </div>
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
                label:
                  SLEEP_ISSUE_LABELS[it.id as SleepIssue]?.label ?? it.id,
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
                label:
                  MEAL_STATUS_LABELS[it.id as MealStatus]?.label ?? it.id,
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
                label:
                  ACTIVITY_LABELS[it.id as ActivityFlag]?.label ?? it.id,
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
                label:
                  CONDITION_LABELS[it.id as ConditionFlag]?.label ?? it.id,
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

// ── T12: 日付つき時系列セクション ─────────────────────────────
// 仕様 §10:
//  - 選択期間内のすべての日付を新しい順に表示
//  - 記録がある日は気分 + 主要項目 + 通所打刻
//  - 記録がない日は「記録なし」 (0点扱いしない)
//  - 自由記述・その他欄がある日は折りたたみで開閉。本文を一覧に露出しない。

const MEAL_STATUS_QUICK_LABEL = MEAL_STATUS_LABELS;
const MED_STATUS_QUICK_LABEL = MED_STATUS_LABELS;

function DateTimeline({
  dates,
  daily,
  attendance,
  recordIds,
}: {
  dates: string[];
  daily: StoredDailyRecord[];
  attendance: AttendanceMonthlyRecord[];
  recordIds: string[];
}) {
  // 日付 → DailyRecord / Attendance のインデックス
  const dailyByDate = useMemo(() => {
    const m: Record<string, StoredDailyRecord> = {};
    for (const r of daily) m[r.date] = r;
    return m;
  }, [daily]);
  const attByDate = useMemo(() => {
    const m: Record<string, AttendanceMonthlyRecord> = {};
    for (const r of attendance) m[r.date] = r;
    return m;
  }, [attendance]);

  // 新しい順
  const sortedDates = useMemo(() => dates.slice().sort((a, b) => (a < b ? 1 : -1)), [dates]);

  return (
    <>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: PALETTE.ink,
          marginBottom: 8,
          marginTop: 4,
        }}
      >
        日付ごとのきろく
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {sortedDates.map((d) => (
          <DateTimelineRow
            key={d}
            date={d}
            record={dailyByDate[d]}
            attendance={attByDate[d]}
            recordIds={recordIds}
          />
        ))}
      </div>
    </>
  );
}

function DateTimelineRow({
  date,
  record,
  attendance,
  recordIds,
}: {
  date: string;
  record: StoredDailyRecord | undefined;
  attendance: AttendanceMonthlyRecord | undefined;
  recordIds: string[];
}) {
  const [open, setOpen] = useState(false);

  // 自由記述・その他欄の有無 (折りたたみ表示の対象)
  const hasNote = !!record?.note && record.note.trim() !== '';
  const otherTexts: { label: string; text: string }[] = [];
  if (record?.influenceOtherText) {
    otherTexts.push({ label: '影響していそうなこと', text: record.influenceOtherText });
  }
  if (record?.sleep?.otherText && recordIds.includes('sleep')) {
    otherTexts.push({ label: '睡眠', text: record.sleep.otherText });
  }
  if (record?.meal?.otherText && recordIds.includes('meal')) {
    otherTexts.push({ label: '食事', text: record.meal.otherText });
  }
  if (record?.exercise?.otherText && recordIds.includes('exercise')) {
    otherTexts.push({ label: '運動・活動', text: record.exercise.otherText });
  }
  if (record?.condition?.otherText && recordIds.includes('condition')) {
    otherTexts.push({ label: '体調', text: record.condition.otherText });
  }
  if (record?.medication?.otherText && recordIds.includes('meds')) {
    otherTexts.push({ label: '服薬', text: record.medication.otherText });
  }
  const hasExpandable = hasNote || otherTexts.length > 0;

  const moodObj = record ? MOODS.find((m) => m.v === record.mood) ?? MOODS[2] : null;

  // 主要項目の要約 (ON のものだけ)
  const lines: string[] = [];
  if (record) {
    if (record.primaryInfluence?.length) {
      const labels = record.primaryInfluence
        .map((id) => INFLUENCE_BY_ID[id]?.label ?? id)
        .slice(0, 3);
      lines.push(`影響していそうなこと: ${labels.join('・')}`);
    }
    if (recordIds.includes('sleep') && record.sleep) {
      const parts: string[] = [];
      if (record.sleep.bedtime) parts.push(`入眠 ${record.sleep.bedtime}`);
      if (record.sleep.wakeTime) parts.push(`起床 ${record.sleep.wakeTime}`);
      if (record.sleep.sleepIssues?.length) {
        const lbl =
          SLEEP_ISSUE_LABELS[record.sleep.sleepIssues[0] as SleepIssue]?.label ??
          record.sleep.sleepIssues[0];
        parts.push(lbl);
      }
      if (parts.length) lines.push(`睡眠: ${parts.join(' / ')}`);
    }
    if (recordIds.includes('meal') && record.meal?.mealStatus) {
      const lbl =
        MEAL_STATUS_QUICK_LABEL[record.meal.mealStatus as MealStatus]?.label ??
        record.meal.mealStatus;
      lines.push(`食事: ${lbl}`);
    }
    if (recordIds.includes('exercise') && record.exercise?.activityFlags?.length) {
      const lbl =
        ACTIVITY_LABELS[record.exercise.activityFlags[0] as ActivityFlag]?.label ??
        record.exercise.activityFlags[0];
      lines.push(`運動・活動: ${lbl}`);
    }
    if (recordIds.includes('condition') && record.condition?.conditionFlags?.length) {
      const lbl =
        CONDITION_LABELS[record.condition.conditionFlags[0] as ConditionFlag]?.label ??
        record.condition.conditionFlags[0];
      lines.push(`体調: ${lbl}`);
    }
    if (recordIds.includes('meds') && record.medication?.medicationStatus) {
      const lbl =
        MED_STATUS_QUICK_LABEL[
          record.medication.medicationStatus as MedicationStatus
        ]?.label ?? record.medication.medicationStatus;
      lines.push(`服薬: ${lbl}`);
    }
  }

  // 通所打刻表示 (未打刻は「未打刻」と表記。「欠席」とは断定しない)
  let attendanceLine: string | null = null;
  if (attendance) {
    if (attendance.checkIn || attendance.checkOut) {
      attendanceLine = `通所: ${attendance.checkIn ?? '—'} - ${attendance.checkOut ?? '—'}`;
    } else if (attendance.plannedMode && attendance.plannedMode !== 'off') {
      attendanceLine = '通所: 未打刻';
    }
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '10px 12px',
        boxShadow: CARD_SHADOW,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 22 }}>{moodObj?.face ?? '・'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{formatDate(date)}</div>
          {record ? (
            <>
              <div style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 2 }}>
                気分: {moodObj?.label}（{record.mood}/5）
              </div>
              {lines.map((line, i) => (
                <div
                  key={i}
                  style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 2 }}
                >
                  {line}
                </div>
              ))}
              {attendanceLine && (
                <div style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 2 }}>
                  {attendanceLine}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 2 }}>
              記録なし
              {attendanceLine && <span> ・ {attendanceLine}</span>}
            </div>
          )}
        </div>
        {hasExpandable && (
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              border: 'none',
              cursor: 'pointer',
              background: PALETTE.sageSoft,
              color: PALETTE.sageDeep,
              borderRadius: 999,
              padding: '5px 10px',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              whiteSpace: 'nowrap',
            }}
          >
            {open ? NOTE_COPY.close : '自分用メモあり'}
          </button>
        )}
      </div>
      {hasExpandable && open && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            background: PALETTE.creamSoft,
            borderRadius: 10,
            fontSize: 11,
            color: PALETTE.ink,
            lineHeight: 1.6,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {otherTexts.map((o, i) => (
            <div key={i}>
              <span style={{ color: PALETTE.inkSoft, fontWeight: 700 }}>
                {o.label}:
              </span>{' '}
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {o.text}
              </span>
            </div>
          ))}
          {hasNote && (
            <div>
              <span style={{ color: PALETTE.inkSoft, fontWeight: 700 }}>メモ:</span>{' '}
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {record?.note}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}

// ── T13: OFF項目に過去データがある場合の控えめ表示 ─────────
function HiddenItemsNote({
  recordIds,
  records,
}: {
  recordIds: string[];
  records: StoredDailyRecord[];
}) {
  const offWithPast: { id: string; label: string; days: number }[] = [];
  const checkOff = (
    id: 'sleep' | 'meal' | 'exercise' | 'condition' | 'meds',
    label: string,
    has: (r: StoredDailyRecord) => boolean,
  ) => {
    if (recordIds.includes(id)) return;
    const days = records.filter(has).length;
    if (days > 0) offWithPast.push({ id, label, days });
  };
  checkOff('sleep', '睡眠', (r) => r.sleep != null);
  checkOff('meal', '食事', (r) => r.meal != null);
  checkOff('exercise', '運動・活動', (r) => r.exercise != null);
  checkOff('condition', '体調', (r) => r.condition != null);
  checkOff('meds', '服薬', (r) => r.medication != null);

  if (offWithPast.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: 12,
        padding: '10px 12px',
        background: PALETTE.creamSoft,
        borderRadius: 12,
        fontSize: 11,
        color: PALETTE.inkSoft,
        lineHeight: 1.6,
      }}
    >
      {offWithPast.map((o) => (
        <div key={o.id}>
          非表示中の記録あり（{o.label} {o.days} 日分）
        </div>
      ))}
    </div>
  );
}

// ── さいきんのきろく + 自由記述折りたたみ (T7) ───────────────

function RecentRecords({ records }: { records: StoredDailyRecord[] }) {
  const recent = records.slice(-5).reverse();

  return (
    <>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: PALETTE.ink,
          marginBottom: 8,
        }}
      >
        {SECTION_TITLE.recent}
      </div>
      {recent.length === 0 ? (
        <SectionCard>
          <EmptyNote text="まだ記録がありません。" />
        </SectionCard>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 12,
          }}
        >
          {recent.map((d) => (
            <RecentRow key={d.date} record={d} />
          ))}
        </div>
      )}
    </>
  );
}

function RecentRow({ record }: { record: StoredDailyRecord }) {
  // 自由記述 note は既定で非表示。本人が「メモを読む」を押したときだけ表示する。
  const [noteOpen, setNoteOpen] = useState(false);
  const moodObj = MOODS.find((m) => m.v === record.mood) ?? MOODS[2];
  const hasNote = typeof record.note === 'string' && record.note.trim() !== '';

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '10px 12px',
        boxShadow: CARD_SHADOW,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 22 }}>{moodObj.face}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{record.date}</div>
          <div
            style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 2 }}
          >
            {moodObj.label}
            {record.sleep?.bedtime && ` · 入眠 ${record.sleep.bedtime}`}
          </div>
        </div>
        {hasNote && (
          <button
            onClick={() => setNoteOpen((v) => !v)}
            style={{
              border: 'none',
              cursor: 'pointer',
              background: PALETTE.sageSoft,
              color: PALETTE.sageDeep,
              borderRadius: 999,
              padding: '5px 10px',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              whiteSpace: 'nowrap',
            }}
          >
            {noteOpen ? NOTE_COPY.close : NOTE_COPY.open}
          </button>
        )}
      </div>
      {/* note 本文は折りたたみを開いたときだけ描画。先頭抜粋・プレビューは出さない。 */}
      {hasNote && noteOpen && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            background: PALETTE.creamSoft,
            borderRadius: 10,
            fontSize: 11,
            color: PALETTE.ink,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {record.note}
        </div>
      )}
    </div>
  );
}
