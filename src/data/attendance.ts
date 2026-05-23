import type { AttendanceMode, Schedule, TimeBand } from './types';

export const DAYS = ['月', '火', '水', '木', '金', '土', '日'] as const;

export const MODE_LABEL: Record<AttendanceMode, string> = {
  office: '通所',
  home:   '在宅',
  off:    '休み',
};

export const MODE_COLOR: Record<
  AttendanceMode,
  { bg: string; fg: string; soft: string }
> = {
  office: { bg: '#7FA982',     fg: '#fff',    soft: '#E3EDDC' },
  home:   { bg: '#E8B873',     fg: '#fff',    soft: '#F5DDB0' },
  off:    { bg: 'transparent', fg: '#5A6A5C', soft: '#F0EEE9' },
};

export const BAND_LABEL: Record<TimeBand, string> = {
  full: '一日',
  am:   '午前のみ',
  pm:   '午後のみ',
};

export const DEFAULT_SCHEDULE: Schedule = {
  0: { mode: 'office', band: 'full' },
  1: { mode: 'office', band: 'full' },
  2: { mode: 'home',   band: 'am' },
  3: { mode: 'office', band: 'full' },
  4: { mode: 'office', band: 'pm' },
  5: { mode: 'off',    band: 'full' },
  6: { mode: 'off',    band: 'full' },
};
