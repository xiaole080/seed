import { useMemo, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import type { AttendanceMonthlyRecord } from '../../data/types';
import type { StoredDailyRecord } from '../../data/store';
import { NOTE_COPY } from '../../data/historyCopy';
import { buildTimelineRowView, formatDate } from '../../data/historyView';

// T12: 日付つき時系列セクション (§10)。
//  - 選択期間内のすべての日付を新しい順に表示
//  - 記録がない日は「記録なし」(0点扱いしない)
//  - 自由記述・その他欄は折りたたみ。本文を一覧に露出しない。
export function DateTimeline({
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
  const sortedDates = useMemo(
    () => dates.slice().sort((a, b) => (a < b ? 1 : -1)),
    [dates]
  );

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 12,
        }}
      >
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
  const { moodObj, lines, otherTexts, attendanceLine, hasNote, hasExpandable } =
    buildTimelineRowView(record, attendance, recordIds);

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
          <div style={{ fontSize: 12, fontWeight: 700 }}>
            {formatDate(date)}
          </div>
          {record ? (
            <>
              <div
                style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 2 }}
              >
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
                <div
                  style={{ fontSize: 10, color: PALETTE.inkSoft, marginTop: 2 }}
                >
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
              <span style={{ color: PALETTE.inkSoft, fontWeight: 700 }}>
                メモ:
              </span>{' '}
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
