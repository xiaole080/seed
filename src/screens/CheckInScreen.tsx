import { useEffect, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { BottomTabs, type TabId } from '../components/BottomTabs';
import { BAND_LABEL, MODE_COLOR, MODE_LABEL } from '../data/attendance';
import type { AttendanceState, TodayCard } from '../data/types';

interface CheckInScreenProps {
  today?: TodayCard;
  state?: AttendanceState;
  nickname?: string;
  onBack?: () => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onTab?: (t: TabId) => void;
}

const TITLE_BY_STATE = {
  before: {
    office: '到着したら打刻してね',
    home: '在宅でつないでいきましょう',
    off: 'きょうは休みの日',
  },
  checkedIn: {
    office: 'ようこそ。おつかれさまです',
    home: '在宅をはじめました',
    off: 'きょうは休みの日',
  },
  checkedOut: {
    office: 'おつかれさまでした',
    home: 'おつかれさまでした',
    off: 'おつかれさまでした',
  },
} as const;

function bandHours(band: TodayCard['band']) {
  if (band === 'full') return '9:00 〜 15:00';
  if (band === 'am') return '9:00 〜 12:00';
  return '13:00 〜 16:00';
}

export function CheckInScreen({
  today = {
    mode: 'office',
    band: 'full',
    dayLabel: '土',
    checkInTime: '9:42',
    checkOutTime: '15:08',
  },
  state = 'before',
  nickname = 'はる',
  onBack,
  onCheckIn,
  onCheckOut,
  onTab,
}: CheckInScreenProps) {
  const [s, setS] = useState<AttendanceState>(state);
  useEffect(() => setS(state), [state]);

  const isOffice = today.mode === 'office';
  const isHome = today.mode === 'home';
  const isOff = today.mode === 'off';
  const c = MODE_COLOR[today.mode];

  const inTime = today.checkInTime ?? '9:42';
  const outTime = today.checkOutTime ?? '15:08';

  const heroEmoji =
    s === 'before'
      ? isOffice
        ? '🚪'
        : isHome
        ? '🏠'
        : '🌿'
      : s === 'checkedIn'
      ? isOffice
        ? '✓'
        : '🏠'
      : '🌙';

  const handleCheckIn = () => {
    setS('checkedIn');
    onCheckIn?.();
  };
  const handleCheckOut = () => {
    setS('checkedOut');
    onCheckOut?.();
  };

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
            5月2日(土) · 打刻
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

        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            boxShadow: CARD_SHADOW,
            overflow: 'hidden',
            border: `1.5px solid ${c.soft}`,
            marginBottom: 18,
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
                {MODE_LABEL[today.mode]}・{BAND_LABEL[today.band]}
              </div>
              <div
                style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}
              >
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
                  background:
                    s !== 'before' ? PALETTE.sageDeep : PALETTE.sageSoft,
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
                  background:
                    s === 'checkedOut' ? PALETTE.sageDeep : PALETTE.sageSoft,
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

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: '50%',
              background: `radial-gradient(circle at 50% 38%, #fff, ${PALETTE.sageSoft})`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 42,
              marginBottom: 12,
              boxShadow: CARD_SHADOW,
            }}
          >
            {heroEmoji}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>
            {TITLE_BY_STATE[s][today.mode]}
          </div>
          <div
            style={{
              fontSize: 11,
              color: PALETTE.inkSoft,
              marginTop: 6,
              lineHeight: 1.6,
            }}
          >
            {nickname}さんのペースで大丈夫です。
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {!isOff && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {s === 'before' && (
              <button
                onClick={handleCheckIn}
                style={{
                  width: '100%',
                  height: 60,
                  border: 'none',
                  borderRadius: 20,
                  background: PALETTE.sageDeep,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: ROUNDED_FONT,
                  boxShadow: '0 8px 20px rgba(127,169,130,0.32)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>{isOffice ? '🚪' : '🏠'}</span>
                <span>{isOffice ? '通所打刻' : '開始打刻'}（いま）</span>
              </button>
            )}
            {s === 'checkedIn' && (
              <button
                onClick={handleCheckOut}
                style={{
                  width: '100%',
                  height: 60,
                  border: 'none',
                  borderRadius: 20,
                  background: PALETTE.sageDeep,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: ROUNDED_FONT,
                  boxShadow: '0 8px 20px rgba(127,169,130,0.32)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>👋</span>
                <span>帰宅打刻（いま）</span>
              </button>
            )}
            {s === 'checkedOut' && (
              <button
                onClick={onBack}
                style={{
                  width: '100%',
                  height: 60,
                  border: 'none',
                  borderRadius: 20,
                  background: PALETTE.sageDeep,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: ROUNDED_FONT,
                  boxShadow: '0 8px 20px rgba(127,169,130,0.32)',
                  cursor: 'pointer',
                }}
              >
                ホームへもどる　→
              </button>
            )}

            <button
              style={{
                width: '100%',
                height: 44,
                border: `1px solid ${PALETTE.sage}`,
                borderRadius: 14,
                background: 'transparent',
                color: PALETTE.inkSoft,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              時刻を手で直す
            </button>
          </div>
        )}

        {isOff && (
          <button
            onClick={onBack}
            style={{
              width: '100%',
              height: 56,
              border: 'none',
              borderRadius: 18,
              background: PALETTE.sageDeep,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              boxShadow: '0 6px 16px rgba(127,169,130,0.32)',
              cursor: 'pointer',
            }}
          >
            ホームへもどる
          </button>
        )}

        <div
          style={{
            marginTop: 12,
            fontSize: 10,
            color: PALETTE.inkSoft,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          打刻は記録だけ。遅くなっても、来られなくても大丈夫です。
        </div>
      </div>
      <BottomTabs active="home" onChange={onTab} />
    </PhoneShell>
  );
}
