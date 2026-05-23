import type { HistoryEntry, Mood } from './types';

const moods: Mood[]     = [3, 4, 3, 2, 3, 4, 5, 4, 3, 2, 3, 4, 4, 5];
const sleeps: HistoryEntry['sleep'][] = [
  'normal', 'good', 'shallow', 'bad', 'normal', 'good', 'good',
  'normal', 'shallow', 'bad', 'normal', 'good', 'good', 'good',
];
const meds: HistoryEntry['meds'][] = [
  'all', 'all', 'partial', 'forgot', 'all', 'all', 'all',
  'partial', 'all', 'all', 'all', 'all', 'all', 'all',
];
const attended: (0 | 1)[] = [1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1];

export const HISTORY_14: HistoryEntry[] = moods.map((m, i) => ({
  dayOffset: 13 - i,
  mood: m,
  sleep: sleeps[i],
  meds: meds[i],
  attended: attended[i],
  tags: ['breakfast', 'walk'].slice(0, (i % 3) + 1),
}));

export const SLEEP_VALUE: Record<HistoryEntry['sleep'], number> = {
  good: 4, normal: 3, shallow: 2, bad: 1, oversleep: 2,
};

export const MEDS_VALUE: Record<HistoryEntry['meds'], number> = {
  all: 3, partial: 2, forgot: 1, none: 0,
};
