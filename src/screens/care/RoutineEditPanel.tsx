import { useState } from 'react';
import { PALETTE, ROUNDED_FONT } from '../../theme';
import type { Routine } from '../../data/routines';

const WEEKDAY_JP_MON0 = ['月', '火', '水', '木', '金', '土', '日'] as const;

interface RoutineEditPanelProps {
  routine: Routine;
  onChange: (patch: Partial<Routine>) => void;
  onAskDelete: () => void;
  onClose: () => void;
}

export function RoutineEditPanel({
  routine,
  onChange,
  onAskDelete,
  onClose,
}: RoutineEditPanelProps) {
  const [text, setText] = useState(routine.text);
  const [frequency, setFrequency] = useState(routine.frequency);
  const [weekdays, setWeekdays] = useState<number[]>(routine.weekdays ?? []);

  const commitText = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== routine.text) {
      onChange({ text: trimmed });
    }
  };

  const setFreq = (f: Routine['frequency']) => {
    setFrequency(f);
    if (f === 'weekdays') {
      onChange({ frequency: f, weekdays });
    } else {
      onChange({ frequency: f, weekdays: undefined });
    }
  };

  const toggleWeekday = (wd: number) => {
    const next = weekdays.includes(wd)
      ? weekdays.filter((x) => x !== wd)
      : [...weekdays, wd].sort();
    setWeekdays(next);
    onChange({ frequency: 'weekdays', weekdays: next });
  };

  return (
    <div
      style={{
        marginTop: 10,
        padding: '10px 12px',
        background: PALETTE.creamSoft,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitText();
            onClose();
          }
        }}
        maxLength={40}
        style={{
          width: '100%',
          height: 32,
          border: 'none',
          borderBottom: `1.5px solid ${PALETTE.sageSoft}`,
          outline: 'none',
          fontSize: 13,
          fontFamily: ROUNDED_FONT,
          color: PALETTE.ink,
          background: 'transparent',
          padding: '0 4px',
        }}
      />

      <div style={{ display: 'flex', gap: 6 }}>
        {(['daily', 'weekdays', 'attendance'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFreq(f)}
            style={{
              flex: 1,
              height: 30,
              border: 'none',
              background: frequency === f ? PALETTE.sageDeep : PALETTE.sageSoft,
              color: frequency === f ? '#fff' : PALETTE.inkSoft,
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: ROUNDED_FONT,
              cursor: 'pointer',
            }}
          >
            {f === 'daily' ? 'まいにち' : f === 'weekdays' ? '曜日' : '通所日'}
          </button>
        ))}
      </div>

      {frequency === 'weekdays' && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {WEEKDAY_JP_MON0.map((label, i) => {
            const on = weekdays.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggleWeekday(i)}
                style={{
                  width: 32,
                  height: 28,
                  border: 'none',
                  background: on ? PALETTE.sageDeep : '#fff',
                  color: on ? '#fff' : PALETTE.inkSoft,
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: ROUNDED_FONT,
                  cursor: 'pointer',
                  boxShadow: on ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: PALETTE.ink,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={!!routine.paused}
            onChange={(e) => onChange({ paused: e.target.checked })}
          />
          <span>ひと休み中にする</span>
        </label>
        <button
          onClick={onAskDelete}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#A04848',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          消す
        </button>
      </div>
    </div>
  );
}
