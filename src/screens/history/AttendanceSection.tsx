import { PALETTE } from '../../theme';
import type { AttendanceMonthlyRecord } from '../../data/types';
import { attendanceSummary, type AttendanceDay } from '../../data/historyStats';
import { SECTION_TITLE, EMPTY_COPY, ATTEND_STATUS_LABEL } from '../../data/historyCopy';
import { SectionHeading, EmptyNote } from './parts';

const ATTEND_CELL: Record<
  AttendanceDay['status'],
  { bg: string; fg: string; mark: string }
> = {
  attended: { bg: PALETTE.sageDeep, fg: '#fff', mark: '🌱' },
  planned: { bg: '#B8D4B5', fg: '#fff', mark: '·' },
  off: { bg: PALETTE.sageSoft, fg: PALETTE.inkSoft, mark: '·' },
  unclocked: { bg: PALETTE.amberSoft, fg: PALETTE.inkSoft, mark: '?' },
};

// 通所リズム (T5)。月カレンダー風グリッド + 凡例。
export function AttendanceSection({
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
