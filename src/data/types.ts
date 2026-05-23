export type Stage = 0 | 1 | 2 | 3;

export type Mood = 1 | 2 | 3 | 4 | 5;

export type EggSpeciesId = 'chicken' | 'robin' | 'quail';

export type EggTraitId = 'calm' | 'curious' | 'bright' | 'gentle';

export interface EggSpeciesPalette {
  id: EggSpeciesId;
  label: string;
  sub: string;
  shell: string;
  shellShadow: string;
  speckle: string | null;
  body: string;
  bodyDark: string;
  belly?: string;
  stripe?: string;
  cheek: string;
  beak: string;
  foot: string;
}

export interface EggTraitOption {
  id: EggTraitId;
  label: string;
  icon: string;
  sub: string;
}

export interface Milestone {
  days: number;
  label: string;
  next: number | null;
}

export interface UserTask {
  id: string;
  name: string;
  impact: 'basic' | 'effort';
  done: boolean;
  createdAt: Date;
}

export type AttendanceMode = 'office' | 'home' | 'off';
export type TimeBand = 'full' | 'am' | 'pm';
export type AttendanceState = 'before' | 'checkedIn' | 'checkedOut';

export interface DaySchedule {
  mode: AttendanceMode;
  band: TimeBand;
}

export type Schedule = Record<number, DaySchedule>;

export interface TodayCard {
  mode: AttendanceMode;
  band: TimeBand;
  dayLabel: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export type RegionId =
  | 'tokyo'
  | 'osaka'
  | 'sapporo'
  | 'fukuoka'
  | 'nagoya'
  | 'sendai'
  | 'hiroshima'
  | 'okinawa';

export interface RegionInfo {
  label: string;
  temp: number;
  icon: string;
  cond: string;
  pressure: number;
  trend: 'up' | 'down' | 'stable';
}

export interface RecordPreset {
  id: string;
  label: string;
  icon: string;
  required?: boolean;
  hint?: string;
}

export interface Whisper {
  tone: 'gentle' | 'cheer' | 'soft';
  text: string;
  from: string;
}

export interface Goal {
  id: string;
  icon: string;
  text: string;
  kind: string;
  progress: number;
  target: number;
  active: boolean;
}

export interface HistoryEntry {
  dayOffset: number;
  mood: Mood;
  sleep: 'good' | 'normal' | 'shallow' | 'bad' | 'oversleep';
  meds: 'all' | 'partial' | 'forgot' | 'none';
  attended: 0 | 1;
  tags: string[];
}

// ── Seed v1.0 仕様 (Seed_260522_UPDATE.md §5, §13) ──────────────

export type PrimaryInfluence =
  | 'sleep'
  | 'fatigue'
  | 'physical_condition'
  | 'pain'
  | 'meal'
  | 'weather_pressure'
  | 'going_out'
  | 'housework'
  | 'family'
  | 'friends'
  | 'supporter_workplace'
  | 'sns'
  | 'attendance'
  | 'work_study'
  | 'money'
  | 'future_anxiety'
  | 'unknown'
  | 'rumination'
  | 'low_confidence'
  | 'other';

export interface MoodEntry {
  moodScore: Mood;
  primaryInfluence: PrimaryInfluence[];
  note?: string;
}

export type NightAwakenings = 'none' | 'once' | 'multiple';

export type SleepIssue =
  | 'difficulty_falling_asleep'
  | 'woke_up_during_night'
  | 'early_morning_awake'
  | 'bad_dreams'
  | 'day_night_reversal'
  | 'daytime_sleepiness';

export interface SleepDetail {
  bedtime?: string;
  wakeTime?: string;
  nightAwakenings?: NightAwakenings;
  sleepIssues?: SleepIssue[];
}

export type MealStatus = 'normal' | 'less' | 'too_much' | 'low_appetite';

export type MealCause =
  | 'physical'
  | 'stress'
  | 'fatigue'
  | 'medication'
  | 'no_appetite'
  | 'other';

export interface MealDetail {
  mealStatus?: MealStatus;
  mealsTaken: {
    breakfast?: MealStatus;
    lunch?: MealStatus;
    dinner?: MealStatus;
  };
  causes?: MealCause[];
}

export type ActivityFlag =
  | 'went_out'
  | 'walk'
  | 'stretch'
  | 'housework'
  | 'attended_facility'
  | 'hardly_moved';

export interface ExerciseDetail {
  activityFlags: ActivityFlag[];
}

export type ConditionFlag =
  | 'fatigue'
  | 'headache'
  | 'stomachache'
  | 'dizziness'
  | 'nausea'
  | 'palpitation'
  | 'tension'
  | 'cold_like'
  | 'none';

export interface ConditionDetail {
  conditionFlags: ConditionFlag[];
}

export type MedicationStatus =
  | 'as_planned'
  | 'partially_missed'
  | 'missed_all'
  | 'no_medication_today';

export interface MedicationDetail {
  medicationStatus: MedicationStatus;
}

export interface AttendanceMonthlyRecord {
  localAttendanceId: string;
  date: string;
  weekday: string;
  plannedMode: AttendanceMode;
  plannedBand?: TimeBand;
  actualMode?: AttendanceMode;
  checkIn?: string;
  checkOut?: string;
  durationMinutes?: number;
  missingClock: boolean;
  edited: boolean;
  editedAt?: string;
  exportMonth: string;
}

export interface MissingnessFlags {
  noRecord: boolean;
  skippedMood: boolean;
  skippedPrimaryInfluence: boolean;
  skippedSleep: boolean;
  skippedMeal: boolean;
  skippedExercise: boolean;
  skippedCondition: boolean;
  skippedMedication: boolean;
  skippedAttendance: boolean;
  skippedNote: boolean;
}

export interface ConsentState {
  appTermsAccepted: boolean;
  attendanceBackupConsent: 'notAsked' | 'declined' | 'accepted';
  attendanceExportConsent: 'notAsked' | 'declined' | 'accepted';
  researchConsent: 'notAsked' | 'declined' | 'accepted';
  consentVersion: string;
  consentedAt?: string;
  withdrawnAt?: string;
}
