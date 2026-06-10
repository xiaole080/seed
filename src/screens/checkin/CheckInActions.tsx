import { PALETTE, ROUNDED_FONT } from '../../theme';
import type { AttendanceMode, AttendanceState } from '../../data/types';
import { TimeEditPanel } from './TimeEditPanel';
import { DeleteAttendanceButton } from './DeleteAttendanceButton';

interface CheckInActionsProps {
  state: AttendanceState;
  isOffice: boolean;
  officeClosed: boolean;
  planIsOff: boolean;
  effectiveMode: AttendanceMode | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onBack?: () => void;
  setEffectiveMode: (m: AttendanceMode | null) => void;
  // 時刻編集
  editing: boolean;
  beginEdit: () => void;
  cancelEdit: () => void;
  saveEdit: () => void;
  draftIn: string;
  draftOut: string;
  setDraftIn: (v: string) => void;
  setDraftOut: (v: string) => void;
  editError: string | null;
  // 取り消し
  confirmingDelete: boolean;
  setConfirmingDelete: (v: boolean) => void;
  doDelete: () => void;
}

const primaryBtn = {
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
} as const;

// 通常フロー (!isOff) のアクション列。
export function CheckInActions({
  state: s,
  isOffice,
  officeClosed,
  planIsOff,
  effectiveMode,
  onCheckIn,
  onCheckOut,
  onBack,
  setEffectiveMode,
  editing,
  beginEdit,
  cancelEdit,
  saveEdit,
  draftIn,
  draftOut,
  setDraftIn,
  setDraftOut,
  editError,
  confirmingDelete,
  setConfirmingDelete,
  doDelete,
}: CheckInActionsProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flexShrink: 0,
      }}
    >
      {s === 'before' && (
        <button
          onClick={onCheckIn}
          disabled={officeClosed}
          aria-disabled={officeClosed || undefined}
          style={{
            ...primaryBtn,
            background: officeClosed ? PALETTE.sageSoft : PALETTE.sageDeep,
            color: officeClosed ? PALETTE.inkSoft : '#fff',
            boxShadow: officeClosed ? 'none' : '0 8px 20px rgba(127,169,130,0.32)',
            cursor: officeClosed ? 'not-allowed' : 'pointer',
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
          onClick={onCheckOut}
          style={{
            ...primaryBtn,
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
        <button onClick={onBack} style={primaryBtn}>
          ホームへもどる　→
        </button>
      )}

      {/* T1-C: 時刻を手で直す (インライン編集パネル) */}
      {!editing ? (
        <button
          onClick={beginEdit}
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
      ) : (
        <TimeEditPanel
          state={s}
          draftIn={draftIn}
          draftOut={draftOut}
          setDraftIn={setDraftIn}
          setDraftOut={setDraftOut}
          editError={editError}
          onCancel={cancelEdit}
          onSave={saveEdit}
        />
      )}

      {/* T3-B: 打刻済み (checkedIn / checkedOut) かつ非編集中のみ取り消し導線 */}
      {(s === 'checkedIn' || s === 'checkedOut') && !editing && (
        <DeleteAttendanceButton
          confirming={confirmingDelete}
          onAskDelete={() => setConfirmingDelete(true)}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={doDelete}
        />
      )}

      {/* T6: 予定が休み × 例外打刻に進んだ後の「お休みに戻す」リンク。 */}
      {planIsOff && effectiveMode != null && s === 'before' && (
        <button
          onClick={() => setEffectiveMode(null)}
          style={{
            width: '100%',
            height: 36,
            border: 'none',
            background: 'transparent',
            color: PALETTE.inkSoft,
            fontSize: 12,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
            textDecoration: 'underline',
            textDecorationColor: PALETTE.sage,
            textUnderlineOffset: 3,
          }}
        >
          お休みに戻す
        </button>
      )}
    </div>
  );
}
