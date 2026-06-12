import { PALETTE, ROUNDED_FONT } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { DEFAULT_RECORD_IDS } from '../data/records';
import type { StoredDailyRecord } from '../data/store';
import type { Mood } from '../data/types';
import type { MoodSubmitPayload } from '../data/moodLogForm';
import { useMoodLog } from './moodlog/useMoodLog';
import { SectionTitle } from './moodlog/SectionTitle';
import { MoodPicker } from './moodlog/MoodPicker';
import { InfluencePicker } from './moodlog/InfluencePicker';
import { MoreToggle } from './moodlog/MoreToggle';
import { CategoryAccordion } from './moodlog/CategoryAccordion';
import { NoteField } from './moodlog/NoteField';

// 後方互換のため SelectionMap 型を引き続きこのモジュールから公開する。
export type { SelectionMap } from '../data/moodLogForm';

interface MoodLogScreenProps {
  initialMood?: Mood;
  /** ユーザが「わたし」画面で有効化している詳細記録カテゴリ */
  enabledCategoryIds?: string[];
  /** 記録対象日 (YYYY-MM-DD)。未指定なら今日。 */
  targetDate?: string;
  /** 修正時に渡される、対象日の既存レコード。 */
  initialRecord?: StoredDailyRecord;
  onCancel?: () => void;
  onSubmit?: (payload: MoodSubmitPayload) => void;
}

export function MoodLogScreen({
  initialMood = 3,
  enabledCategoryIds = DEFAULT_RECORD_IDS,
  targetDate,
  initialRecord,
  onCancel,
  onSubmit,
}: MoodLogScreenProps) {
  const form = useMoodLog({
    initialMood,
    enabledCategoryIds,
    targetDate,
    initialRecord,
    onSubmit,
  });

  return (
    <PhoneShell bg={PALETTE.cream} label="03 きもちを記録">
      <BackgroundLeaves />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '4px 22px 24px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* ── ヘッダ ─────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <button
            onClick={onCancel}
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
          <div
            style={{
              fontSize: 12,
              color: PALETTE.inkSoft,
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: PALETTE.ink }}>
              {form.screenTitle}
            </div>
            <div>{form.targetLabel}</div>
          </div>
          <div style={{ width: 44 }} />
        </div>

        {/* ── Q1: 気分 (§2.3) ────── */}
        <SectionTitle
          index={1}
          title={form.todayMode ? '今のきもちは？' : '昨日のきもちは？'}
        />
        <MoodPicker mood={form.mood} onPick={form.setMood} />

        {/* ── Q2: 影響していそうなこと (§2.4) ─── */}
        <SectionTitle
          index={2}
          title={
            form.todayMode
              ? '今のきもちに一番影響していそうなことは？'
              : '昨日のきもちに一番影響していそうなことは？'
          }
          hint="複数えらべます"
        />
        <InfluencePicker
          influences={form.influences}
          onToggle={form.toggleInfluence}
          influenceOtherText={form.influenceOtherText}
          onChangeOtherText={form.setInfluenceOtherText}
        />

        {/* ── Q3: もっと記録する？ (§2.2 トグル) ─── */}
        <MoreToggle
          showMore={form.showMore}
          onToggle={() => form.setShowMore((v) => !v)}
        />

        {/* ── 詳細記録 (§3.1〜3.5) ─── */}
        {form.showMore && (
          <CategoryAccordion
            enabledCategories={form.enabledCategories}
            todayMode={form.todayMode}
            sel={form.sel}
            open={form.open}
            setOpen={form.setOpen}
            setSingle={form.setSingle}
            toggleMulti={form.toggleMulti}
            setTime={form.setTime}
            sectionOtherTexts={form.sectionOtherTexts}
            setSectionOtherTexts={form.setSectionOtherTexts}
          />
        )}

        {/* ── Q4: 自由記述 (§2.5) ───────── */}
        <SectionTitle
          index={4}
          title={form.todayMode ? '今日のメモ' : '昨日のメモ'}
          hint="書かなくてもOK・あなたのための欄です"
        />
        <NoteField value={form.note} onChange={form.setNote} />

        <button
          onClick={form.handleSubmit}
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
          {form.isEdit ? '修正を保存する' : '記録する'}
        </button>
      </div>
    </PhoneShell>
  );
}
