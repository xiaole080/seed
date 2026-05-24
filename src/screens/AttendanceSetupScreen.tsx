import { Fragment, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import {
  BAND_LABEL,
  DAYS,
  DEFAULT_SCHEDULE,
  MODE_COLOR,
  MODE_LABEL,
} from '../data/attendance';
import type {
  AttendanceMode,
  Schedule,
  TimeBand,
} from '../data/types';

interface AttendanceSetupScreenProps {
  initial?: Schedule;
  embedded?: boolean;
  onSave?: (schedule: Schedule) => void;
  onSkip?: () => void;
  label?: string;
}

const MODES: AttendanceMode[] = ['office', 'home', 'off'];
const BANDS: TimeBand[] = ['full', 'am', 'pm'];

export function AttendanceSetupScreen({
  initial = DEFAULT_SCHEDULE,
  embedded = false,
  onSave,
  onSkip,
  label = '01b 通所予定',
}: AttendanceSetupScreenProps) {
  const [schedule, setSchedule] = useState<Schedule>(initial);

  const setMode = (i: number, mode: AttendanceMode) =>
    setSchedule((prev) => ({ ...prev, [i]: { ...prev[i], mode } }));
  const setBand = (i: number, band: TimeBand) =>
    setSchedule((prev) => ({ ...prev, [i]: { ...prev[i], band } }));

  const Inner = (
    <div
      style={{
        // 単独表示のときだけ PhoneShell 内で伸びる + スクロールする。
        // embedded のときは親(ProfileScreen)のスクロール文脈に乗せるので
        // flex:1 / overflowY:auto を入れない (→ 高さ0 に潰れて何も見えなくなる)。
        ...(embedded
          ? {}
          : { flex: 1, overflowY: 'auto' as const }),
        display: 'flex',
        flexDirection: 'column',
        padding: embedded ? 0 : '4px 22px 24px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {!embedded && (
        <Fragment>
          <div style={{ marginTop: 14, marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginBottom: 4 }}>
              ステップ 3 / 4
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4 }}>
              通所のよてい
              <br />
              教えてください
            </div>
            <div
              style={{
                fontSize: 12,
                color: PALETTE.inkSoft,
                marginTop: 8,
                lineHeight: 1.7,
              }}
            >
              あとから「じぶん」画面で
              <br />
              いつでも変えられます。
            </div>
          </div>
        </Fragment>
      )}

      <div
        style={{
          marginTop: embedded ? 4 : 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* 土曜・日曜は事務所休業日のため選択肢から外す (isOfficeClosed と整合)。
            schedule[5]/[6] (土/日) は initial=DEFAULT_SCHEDULE のまま off で保持される。 */}
        {DAYS.slice(0, 5).map((d, i) => {
          const s = schedule[i] || { mode: 'off' as AttendanceMode, band: 'full' as TimeBand };
          const c = MODE_COLOR[s.mode];
          return (
            <div
              key={i}
              style={{
                background: '#fff',
                borderRadius: 16,
                boxShadow: CARD_SHADOW,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                border:
                  s.mode === 'off'
                    ? '1.5px solid transparent'
                    : `1.5px solid ${c.soft}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: s.mode === 'off' ? PALETTE.sageSoft : c.bg,
                    color: s.mode === 'off' ? PALETTE.inkSoft : c.fg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {d}
                </div>
                <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                  {MODES.map((m) => {
                    const sel = s.mode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setMode(i, m)}
                        style={{
                          flex: 1,
                          border: 'none',
                          cursor: 'pointer',
                          background: sel
                            ? MODE_COLOR[m].bg
                            : PALETTE.sageSoft,
                          color: sel
                            ? m === 'off'
                              ? PALETTE.inkSoft
                              : '#fff'
                            : PALETTE.ink,
                          padding: '6px 4px',
                          borderRadius: 10,
                          fontSize: 12,
                          fontFamily: ROUNDED_FONT,
                          fontWeight: 600,
                          transition: 'all .12s',
                        }}
                      >
                        {MODE_LABEL[m]}
                      </button>
                    );
                  })}
                </div>
              </div>
              {s.mode !== 'off' && (
                <div style={{ display: 'flex', gap: 4, paddingLeft: 42 }}>
                  {BANDS.map((b) => {
                    const sel = s.band === b;
                    return (
                      <button
                        key={b}
                        onClick={() => setBand(i, b)}
                        style={{
                          flex: 1,
                          cursor: 'pointer',
                          background: sel ? '#fff' : 'transparent',
                          color: sel ? PALETTE.sageDeep : PALETTE.inkSoft,
                          border: `1px solid ${
                            sel ? PALETTE.sageDeep : PALETTE.sageSoft
                          }`,
                          padding: '5px 4px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontFamily: ROUNDED_FONT,
                          fontWeight: sel ? 700 : 500,
                          transition: 'all .12s',
                        }}
                      >
                        {BAND_LABEL[b]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!embedded && (
        <button
          onClick={() => onSave?.(schedule)}
          style={{
            marginTop: 18,
            width: '100%',
            height: 56,
            border: 'none',
            borderRadius: 20,
            background: PALETTE.sageDeep,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            boxShadow: '0 6px 16px rgba(127,169,130,0.32)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          この内容ではじめる
        </button>
      )}

      {!embedded && onSkip && (
        <button
          onClick={onSkip}
          style={{
            marginTop: 12,
            border: 'none',
            background: 'transparent',
            color: PALETTE.inkSoft,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
            padding: '8px 12px',
            alignSelf: 'center',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          あとで設定する
        </button>
      )}

      {!embedded && (
        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            color: PALETTE.inkSoft,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          急な変更も大丈夫。
          <br />
          実際の通所は当日のボタンで記録します。
        </div>
      )}
    </div>
  );

  if (embedded) return Inner;
  return (
    <PhoneShell bg={PALETTE.cream} label={label}>
      <BackgroundLeaves />
      {Inner}
    </PhoneShell>
  );
}
