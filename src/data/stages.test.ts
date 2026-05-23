import { describe, it, expect } from 'vitest';
import {
  deriveStage,
  getMilestone,
  dailyWhisperFor,
  MILESTONES,
  STAGE_EMOJI,
  STAGE_LABEL,
  STAGE_COPY,
  STAGE_WHISPERS,
  STAGE_LONG_WHISPERS,
} from './stages';
import type { Stage } from './types';

describe('deriveStage', () => {
  it('streak からステージを決める', () => {
    expect(deriveStage(0)).toBe(0);
    expect(deriveStage(1)).toBe(1);
    expect(deriveStage(2)).toBe(2);
    expect(deriveStage(3)).toBe(3);
    expect(deriveStage(99)).toBe(3);
  });

  it('manualStage と streak 由来の大きい方を採用する', () => {
    expect(deriveStage(0, 2)).toBe(2);
    expect(deriveStage(3, 1)).toBe(3);
    expect(deriveStage(1, 1)).toBe(1);
  });
});

describe('getMilestone', () => {
  it('日数に応じたマイルストーンを返す (境界値)', () => {
    expect(getMilestone(0).label).toBe('はじめまして');
    expect(getMilestone(6).label).toBe('はじめまして');
    expect(getMilestone(7).label).toBe('すこし慣れた仲');
    expect(getMilestone(29).label).toBe('すこし慣れた仲');
    expect(getMilestone(30).label).toBe('いつもの友達');
    expect(getMilestone(100).label).toBe('相棒');
    expect(getMilestone(365).label).toBe('かけがえのない存在');
    expect(getMilestone(99999).label).toBe('かけがえのない存在');
  });

  it('最終マイルストーンの next は null', () => {
    expect(getMilestone(365).next).toBeNull();
  });
});

describe('dailyWhisperFor', () => {
  it('ステージに対応するささやきを返す', () => {
    expect(STAGE_WHISPERS.egg).toContain(dailyWhisperFor(0));
    expect(STAGE_WHISPERS.crack).toContain(dailyWhisperFor(1));
    expect(STAGE_WHISPERS.chick).toContain(dailyWhisperFor(2));
    expect(STAGE_WHISPERS.bird).toContain(dailyWhisperFor(3));
  });

  it('longForm では長いささやきを返す', () => {
    expect(STAGE_LONG_WHISPERS.bird).toContain(dailyWhisperFor(3, true));
  });

  it('同じ日の呼び出しは決定的 (同じ文字列)', () => {
    expect(dailyWhisperFor(2)).toBe(dailyWhisperFor(2));
  });

  it('範囲外のステージはクランプする', () => {
    expect(STAGE_WHISPERS.egg).toContain(dailyWhisperFor(-1 as Stage));
    expect(STAGE_WHISPERS.bird).toContain(dailyWhisperFor(9 as Stage));
  });
});

describe('ステージ表ラベル', () => {
  it('全 4 ステージ分のラベルが揃っている', () => {
    for (const s of [0, 1, 2, 3] as Stage[]) {
      expect(STAGE_EMOJI[s]).toBeTruthy();
      expect(STAGE_LABEL[s]).toBeTruthy();
      expect(STAGE_COPY[s]).toBeTruthy();
    }
  });

  it('MILESTONES は 5 段階', () => {
    expect(MILESTONES).toHaveLength(5);
    expect(MILESTONES[0].days).toBe(0);
  });
});
