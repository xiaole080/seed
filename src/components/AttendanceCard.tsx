import { Fragment } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { BAND_LABEL, MODE_COLOR, MODE_LABEL } from '../data/attendance';
import type { AttendanceState, TodayCard } from '../data/types';

interface AttendanceCardProps {
  today: TodayCard | null;
  state?: AttendanceState;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
}

export function AttendanceCard({
  today,
  state = 'before',
  onCheckIn,
  onCheckOut,
}: AttendanceCardProps) {
  if (!today || today.mode === 'off') {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          padding: '14px 18px',
          boxShadow: CARD_SHADOW,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: PALETTE.sageSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          🌿
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>今日はお休みの日</div>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>
            ゆっくり過ごしてくださいね
          </div>
        </div>
      </div>
    );
  }

  const c = MODE_COLOR[today.mode];
  const isOffice = today.mode === 'office';

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: CARD_SHADOW,
        overflow: 'hidden',
        border: `1.5px solid ${c.soft}`,
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          background: c.soft,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: c.bg,
            color: c.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {today.dayLabel || '今日'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: PALETTE.ink }}>
            今日は{MODE_LABEL[today.mode]}の日 · {BAND_LABEL[today.band]}
          </div>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>
            {state === 'before' &&
              (isOffice ? '到着したら打刻してくださいね' : '在宅でつないでいきましょう')}
            {state === 'checkedIn' &&
              `${today.checkInTime} に${isOffice ? '到着' : '開始'}`}
            {state === 'checkedOut' &&
              `${today.checkInTime} 〜 ${today.checkOutTime}`}
          </div>
        </div>
      </div>

      <div style={{ padding: 14, display: 'flex', gap: 8 }}>
        {state === 'before' && (
          <button
            onClick={onCheckIn}
            style={{
              flex: 1,
              height: 48,
              border: 'none',
              borderRadius: 14,
              background: c.bg,
              color: c.fg,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: `0 4px 12px ${
                isOffice ? 'rgba(127,169,130,0.3)' : 'rgba(232,184,115,0.3)'
              }`,
            }}
          >
            <span style={{ fontSize: 16 }}>{isOffice ? '🚪' : '🏠'}</span>
            <span>{isOffice ? '通所打刻' : '開始打刻'}</span>
          </button>
        )}
        {state === 'checkedIn' && (
          <Fragment>
            <div
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                background: PALETTE.sageSoft,
                color: PALETTE.sageDeep,
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span>✓</span>
              <span>{today.checkInTime}</span>
            </div>
            <button
              onClick={onCheckOut}
              style={{
                flex: 1,
                height: 48,
                border: 'none',
                borderRadius: 14,
                background: PALETTE.sageDeep,
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(127,169,130,0.3)',
              }}
            >
              <span style={{ fontSize: 16 }}>👋</span>
              <span>帰宅打刻</span>
            </button>
          </Fragment>
        )}
        {state === 'checkedOut' && (
          <div
            style={{
              flex: 1,
              height: 48,
              borderRadius: 14,
              background: PALETTE.sageSoft,
              color: PALETTE.sageDeep,
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>✓</span>
            <span>おつかれさまでした</span>
          </div>
        )}
      </div>
    </div>
  );
}
