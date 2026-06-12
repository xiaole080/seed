import { PALETTE, CARD_SHADOW } from '../../theme';
import { BAND_LABEL, MODE_LABEL } from '../../data/attendance';
import type { AttendanceMode, AttendanceState, TodayCard } from '../../data/types';
import { bandHours } from '../../data/checkInView';

interface AttendanceStatusCardProps {
  today: TodayCard;
  viewMode: AttendanceMode;
  state: AttendanceState;
  /** MODE_COLOR[viewMode] */
  c: { soft: string; bg: string; fg: string };
  isOff: boolean;
  inTime: string;
  outTime: string;
}

// 到着 / 帰宅の状態を示す白カード。
export function AttendanceStatusCard({
  today,
  viewMode,
  state: s,
  c,
  isOff,
  inTime,
  outTime,
}: AttendanceStatusCardProps) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: CARD_SHADOW,
        overflow: 'hidden',
        border: `1.5px solid ${c.soft}`,
        marginBottom: 18,
        // 責任分界: スクロール領域は flex column かつ overflowY:auto。
        // このカードは overflow:'hidden' を持つため flex の min-height が 0 に
        // 解決され、短い viewport では「唯一潰せる子」として圧縮され帰宅行が
        // 見切れていた。コンテンツは伸縮させず、超過分はスクロールに回す。
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          background: c.soft,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: isOff ? '#fff' : c.bg,
            color: isOff ? PALETTE.inkSoft : c.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {today.dayLabel ?? '今'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {MODE_LABEL[viewMode]}・{BAND_LABEL[today.band]}
          </div>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>
            {bandHours(today.band)}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 18px 18px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
            borderBottom: `1px dashed ${PALETTE.sageSoft}`,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: s !== 'before' ? PALETTE.sageDeep : PALETTE.sageSoft,
              color: s !== 'before' ? '#fff' : PALETTE.sageDeep,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {s !== 'before' ? '✓' : '入'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: PALETTE.inkSoft }}>到着</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {s !== 'before' ? inTime : '— : —'}
            </div>
          </div>
          {s !== 'before' && (
            <div
              style={{
                fontSize: 10,
                color: PALETTE.sageDeep,
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              済
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: s === 'checkedOut' ? PALETTE.sageDeep : PALETTE.sageSoft,
              color: s === 'checkedOut' ? '#fff' : PALETTE.sageDeep,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {s === 'checkedOut' ? '✓' : '帰'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: PALETTE.inkSoft }}>帰宅</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {s === 'checkedOut' ? outTime : '— : —'}
            </div>
          </div>
          {s === 'checkedOut' && (
            <div
              style={{
                fontSize: 10,
                color: PALETTE.sageDeep,
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              済
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
