import { PALETTE } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { BottomTabs, type TabId } from '../components/BottomTabs';
import { RegionPicker } from '../components/RegionPicker';
import { RecordItemsManager } from '../components/RecordItemsManager';
import { CrisisSupportCard } from '../components/CrisisSupportCard';
import { AttendanceSetupScreen } from './AttendanceSetupScreen';
import { DEFAULT_SCHEDULE } from '../data/attendance';
import { DEFAULT_RECORD_IDS } from '../data/records';
import type {
  ConsentState,
  RecordPreset,
  Schedule,
  SelectedRegion,
} from '../data/types';
import { useProfileScreen } from './profile/useProfileScreen';
import { NicknameCard } from './profile/NicknameCard';
import { WeatherConsentToggle } from './profile/WeatherConsentToggle';
import { AttendanceExportCard } from './profile/AttendanceExportCard';
import { JsonExportCard } from './profile/JsonExportCard';
import { UsageLogCard } from './profile/UsageLogCard';
import { DataDeleteCard } from './profile/DataDeleteCard';

interface ProfileScreenProps {
  nickname?: string;
  schedule?: Schedule;
  region?: SelectedRegion;
  /** 天気APIの同意状態 (省略時 'notAsked')。 */
  weatherConsent?: ConsentState['weatherApiConsent'];
  recordIds?: string[];
  /** ON にしているカスタム項目 (永続化対象) */
  customRecordItems?: RecordPreset[];
  onTab?: (t: TabId) => void;
  onChangeNickname?: (v: string) => void;
  onChangeRegion?: (r: SelectedRegion) => void;
  /** 天気APIの ON/OFF 切替。OFF にしたら親側でキャッシュもクリアする。 */
  onChangeWeatherConsent?: (next: ConsentState['weatherApiConsent']) => void;
  /** 「他の地域を探す」遷移。 */
  onOpenRegionSearch?: () => void;
  /** 記録項目 ON/OFF + カスタム追加・削除を親へ通知 (T5) */
  onChangeRecordItems?: (ids: string[], customs: RecordPreset[]) => void;
  onAllDataDeleted?: () => void;
}

export function ProfileScreen({
  nickname = 'はる',
  schedule = DEFAULT_SCHEDULE,
  region = { kind: 'preset', presetId: 'tokyo' },
  weatherConsent = 'notAsked',
  recordIds = DEFAULT_RECORD_IDS,
  customRecordItems = [],
  onTab,
  onChangeNickname,
  onChangeRegion,
  onChangeWeatherConsent,
  onOpenRegionSearch,
  onChangeRecordItems,
  onAllDataDeleted,
}: ProfileScreenProps) {
  const { nick, onNickChange, reg, onRegionChange, onWeatherChange } =
    useProfileScreen({
      nickname,
      region,
      onChangeNickname,
      onChangeRegion,
      onChangeWeatherConsent,
    });

  return (
    <PhoneShell bg={PALETTE.creamSoft} label="05 わたし">
      <BackgroundLeaves />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '4px 22px 12px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700 }}>わたし</div>
        </div>

        <NicknameCard nick={nick} onChange={onNickChange} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>天気・気圧の地域</div>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>
            ホームに表示
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <RegionPicker
            value={reg}
            onChange={onRegionChange}
            onSearchMore={onOpenRegionSearch}
          />
        </div>

        {/* 天気APIの ON/OFF (オプトイン) */}
        <WeatherConsentToggle consent={weatherConsent} onChange={onWeatherChange} />

        <div style={{ height: 12 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>記録する項目</div>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>
            ON/OFF・追加できます
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <RecordItemsManager
            initialIds={recordIds}
            customs={customRecordItems}
            onChange={(ids, customs) => onChangeRecordItems?.(ids, customs)}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>通所のよてい</div>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>
            タップして変更
          </div>
        </div>

        <AttendanceSetupScreen initial={schedule} embedded />

        <div style={{ marginTop: 22, marginBottom: 8 }}>
          <CrisisSupportCard />
        </div>

        {/* 仕様 §4.3 — 月末通所ファイル出力 */}
        <AttendanceExportCard schedule={schedule} nickname={nick} />

        {/* Sprint 2026-05-23 Phase 2d — 全データ JSON エクスポート (端末内のみ) */}
        <JsonExportCard />

        {/* docs/usage-log-spec.md — 利用ログ (端末内のみ・内容は含まない) */}
        <UsageLogCard />

        {/* 仕様 §13.1 / §13.6 — データ削除 (A6) */}
        <DataDeleteCard onAllDataDeleted={onAllDataDeleted} />
      </div>
      <BottomTabs active="me" onChange={onTab} />
    </PhoneShell>
  );
}
