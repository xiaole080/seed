// careView.ts のユニットテスト。
// computeRelationshipProgress のマイルストーン境界・進捗率・最大到達、
// および sortRoutinesByActiveFirst の並び替えを確認する。

import { describe, it, expect } from 'vitest';
import {
  computeRelationshipProgress,
  sortRoutinesByActiveFirst,
} from './careView';
import type { Routine } from './routines';

describe('computeRelationshipProgress', () => {
  it('0 日: 最初のマイルストーン、次は 7 日', () => {
    const p = computeRelationshipProgress(0);
    expect(p.milestone.label).toBe('はじめまして');
    expect(p.nextLabel).toBe('すこし慣れた仲');
    expect(p.segStart).toBe(0);
    expect(p.segEnd).toBe(7);
    expect(p.segPct).toBe(0);
    expect(p.remaining).toBe(7);
    expect(p.isMax).toBe(false);
  });

  it('区間途中: 進捗率と残り日数を線形に計算する', () => {
    const p = computeRelationshipProgress(12);
    expect(p.milestone.label).toBe('すこし慣れた仲');
    expect(p.segStart).toBe(7);
    expect(p.segEnd).toBe(30);
    expect(p.remaining).toBe(18);
    expect(p.segPct).toBeCloseTo(((12 - 7) / (30 - 7)) * 100, 5);
  });

  it('マイルストーン到達ちょうどの日は進捗率 0 から始まる', () => {
    const p = computeRelationshipProgress(30);
    expect(p.milestone.label).toBe('いつもの友達');
    expect(p.segStart).toBe(30);
    expect(p.segEnd).toBe(100);
    expect(p.segPct).toBe(0);
    expect(p.remaining).toBe(70);
  });

  it('最大マイルストーン: isMax=true、残り 0、進捗率 100', () => {
    const p = computeRelationshipProgress(400);
    expect(p.milestone.label).toBe('かけがえのない存在');
    expect(p.nextLabel).toBeNull();
    expect(p.isMax).toBe(true);
    expect(p.segStart).toBe(365);
    expect(p.segEnd).toBe(400);
    expect(p.segPct).toBe(100);
    expect(p.remaining).toBe(0);
  });
});

describe('sortRoutinesByActiveFirst', () => {
  const make = (id: string, paused?: boolean): Routine => ({
    id,
    text: id,
    frequency: 'daily',
    paused,
    createdAt: '2026-05-25T00:00:00.000Z',
  });

  it('ひと休み中でないものを先頭に、各グループ内の順序は保つ', () => {
    const input = [
      make('a'),
      make('b', true),
      make('c'),
      make('d', true),
    ];
    const sorted = sortRoutinesByActiveFirst(input);
    expect(sorted.map((r) => r.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('元配列を破壊しない', () => {
    const input = [make('a', true), make('b')];
    sortRoutinesByActiveFirst(input);
    expect(input.map((r) => r.id)).toEqual(['a', 'b']);
  });
});
