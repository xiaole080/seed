import { PALETTE } from '../../theme';
import type { StoredDailyRecord } from '../../data/store';
import { computeHiddenItems } from '../../data/historyView';

// T13: OFF項目に過去データがある場合の控えめ表示。
export function HiddenItemsNote({
  recordIds,
  records,
}: {
  recordIds: string[];
  records: StoredDailyRecord[];
}) {
  const offWithPast = computeHiddenItems(recordIds, records);
  if (offWithPast.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: 12,
        padding: '10px 12px',
        background: PALETTE.creamSoft,
        borderRadius: 12,
        fontSize: 11,
        color: PALETTE.inkSoft,
        lineHeight: 1.6,
      }}
    >
      {offWithPast.map((o) => (
        <div key={o.id}>
          非表示中の記録あり（{o.label} {o.days} 日分）
        </div>
      ))}
    </div>
  );
}
