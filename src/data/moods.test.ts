import { describe, it, expect } from 'vitest';
import {
  MOODS,
  PRIMARY_INFLUENCES,
  CATEGORIES,
  CATEGORY_BY_ID,
} from './moods';

describe('MOODS', () => {
  it('5 段階の気分が定義されている (仕様 §2.3)', () => {
    expect(MOODS).toHaveLength(5);
    expect(MOODS.map((m) => m.v)).toEqual([1, 2, 3, 4, 5]);
  });

  it('各気分に face と label がある', () => {
    for (const m of MOODS) {
      expect(m.face).toBeTruthy();
      expect(m.label).toBeTruthy();
    }
  });
});

describe('PRIMARY_INFLUENCES', () => {
  it('20 個の選択肢がある (仕様 §2.4)', () => {
    expect(PRIMARY_INFLUENCES).toHaveLength(20);
  });

  it('id が重複していない', () => {
    const ids = PRIMARY_INFLUENCES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('「その他」と「理由がわからない」を含む', () => {
    const ids = PRIMARY_INFLUENCES.map((p) => p.id);
    expect(ids).toContain('other');
    expect(ids).toContain('unknown');
  });
});

describe('CATEGORIES (詳細記録)', () => {
  it('5 カテゴリ (睡眠/食事/運動/体調/服薬)', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([
      'sleep',
      'meal',
      'exercise',
      'condition',
      'meds',
    ]);
  });

  it('CATEGORY_BY_ID で id 引きできる', () => {
    expect(CATEGORY_BY_ID.sleep.label).toBe('睡眠');
    expect(CATEGORY_BY_ID.meds.label).toBe('服薬');
    expect(CATEGORY_BY_ID.unknown).toBeUndefined();
  });

  it('各カテゴリは 1 つ以上のセクションを持つ', () => {
    for (const c of CATEGORIES) {
      expect(c.sections.length).toBeGreaterThan(0);
    }
  });

  it('睡眠は 4 セクション (入眠/起床/夜間覚醒/気になること)', () => {
    expect(CATEGORY_BY_ID.sleep.sections.map((s) => s.id)).toEqual([
      'bedtime',
      'wakeTime',
      'nightAwakenings',
      'issues',
    ]);
  });

  it('食事の「原因」セクションは mealStatus 次第で表示される', () => {
    const causes = CATEGORY_BY_ID.meal.sections.find((s) => s.id === 'causes');
    expect(causes?.showWhen?.sectionId).toBe('mealStatus');
    expect(causes?.showWhen?.values).toContain('low_appetite');
  });
});
