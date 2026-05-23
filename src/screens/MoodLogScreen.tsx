import { useMemo, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import {
  CATEGORIES,
  MOODS,
  PRIMARY_INFLUENCES,
  type Category,
  type CategorySection,
} from '../data/moods';
import { DEFAULT_RECORD_IDS } from '../data/records';
import { todayISO } from '../data/store';
import type { StoredDailyRecord } from '../data/store';
import type { Mood, PrimaryInfluence } from '../data/types';

interface MoodLogScreenProps {
  initialMood?: Mood;
  /** ユーザが「じぶん」画面で有効化している詳細記録カテゴリ */
  enabledCategoryIds?: string[];
  /** 記録対象日 (YYYY-MM-DD)。未指定なら今日。 */
  targetDate?: string;
  /** 修正時に渡される、対象日の既存レコード。 */
  initialRecord?: StoredDailyRecord;
  onCancel?: () => void;
  onSubmit?: (payload: {
    mood: Mood;
    primaryInfluence: PrimaryInfluence[];
    selections: SelectionMap;
    note: string;
    influenceOtherText?: string;
    sectionOtherTexts: Record<string, string>;
  }) => void;
}

/**
 * セクションの値は単一文字列・複数(Set)・時刻文字列・null のいずれか。
 * 保存キーは `${categoryId}.${sectionId}` という複合キー。
 */
type SelectionValue = string | null | Set<string>;
export type SelectionMap = Record<string, SelectionValue>;

/** 対象日が今日かどうか */
function isToday(target: string): boolean {
  return target === todayISO();
}

/** 対象日の表示ラベル "5月23日(土)" を返す */
function formatTargetLabel(target: string): string {
  const [y, m, d] = target.split('-').map(Number);
  if (!y || !m || !d) return target;
  const dt = new Date(y, m - 1, d);
  const w = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()];
  return `${m}月${d}日(${w})`;
}

/** initialRecord から SelectionMap を構築する (修正時のフォーム復元) */
function restoreSelections(rec: StoredDailyRecord | undefined): SelectionMap {
  if (!rec) return {};
  const out: SelectionMap = {};
  if (rec.sleep) {
    if (rec.sleep.bedtime) out['sleep.bedtime'] = rec.sleep.bedtime;
    if (rec.sleep.wakeTime) out['sleep.wakeTime'] = rec.sleep.wakeTime;
    if (rec.sleep.nightAwakenings)
      out['sleep.nightAwakenings'] = rec.sleep.nightAwakenings;
    if (rec.sleep.sleepIssues?.length)
      out['sleep.issues'] = new Set(rec.sleep.sleepIssues);
  }
  if (rec.meal) {
    const taken = rec.meal.mealsTaken;
    const arr: string[] = [];
    if (taken?.breakfast) arr.push('breakfast');
    if (taken?.lunch) arr.push('lunch');
    if (taken?.dinner) arr.push('dinner');
    if (taken?.snack) arr.push('snack');
    if (taken?.hydration) arr.push('hydration');
    if (arr.length) out['meal.mealsTaken'] = new Set(arr);
    if (rec.meal.mealStatus) out['meal.mealStatus'] = rec.meal.mealStatus;
    if (rec.meal.causes?.length) out['meal.causes'] = new Set(rec.meal.causes);
  }
  if (rec.exercise?.activityFlags?.length) {
    out['exercise.activityFlags'] = new Set(rec.exercise.activityFlags);
  }
  if (rec.condition?.conditionFlags?.length) {
    out['condition.conditionFlags'] = new Set(rec.condition.conditionFlags);
  }
  if (rec.medication?.medicationStatus) {
    out['meds.medicationStatus'] = rec.medication.medicationStatus;
  }
  return out;
}

/** initialRecord から各セクションの otherText を復元 */
function restoreOtherTexts(
  rec: StoredDailyRecord | undefined,
): Record<string, string> {
  if (!rec) return {};
  const out: Record<string, string> = {};
  if (rec.sleep?.otherText) out['sleep'] = rec.sleep.otherText;
  if (rec.meal?.otherText) out['meal'] = rec.meal.otherText;
  if (rec.exercise?.otherText) out['exercise'] = rec.exercise.otherText;
  if (rec.condition?.otherText) out['condition'] = rec.condition.otherText;
  if (rec.medication?.otherText) out['meds'] = rec.medication.otherText;
  return out;
}

export function MoodLogScreen({
  initialMood = 3,
  enabledCategoryIds = DEFAULT_RECORD_IDS,
  targetDate,
  initialRecord,
  onCancel,
  onSubmit,
}: MoodLogScreenProps) {
  const effectiveTarget = targetDate ?? todayISO();
  const todayMode = isToday(effectiveTarget);
  const isEdit = initialRecord != null;

  const [mood, setMood] = useState<Mood>(initialRecord?.mood ?? initialMood);
  const [influences, setInfluences] = useState<Set<PrimaryInfluence>>(
    () => new Set(initialRecord?.primaryInfluence ?? []),
  );
  const [influenceOtherText, setInfluenceOtherText] = useState<string>(
    initialRecord?.influenceOtherText ?? '',
  );

  // 仕様 §2.2 — 「もっと記録する？」トグル。
  // 修正時は既存データがあるので最初から開いておく。
  const [showMore, setShowMore] = useState<boolean>(isEdit);

  const [sel, setSel] = useState<SelectionMap>(() => restoreSelections(initialRecord));
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState<string>(initialRecord?.note ?? '');
  // 各カテゴリの「その他」自由入力。キーはカテゴリID (sleep/meal/exercise/condition/meds)
  const [sectionOtherTexts, setSectionOtherTexts] = useState<Record<string, string>>(
    () => restoreOtherTexts(initialRecord),
  );

  // 画面タイトル (T8)
  const screenTitle = todayMode
    ? isEdit
      ? '今日の記録を修正する'
      : '今日の様子を記録する'
    : isEdit
      ? '昨日の記録を修正する'
      : '昨日の様子を記録する';
  const targetLabel = formatTargetLabel(effectiveTarget);

  const enabledCategories = useMemo<Category[]>(
    () => CATEGORIES.filter((c) => enabledCategoryIds.includes(c.id)),
    [enabledCategoryIds],
  );

  const toggleInfluence = (id: PrimaryInfluence) => {
    setInfluences((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const keyOf = (cat: Category, sec: CategorySection) => `${cat.id}.${sec.id}`;

  const setSingle = (cat: Category, sec: CategorySection, optId: string) =>
    setSel((prev) => {
      const k = keyOf(cat, sec);
      return { ...prev, [k]: prev[k] === optId ? null : optId };
    });

  const toggleMulti = (cat: Category, sec: CategorySection, optId: string) =>
    setSel((prev) => {
      const k = keyOf(cat, sec);
      const cur = prev[k];
      const s = new Set(cur instanceof Set ? cur : []);
      if (s.has(optId)) {
        s.delete(optId);
      } else {
        // conditionFlags: 'none' と他フラグの排他制御
        if (cat.id === 'condition' && sec.id === 'conditionFlags') {
          if (optId === 'none') {
            s.clear();
          } else {
            s.delete('none');
          }
        }
        s.add(optId);
      }
      return { ...prev, [k]: s };
    });

  const setTime = (cat: Category, sec: CategorySection, v: string) =>
    setSel((prev) => ({ ...prev, [keyOf(cat, sec)]: v || null }));

  const isCategoryFilled = (cat: Category) =>
    cat.sections.some((sec) => {
      const v = sel[keyOf(cat, sec)];
      if (v instanceof Set) return v.size > 0;
      return v != null && v !== '';
    });

  const summaryFor = (cat: Category): string => {
    const parts: string[] = [];
    for (const sec of cat.sections) {
      const v = sel[keyOf(cat, sec)];
      if (v == null) continue;
      if (sec.type === 'single' && typeof v === 'string') {
        const o = sec.options?.find((o) => o.id === v);
        if (o) parts.push(o.label);
      } else if (sec.type === 'multi' && v instanceof Set && v.size) {
        const labels =
          sec.options
            ?.filter((o) => v.has(o.id))
            .map((o) => o.label) ?? [];
        if (labels.length) {
          parts.push(
            labels.length <= 2
              ? labels.join('・')
              : `${labels[0]} ほか${labels.length - 1}`,
          );
        }
      } else if (sec.type === 'time' && typeof v === 'string') {
        parts.push(v);
      }
    }
    return parts.join(' / ');
  };

  const handleSubmit = () => {
    // 仕様 §3.6: 未入力は失敗ではない。そのまま素通しでOK。
    // その他自由入力は端末ローカル限定 (§9.5)。外部送信からは除外する。
    const cleanOtherTexts: Record<string, string> = {};
    for (const [k, v] of Object.entries(sectionOtherTexts)) {
      if (v && v.trim() !== '') cleanOtherTexts[k] = v.slice(0, 100);
    }
    onSubmit?.({
      mood,
      primaryInfluence: Array.from(influences),
      selections: sel,
      note,
      influenceOtherText: influenceOtherText.trim()
        ? influenceOtherText.slice(0, 100)
        : undefined,
      sectionOtherTexts: cleanOtherTexts,
    });
  };

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
              {screenTitle}
            </div>
            <div>{targetLabel}</div>
          </div>
          <div style={{ width: 44 }} />
        </div>

        {/* ── Q1: 気分 (§2.3) ────── */}
        <SectionTitle
          index={1}
          title={todayMode ? '今のきもちは？' : '昨日のきもちは？'}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            background: '#fff',
            borderRadius: 22,
            padding: '14px 8px',
            boxShadow: CARD_SHADOW,
          }}
        >
          {MOODS.map((m) => {
            const selected = m.v === mood;
            return (
              <button
                key={m.v}
                onClick={() => setMood(m.v)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: '6px 0',
                  fontFamily: ROUNDED_FONT,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: selected ? PALETTE.sageDeep : PALETTE.sageSoft,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    transition: 'all .2s',
                    transform: selected ? 'scale(1.08)' : 'scale(1)',
                    boxShadow: selected
                      ? '0 4px 12px rgba(127,169,130,0.4)'
                      : 'none',
                  }}
                >
                  {m.face}
                </div>
                <span
                  style={{
                    fontSize: 9,
                    color: selected ? PALETTE.sageDeep : PALETTE.inkSoft,
                    fontWeight: selected ? 700 : 500,
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Q2: 影響していそうなこと (§2.4) ─── */}
        <SectionTitle
          index={2}
          title={
            todayMode
              ? '今のきもちに一番影響していそうなことは？'
              : '昨日のきもちに一番影響していそうなことは？'
          }
          hint="複数えらべます"
        />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            background: '#fff',
            borderRadius: 18,
            padding: 12,
            boxShadow: CARD_SHADOW,
          }}
        >
          {PRIMARY_INFLUENCES.map((inf) => {
            const isSel = influences.has(inf.id);
            return (
              <button
                key={inf.id}
                onClick={() => toggleInfluence(inf.id)}
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
                <span style={{ fontSize: 13 }}>{inf.icon}</span>
                <span>{inf.label}</span>
              </button>
            );
          })}
        </div>

        {/* T9: 影響要因「その他」を選んだ時だけ自由入力欄を出す。
            個人名・施設名を書きすぎない補足を表示。端末ローカル限定。 */}
        {influences.has('other') && (
          <OtherTextField
            value={influenceOtherText}
            onChange={setInfluenceOtherText}
            placeholder="例: 朝の電車が混んでいて疲れた"
          />
        )}

        {/* ── Q3: もっと記録する？ (§2.2 トグル) ─── */}
        <div style={{ marginTop: 22 }}>
          <button
            onClick={() => setShowMore((v) => !v)}
            style={{
              width: '100%',
              border: `1.5px ${showMore ? 'solid' : 'dashed'} ${
                showMore ? PALETTE.sageDeep : PALETTE.sage
              }`,
              background: showMore ? PALETTE.sageSoft : 'transparent',
              borderRadius: 16,
              padding: '14px 16px',
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
                width: 32,
                height: 32,
                borderRadius: 10,
                background: showMore ? PALETTE.sageDeep : PALETTE.sageSoft,
                color: showMore ? '#fff' : PALETTE.sageDeep,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {showMore ? '−' : '＋'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                もっと記録する？
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: PALETTE.inkSoft,
                  marginTop: 2,
                }}
              >
                睡眠・食事・運動・体調・服薬を任意で記録できます
              </div>
            </div>
          </button>
        </div>

        {/* ── 詳細記録 (§3.1〜3.5) ─── */}
        {showMore && (
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
                記録項目は「じぶん」画面で追加できます。
              </div>
            )}
            {enabledCategories.map((cat) => {
              const isOpen = open === cat.id;
              const filled = isCategoryFilled(cat);
              const summary = summaryFor(cat);
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
                  key={cat.id}
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
                    onClick={() => setOpen(isOpen ? null : cat.id)}
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
                        style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}
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
                          const trigger =
                            sel[`${cat.id}.${sec.showWhen.sectionId}`];
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

                      {/* T10: その他を選んだら短い自由入力欄を出す。
                          各カテゴリ単位で1つ。端末ローカル限定。 */}
                      {hasOtherSelected && (
                        <OtherTextField
                          value={sectionOtherTexts[cat.id] ?? ''}
                          onChange={(v) =>
                            setSectionOtherTexts((prev) => ({ ...prev, [cat.id]: v }))
                          }
                          placeholder="その他、気になったこと"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Q4: 自由記述 (§2.5) ───────── */}
        <SectionTitle
          index={4}
          title={todayMode ? '今日のメモ' : '昨日のメモ'}
          hint="書かなくてもOK・あなたのための欄です"
        />

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例：朝、すこし散歩できた。"
          rows={3}
          style={{
            minHeight: 96,
            padding: 14,
            border: 'none',
            borderRadius: 16,
            background: '#fff',
            boxShadow: CARD_SHADOW,
            fontSize: 14,
            fontFamily: ROUNDED_FONT,
            color: PALETTE.ink,
            resize: 'none',
            outline: 'none',
            lineHeight: 1.6,
          }}
        />
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            color: PALETTE.inkSoft,
            lineHeight: 1.6,
          }}
        >
          ※ 自由記述は端末に保存され、本人の振り返り用です。
          <br />
          書きたくないことは書かなくて大丈夫です。
          <br />
          緊急のご相談には使わないでください（じぶん画面に相談先があります）。
          <br />
          個人名・施設名などを書きすぎないでください。
        </div>

        <button
          onClick={handleSubmit}
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
          {isEdit ? '修正を保存する' : '記録する'}
        </button>
      </div>
    </PhoneShell>
  );
}

// ── 小さなプレゼンテーション部品 ────────────────────────────────

function SectionTitle({
  index,
  title,
  hint,
}: {
  index: number;
  title: string;
  hint?: string;
}) {
  return (
    <div style={{ marginTop: 22, marginBottom: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: PALETTE.sageDeep,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {index}
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>
          {title}
        </span>
      </div>
      {hint && (
        <div
          style={{
            fontSize: 11,
            color: PALETTE.inkSoft,
            marginTop: 4,
            marginLeft: 28,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

// T9 / T10: その他用の自由入力欄。100文字上限。端末ローカル限定 (§9.5)。
function OtherTextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div
      style={{
        marginTop: 8,
        background: PALETTE.creamSoft,
        borderRadius: 12,
        padding: '10px 12px',
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 100))}
        placeholder={placeholder ?? 'その他、気になったこと'}
        maxLength={100}
        style={{
          width: '100%',
          border: 'none',
          borderBottom: `1px solid ${PALETTE.sage}`,
          outline: 'none',
          background: 'transparent',
          fontSize: 13,
          fontFamily: ROUNDED_FONT,
          color: PALETTE.ink,
          padding: '4px 2px',
        }}
      />
      <div
        style={{
          marginTop: 4,
          fontSize: 10,
          color: PALETTE.inkSoft,
          lineHeight: 1.5,
        }}
      >
        個人名・施設名などを書きすぎないでください。
      </div>
    </div>
  );
}

interface SectionRendererProps {
  cat: Category;
  sec: CategorySection;
  value: SelectionValue | undefined;
  onPickSingle: (id: string) => void;
  onToggleMulti: (id: string) => void;
  onSetTime: (v: string) => void;
}

function SectionRenderer({
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
