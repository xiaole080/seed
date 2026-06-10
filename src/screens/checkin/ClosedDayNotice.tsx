import { PALETTE, ROUNDED_FONT } from '../../theme';
import type { ClosedDayActivity } from '../../data/types';

const CLOSED_DAY_OPTIONS: Array<{ value: ClosedDayActivity; label: string }> = [
  { value: 'home_rest', label: '自宅で過ごした' },
  { value: 'outing', label: '外出した' },
  { value: 'medical', label: '通院した' },
];

interface ClosedDayNoticeProps {
  closedDayActivity?: ClosedDayActivity;
  onClosedDayActivity?: (value: ClosedDayActivity) => void;
}

// バグ① + 案 X: 事務所休業日のメッセージ + 軽い記録ボタン。
// ここで保存する closedDayActivity は端末ローカル限定 (Sheets/CSV へは流さない)。
export function ClosedDayNotice({
  closedDayActivity,
  onClosedDayActivity,
}: ClosedDayNoticeProps) {
  return (
    <div
      style={{
        background: PALETTE.creamSoft,
        borderRadius: 14,
        border: `1.5px solid ${PALETTE.sage}`,
        padding: 12,
        marginBottom: 12,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: PALETTE.ink,
          lineHeight: 1.6,
          marginBottom: 6,
        }}
      >
        本日は事務所休業日のため打刻できません
      </div>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          lineHeight: 1.6,
          marginBottom: 10,
        }}
      >
        よかったら、きょうのすごし方をひとつ記録しておきませんか。
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {CLOSED_DAY_OPTIONS.map((opt) => {
          const selected = closedDayActivity === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onClosedDayActivity?.(opt.value)}
              style={{
                width: '100%',
                height: 44,
                border: `1.5px solid ${
                  selected ? PALETTE.sageDeep : PALETTE.sage
                }`,
                borderRadius: 12,
                background: selected ? PALETTE.sageDeep : '#fff',
                color: selected ? '#fff' : PALETTE.ink,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {closedDayActivity && (
        <div
          style={{
            fontSize: 11,
            color: PALETTE.sageDeep,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          （記録済み）
        </div>
      )}
    </div>
  );
}
