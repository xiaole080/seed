import { PALETTE, ROUNDED_FONT } from '../../theme';
import type { AttendanceState } from '../../data/types';

interface TimeEditPanelProps {
  state: AttendanceState;
  draftIn: string;
  draftOut: string;
  setDraftIn: (v: string) => void;
  setDraftOut: (v: string) => void;
  editError: string | null;
  onCancel: () => void;
  onSave: () => void;
}

// T1-C: 時刻を手で直すインライン編集パネル。
export function TimeEditPanel({
  state: s,
  draftIn,
  draftOut,
  setDraftIn,
  setDraftOut,
  editError,
  onCancel,
  onSave,
}: TimeEditPanelProps) {
  return (
    <div
      style={{
        background: PALETTE.creamSoft,
        borderRadius: 14,
        border: `1.5px solid ${PALETTE.sage}`,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: PALETTE.ink,
          marginBottom: 8,
        }}
      >
        時刻を手で直す
      </div>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 12,
          color: PALETTE.ink,
          marginBottom: 8,
        }}
      >
        <span style={{ width: 40, color: PALETTE.inkSoft }}>到着</span>
        <input
          aria-label="到着時刻"
          type="time"
          value={draftIn}
          onChange={(e) => setDraftIn(e.target.value)}
          style={{
            flex: 1,
            fontFamily: ROUNDED_FONT,
            fontSize: 14,
            padding: '6px 8px',
            border: `1px solid ${PALETTE.sage}`,
            borderRadius: 8,
            background: '#fff',
            color: PALETTE.ink,
          }}
        />
      </label>
      {s !== 'checkedIn' && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12,
            color: PALETTE.ink,
            marginBottom: 8,
          }}
        >
          <span style={{ width: 40, color: PALETTE.inkSoft }}>帰宅</span>
          <input
            aria-label="帰宅時刻"
            type="time"
            value={draftOut}
            onChange={(e) => setDraftOut(e.target.value)}
            style={{
              flex: 1,
              fontFamily: ROUNDED_FONT,
              fontSize: 14,
              padding: '6px 8px',
              border: `1px solid ${PALETTE.sage}`,
              borderRadius: 8,
              background: '#fff',
              color: PALETTE.ink,
            }}
          />
        </label>
      )}
      {editError && (
        <div
          role="alert"
          style={{
            fontSize: 11,
            color: '#A86A4A',
            marginBottom: 8,
            lineHeight: 1.5,
          }}
        >
          {editError}
        </div>
      )}
      {/* T1-C: Sheets 既送信注記 (一律表示)。時刻を直しても Sheets には再送しない。 */}
      <div
        style={{
          fontSize: 10,
          color: PALETTE.inkSoft,
          lineHeight: 1.6,
          marginBottom: 10,
        }}
      >
        ※ Google Sheets には最初の打刻時刻が残ります。
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
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
          onClick={onSave}
          disabled={editError != null}
          style={{
            flex: 1.4,
            border: 'none',
            background: editError ? PALETTE.sageSoft : PALETTE.sageDeep,
            color: editError ? PALETTE.inkSoft : '#fff',
            borderRadius: 10,
            padding: '9px 10px',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: editError ? 'not-allowed' : 'pointer',
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
}
