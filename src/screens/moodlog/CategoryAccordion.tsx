import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';
import type { Category, CategorySection } from '../../data/moods';
import {
  isCategoryFilled,
  summarizeCategory,
  keyOf,
  type SelectionMap,
} from '../../data/moodLogForm';
import { SectionRenderer } from './SectionRenderer';
import { OtherTextField } from './OtherTextField';

interface CategoryAccordionProps {
  enabledCategories: Category[];
  todayMode: boolean;
  sel: SelectionMap;
  open: string | null;
  setOpen: (id: string | null) => void;
  setSingle: (cat: Category, sec: CategorySection, optId: string) => void;
  toggleMulti: (cat: Category, sec: CategorySection, optId: string) => void;
  setTime: (cat: Category, sec: CategorySection, v: string) => void;
  sectionOtherTexts: Record<string, string>;
  setSectionOtherTexts: (
    update: (prev: Record<string, string>) => Record<string, string>
  ) => void;
}

// 詳細記録 (§3.1〜3.5)。ON のカテゴリをアコーディオン表示する。
export function CategoryAccordion({
  enabledCategories,
  todayMode,
  sel,
  open,
  setOpen,
  setSingle,
  toggleMulti,
  setTime,
  sectionOtherTexts,
  setSectionOtherTexts,
}: CategoryAccordionProps) {
  return (
    <div
      style={{
        marginTop: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {enabledCategories.length === 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: 14,
            boxShadow: CARD_SHADOW,
            fontSize: 12,
            color: PALETTE.inkSoft,
            lineHeight: 1.6,
          }}
        >
          記録項目は「わたし」画面で追加できます。
        </div>
      )}
      {enabledCategories.map((cat) => (
        <CategoryCard
          key={cat.id}
          cat={cat}
          todayMode={todayMode}
          sel={sel}
          isOpen={open === cat.id}
          onToggleOpen={() => setOpen(open === cat.id ? null : cat.id)}
          setSingle={setSingle}
          toggleMulti={toggleMulti}
          setTime={setTime}
          otherText={sectionOtherTexts[cat.id] ?? ''}
          onChangeOtherText={(v) =>
            setSectionOtherTexts((prev) => ({ ...prev, [cat.id]: v }))
          }
        />
      ))}
    </div>
  );
}

interface CategoryCardProps {
  cat: Category;
  todayMode: boolean;
  sel: SelectionMap;
  isOpen: boolean;
  onToggleOpen: () => void;
  setSingle: (cat: Category, sec: CategorySection, optId: string) => void;
  toggleMulti: (cat: Category, sec: CategorySection, optId: string) => void;
  setTime: (cat: Category, sec: CategorySection, v: string) => void;
  otherText: string;
  onChangeOtherText: (v: string) => void;
}

function CategoryCard({
  cat,
  todayMode,
  sel,
  isOpen,
  onToggleOpen,
  setSingle,
  toggleMulti,
  setTime,
  otherText,
  onChangeOtherText,
}: CategoryCardProps) {
  const filled = isCategoryFilled(cat, sel);
  const summary = summarizeCategory(cat, sel);
  // 対象日と睡眠ラベルの出し分け (T8)
  const catLabel =
    cat.id === 'sleep'
      ? todayMode
        ? '昨夜〜今朝の睡眠'
        : '昨日の睡眠'
      : !todayMode
        ? `昨日の${cat.label}`
        : cat.label;
  // このカテゴリで "other" がいずれかのセクションで選ばれているか
  const hasOtherSelected = cat.sections.some((sec) => {
    const v = sel[keyOf(cat, sec)];
    if (sec.type === 'single') return v === 'other';
    if (sec.type === 'multi' && v instanceof Set) return v.has('other');
    return false;
  });

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: CARD_SHADOW,
        overflow: 'hidden',
        border: filled
          ? `1.5px solid ${PALETTE.sage}`
          : '1.5px solid transparent',
        transition: 'border-color .15s',
      }}
    >
      <button
        onClick={onToggleOpen}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          fontFamily: ROUNDED_FONT,
          color: PALETTE.ink,
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: filled ? PALETTE.sageDeep : PALETTE.sageSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {cat.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {catLabel}
          </div>
          <div
            style={{
              fontSize: 11,
              color: filled ? PALETTE.sageDeep : PALETTE.inkSoft,
              fontWeight: filled ? 600 : 400,
              marginTop: 2,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {summary || cat.summaryHint}
          </div>
        </div>
        <div
          style={{
            fontSize: 14,
            color: PALETTE.inkSoft,
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform .18s',
          }}
        >
          ›
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            padding: '4px 14px 14px',
            borderTop: `1px solid ${PALETTE.sageSoft}`,
            paddingTop: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {cat.sections.map((sec) => {
            // 条件付き表示 (例: 食事原因は不良時のみ)
            if (sec.showWhen) {
              const trigger = sel[`${cat.id}.${sec.showWhen.sectionId}`];
              if (
                typeof trigger !== 'string' ||
                !sec.showWhen.values.includes(trigger)
              ) {
                return null;
              }
            }

            return (
              <SectionRenderer
                key={sec.id}
                cat={cat}
                sec={sec}
                value={sel[keyOf(cat, sec)]}
                onPickSingle={(id) => setSingle(cat, sec, id)}
                onToggleMulti={(id) => toggleMulti(cat, sec, id)}
                onSetTime={(v) => setTime(cat, sec, v)}
              />
            );
          })}

          {/* T10: その他を選んだら短い自由入力欄を出す。端末ローカル限定。 */}
          {hasOtherSelected && (
            <OtherTextField
              value={otherText}
              onChange={onChangeOtherText}
              placeholder="その他、気になったこと"
            />
          )}
        </div>
      )}
    </div>
  );
}
