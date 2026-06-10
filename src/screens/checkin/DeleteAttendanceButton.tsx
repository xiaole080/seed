import { PALETTE, ROUNDED_FONT } from '../../theme';

interface DeleteAttendanceButtonProps {
  confirming: boolean;
  onAskDelete: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

// T3-B: 「この打刻を取り消す」ボタン + インライン確認ダイアログ。
// §13.2: deleteAttendance(todayISO()) は親側で呼ぶ。
export function DeleteAttendanceButton({
  confirming,
  onAskDelete,
  onCancel,
  onConfirm,
}: DeleteAttendanceButtonProps) {
  if (!confirming) {
    return (
      <button
        onClick={onAskDelete}
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
        この打刻を取り消す
      </button>
    );
  }

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
          color: PALETTE.ink,
          lineHeight: 1.6,
          marginBottom: 8,
        }}
      >
        今日の打刻を取り消しますか？この操作はもとに戻せません。
      </div>
      {/* T3-C: Sheets 既送信注記 (一律表示) */}
      <div
        style={{
          fontSize: 10,
          color: PALETTE.inkSoft,
          lineHeight: 1.6,
          marginBottom: 10,
        }}
      >
        ※ すでに Google Sheets
        に送信された記録は、ここで取り消してもシート側には残ります。
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
          やめる
        </button>
        <button
          onClick={onConfirm}
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
          取り消す
        </button>
      </div>
    </div>
  );
}
