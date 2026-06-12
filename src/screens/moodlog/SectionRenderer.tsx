import { PALETTE, ROUNDED_FONT } from '../../theme';
import type { Category, CategorySection } from '../../data/moods';
import type { SelectionValue } from '../../data/moodLogForm';

interface SectionRendererProps {
  cat: Category;
  sec: CategorySection;
  value: SelectionValue | undefined;
  onPickSingle: (id: string) => void;
  onToggleMulti: (id: string) => void;
  onSetTime: (v: string) => void;
}

// 詳細記録カテゴリの 1 セクション (single / multi / time) を描画する。
export function SectionRenderer({
  sec,
  value,
  onPickSingle,
  onToggleMulti,
  onSetTime,
}: SectionRendererProps) {
  return (
    <div>
      {sec.title && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: PALETTE.ink,
            marginBottom: 8,
          }}
        >
          {sec.title}
        </div>
      )}
      {sec.type === 'time' && (
        <input
          type="time"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onSetTime(e.target.value)}
          style={{
            border: `1px solid ${PALETTE.sageSoft}`,
            background: '#fff',
            borderRadius: 10,
            padding: '8px 10px',
            fontSize: 14,
            fontFamily: ROUNDED_FONT,
            color: PALETTE.ink,
            outline: 'none',
          }}
        />
      )}
      {(sec.type === 'single' || sec.type === 'multi') && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {sec.options?.map((opt) => {
            const isSel =
              sec.type === 'single'
                ? value === opt.id
                : value instanceof Set && value.has(opt.id);
            const onClick = () =>
              sec.type === 'single'
                ? onPickSingle(opt.id)
                : onToggleMulti(opt.id);
            return (
              <button
                key={opt.id}
                onClick={onClick}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  background: isSel ? PALETTE.sageDeep : PALETTE.sageSoft,
                  color: isSel ? '#fff' : PALETTE.ink,
                  padding: '7px 11px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontFamily: ROUNDED_FONT,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all .12s',
                }}
              >
                {opt.icon && <span style={{ fontSize: 13 }}>{opt.icon}</span>}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
