// App ルートの永続化状態・定数・UI に依存しない補助関数。
// 画面レンダリングや副作用は App / screens 側に残す。

import { loadJson } from '../storage';
import { DEFAULT_SCHEDULE } from './attendance';
import { DEFAULT_RECORD_IDS } from './records';
import { REGIONS, roundCoord } from './regions';
import type {
  AttendanceState,
  ConsentState,
  EggSpeciesId,
  EggTraitId,
  Mood,
  RecordPreset,
  RegionId,
  Schedule,
  SelectedRegion,
  Stage,
} from './types';

export type Phase =
  | 'consent'
  | 'login'
  | 'setup-egg'
  | 'setup-attendance'
  | 'setup-records'
  | 'app';

export interface AppState {
  nickname: string;
  schedule: Schedule;
  recordIds: string[];
  /** わたし画面で追加されたカスタム記録項目 (永続化対象) */
  customRecordItems: RecordPreset[];
  /**
   * 選択中の地域。schemaVersion 0.2.0 で `RegionId` から `SelectedRegion` に拡張。
   * 永続化されたデータが string (旧 RegionId) の場合は normalizeRegion で
   * `{ kind: 'preset', presetId }` に正規化する。
   */
  region: SelectedRegion;
  manualStage: Stage;
  streak: number;
  totalDays: number;
  attendanceState: AttendanceState;
  lastMood: Mood;
  eggSpecies: EggSpeciesId;
  eggTrait: EggTraitId | null;
  eggName: string;
  showWhisper: boolean;
}

export const INITIAL_STATE: AppState = {
  nickname: 'はる',
  schedule: DEFAULT_SCHEDULE,
  recordIds: DEFAULT_RECORD_IDS,
  customRecordItems: [],
  region: { kind: 'preset', presetId: 'tokyo' },
  manualStage: 0,
  streak: 0,
  totalDays: 0,
  attendanceState: 'before',
  lastMood: 4,
  eggSpecies: 'chicken',
  eggTrait: null,
  eggName: '',
  showWhisper: true,
};

export const STORAGE_KEY_STATE = 'seed.app.state.v1';
export const STORAGE_KEY_PHASE = 'seed.app.phase.v1';
export const STORAGE_KEY_CONSENT = 'seed.consent.v1';

export const DEFAULT_CONSENT: ConsentState = {
  appTermsAccepted: false,
  attendanceBackupConsent: 'notAsked',
  attendanceExportConsent: 'notAsked',
  researchConsent: 'notAsked',
  weatherApiConsent: 'notAsked',
  consentVersion: 'v1.1',
};

export const WEEKDAY_JP_LABELS = [
  '日',
  '月',
  '火',
  '水',
  '木',
  '金',
  '土',
] as const;

/** SelectionMap (Set を含む) を JSON 化可能な plain 形へ変換する。 */
export function selectionsToPlain(
  sel: Record<string, string | null | Set<string>>
): Record<string, string | string[] | null> {
  const out: Record<string, string | string[] | null> = {};
  for (const [k, v] of Object.entries(sel)) {
    out[k] = v instanceof Set ? Array.from(v) : v;
  }
  return out;
}

/** "HH:mm" 間の差分を分で返す。不正な入力は undefined。 */
export function diffMinutes(start: string, end: string): number | undefined {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return undefined;
  return eh * 60 + em - (sh * 60 + sm);
}

/** YYYY-MM-DD で今日からの offset 日を返す (offset=-1 は昨日)。 */
export function isoDaysOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * 旧形式 (string = RegionId) を含む region 値を SelectedRegion へ正規化する。
 * localStorage に残っている旧データを読み取る際の安全弁。
 */
export function normalizeRegion(raw: unknown): SelectedRegion {
  if (typeof raw === 'string') {
    if (raw in REGIONS) {
      return { kind: 'preset', presetId: raw as RegionId };
    }
    return { kind: 'preset', presetId: 'tokyo' };
  }
  if (raw && typeof raw === 'object') {
    const r = raw as Partial<SelectedRegion> & {
      kind?: string;
      presetId?: string;
      name?: string;
      lat?: number;
      lon?: number;
    };
    if (
      r.kind === 'preset' &&
      typeof r.presetId === 'string' &&
      r.presetId in REGIONS
    ) {
      return { kind: 'preset', presetId: r.presetId as RegionId };
    }
    if (
      r.kind === 'custom' &&
      typeof r.name === 'string' &&
      typeof r.lat === 'number' &&
      typeof r.lon === 'number'
    ) {
      // 読み込み時防御 (§4.2): 旧データに小数3位以降が残っていた場合の救済。
      return {
        kind: 'custom',
        name: r.name,
        lat: roundCoord(r.lat),
        lon: roundCoord(r.lon),
      };
    }
  }
  return { kind: 'preset', presetId: 'tokyo' };
}

/** localStorage から初期 phase を読む。 */
export function loadInitialPhase(): Phase {
  return loadJson<Phase>(STORAGE_KEY_PHASE, 'consent');
}

/**
 * localStorage から初期 consent を読む。
 * 旧 v1.0 ユーザに欠損 field があり得るので DEFAULT_CONSENT で穴埋めする。
 */
export function loadInitialConsent(): ConsentState {
  const loaded = loadJson<Partial<ConsentState>>(STORAGE_KEY_CONSENT, {});
  return { ...DEFAULT_CONSENT, ...loaded };
}

/**
 * localStorage から初期 AppState を読む。
 * - 旧スキーマの todayMode / todayBand は派生値化したため捨てる。
 * - 旧データ (string の RegionId) を SelectedRegion へ正規化する。
 */
export function loadInitialAppState(): AppState {
  const loaded = loadJson<
    Partial<AppState> & {
      region?: unknown;
      todayMode?: unknown;
      todayBand?: unknown;
    }
  >(STORAGE_KEY_STATE, {});
  const { todayMode: _tm, todayBand: _tb, ...rest } = loaded;
  void _tm;
  void _tb;
  return {
    ...INITIAL_STATE,
    ...rest,
    region: normalizeRegion(loaded.region ?? INITIAL_STATE.region),
  };
}
