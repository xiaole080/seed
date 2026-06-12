import { PALETTE } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { BottomTabs, type TabId } from '../components/BottomTabs';
import { DEFAULT_RECORD_IDS } from '../data/records';
import { countRecordedDaysInRange } from '../data/historyStats';
import { MONTH_NAV_COPY } from '../data/historyCopy';
import { useHistoryScreen } from './history/useHistoryScreen';
import { useSwipeMonth } from './history/useSwipeMonth';
import { MonthNavHeader } from './history/MonthNavHeader';
import { StatCard, SectionCard } from './history/parts';
import { MoodTrend } from './history/MoodTrend';
import { InfluenceRanking } from './history/InfluenceRanking';
import { AttendanceSection } from './history/AttendanceSection';
import { RecordItemCards } from './history/RecordItemCards';
import { HiddenItemsNote } from './history/HiddenItemsNote';
import { DateTimeline } from './history/DateTimeline';
import { RecentRecords } from './history/RecentRecords';

interface HistoryScreenProps {
  /** 「わたし」画面で ON の記録項目。既定は全 5 項目 ON。 */
  recordIds?: string[];
  onTab?: (t: TabId) => void;
}

export function HistoryScreen({
  recordIds = DEFAULT_RECORD_IDS,
  onTab,
}: HistoryScreenProps) {
  const {
    headerLabel,
    canGoPrev,
    canGoNext,
    goPrev,
    goNext,
    timelineDates,
    daily,
    attendance,
    overview,
    summaryText,
  } = useHistoryScreen();

  // 横スワイプは補助操作 (T6)。境界越えは goPrev/goNext 側のガードで no-op。
  const swipeHandlers = useSwipeMonth(goPrev, goNext);

  return (
    <PhoneShell bg={PALETTE.creamSoft} label="06 きろく">
      <BackgroundLeaves />
      <div
        {...swipeHandlers}
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
            {MONTH_NAV_COPY.headerNote}
          </div>
        </div>

        {/* 月ナビゲーションヘッダー (month-nav T5) */}
        <MonthNavHeader
          label={headerLabel}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          onPrev={goPrev}
          onNext={goNext}
        />

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
            value={
              overview.averageMood == null ? '—' : String(overview.averageMood)
            }
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
          <MoodTrend records={daily} rangeLabel={headerLabel} />
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

        {/* T12: 日付つき時系列。記録なしの日も空きとして表示する。
            今月のみ未来日を出さないよう今日でクランプ済み (month-nav §2.1)。 */}
        <DateTimeline
          dates={timelineDates}
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
