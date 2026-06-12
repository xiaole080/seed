import { useMemo, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import type { Schedule } from '../../data/types';
import {
  attendanceFilename,
  downloadCsv,
  getMonthAttendance,
  hasAnyActual,
  recordsToCsv,
} from '../../data/attendanceExport';
import { shiftMonth } from '../../data/monthNav';

// ── 月末通所CSV出力カード ──────────────────────────────────────
// 仕様 §4.3 / §13.2 Phase 3:
//  - 通所時間データのみ書き出す (気分・体調・服薬・自由記述は含めない)
//  - 出力前にその旨を本人に明示する
//  - 共有はアプリ外で本人操作 (自動送信しない)
export function AttendanceExportCard({
  schedule,
  nickname,
}: {
  schedule: Schedule;
  nickname?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex0, setMonthIndex0] = useState(today.getMonth());

  const records = useMemo(
    () => getMonthAttendance(schedule, year, monthIndex0),
    [schedule, year, monthIndex0]
  );
  const hasActual = hasAnyActual(records);

  const onShiftMonth = (delta: number) => {
    const next = shiftMonth(year, monthIndex0, delta);
    setYear(next.year);
    setMonthIndex0(next.monthIndex0);
  };

  const doExport = () => {
    const csv = recordsToCsv(records);
    downloadCsv(attendanceFilename(year, monthIndex0, nickname), csv);
    setConfirming(false);
  };

  return (
    <div
      style={{
        marginTop: 18,
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: CARD_SHADOW,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 20 }}>📄</div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
          月末の通所ファイルを書き出す
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          lineHeight: 1.6,
        }}
      >
        通所時間のみをCSVとして書き出します。
        気分・睡眠・食事・体調・服薬・自由記述は含まれません。
      </div>

      {/* 月セレクタ */}
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => onShiftMonth(-1)}
          style={monthBtnStyle()}
          aria-label="前の月"
        >
          ‹
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink }}>
          {year}年 {monthIndex0 + 1}月
        </div>
        <button
          onClick={() => onShiftMonth(+1)}
          style={monthBtnStyle()}
          aria-label="次の月"
        >
          ›
        </button>
      </div>

      {!hasActual && (
        <div
          style={{
            marginTop: 8,
            background: PALETTE.amberSoft,
            color: PALETTE.ink,
            fontSize: 11,
            lineHeight: 1.6,
            borderRadius: 10,
            padding: '8px 10px',
          }}
        >
          この月はまだ実打刻がありません。書き出すと予定だけのファイルになります。
        </div>
      )}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          style={{
            marginTop: 12,
            width: '100%',
            border: `1.5px solid ${PALETTE.sage}`,
            background: PALETTE.sageSoft,
            color: PALETTE.sageDeep,
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
          }}
        >
          書き出す (CSV)
        </button>
      ) : (
        <div
          style={{
            marginTop: 12,
            background: PALETTE.creamSoft,
            borderRadius: 12,
            padding: 12,
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
            気分・体調・服薬・自由記述は<strong>含まれません</strong>。
            <br />
            このまま書き出しますか？
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setConfirming(false)}
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
              onClick={doExport}
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
              書き出す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function monthBtnStyle(): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    border: 'none',
    background: PALETTE.sageSoft,
    color: PALETTE.sageDeep,
    borderRadius: 12,
    fontSize: 18,
    fontWeight: 700,
    fontFamily: ROUNDED_FONT,
    cursor: 'pointer',
    flexShrink: 0,
  };
}
