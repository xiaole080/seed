import { useMemo, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { BottomTabs, type TabId } from '../components/BottomTabs';
import { RegionPicker } from '../components/RegionPicker';
import { RecordItemsManager } from '../components/RecordItemsManager';
import { CrisisSupportCard } from '../components/CrisisSupportCard';
import { AttendanceSetupScreen } from './AttendanceSetupScreen';
import { DEFAULT_SCHEDULE } from '../data/attendance';
import { DEFAULT_RECORD_IDS } from '../data/records';
import {
  attendanceFilename,
  downloadCsv,
  getMonthAttendance,
  hasAnyActual,
  recordsToCsv,
} from '../data/attendanceExport';
import { deleteAllLocalData } from '../data/store';
import {
  buildExportEnvelope,
  downloadJson,
  exportFilename,
} from '../data/jsonExport';
import type { RecordPreset, RegionId, Schedule } from '../data/types';

interface ProfileScreenProps {
  nickname?: string;
  schedule?: Schedule;
  region?: RegionId;
  recordIds?: string[];
  /** ON にしているカスタム項目 (永続化対象) */
  customRecordItems?: RecordPreset[];
  onTab?: (t: TabId) => void;
  onChangeNickname?: (v: string) => void;
  onChangeRegion?: (r: RegionId) => void;
  /** 記録項目 ON/OFF + カスタム追加・削除を親へ通知 (T5) */
  onChangeRecordItems?: (ids: string[], customs: RecordPreset[]) => void;
  onAllDataDeleted?: () => void;
}

export function ProfileScreen({
  nickname = 'はる',
  schedule = DEFAULT_SCHEDULE,
  region = 'tokyo',
  recordIds = DEFAULT_RECORD_IDS,
  customRecordItems = [],
  onTab,
  onChangeNickname,
  onChangeRegion,
  onChangeRecordItems,
  onAllDataDeleted,
}: ProfileScreenProps) {
  const [nick, setNick] = useState(nickname);
  const [reg, setReg] = useState<RegionId>(region);
  return (
    <PhoneShell bg={PALETTE.creamSoft} label="05 じぶん">
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
          <div style={{ fontSize: 22, fontWeight: 700 }}>じぶん</div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            padding: '14px 16px',
            boxShadow: CARD_SHADOW,
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `radial-gradient(circle at 50% 35%, #fff, ${PALETTE.sageSoft})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              flexShrink: 0,
            }}
          >
            🐥
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>ニックネーム</div>
            <input
              value={nick}
              onChange={(e) => {
                setNick(e.target.value);
                onChangeNickname?.(e.target.value);
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                fontSize: 17,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                color: PALETTE.ink,
                padding: '2px 0',
                outline: 'none',
                borderBottom: `1px dashed ${PALETTE.sage}`,
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>天気・気圧の地域</div>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>ホームに表示</div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <RegionPicker
            value={reg}
            onChange={(r) => {
              setReg(r);
              onChangeRegion?.(r);
            }}
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
          <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>タップして変更</div>
        </div>

        <AttendanceSetupScreen initial={schedule} embedded />

        <div style={{ marginTop: 22, marginBottom: 8 }}>
          <CrisisSupportCard />
        </div>

        {/* 仕様 §4.3 — 月末通所ファイル出力 */}
        <AttendanceExportCard schedule={schedule} nickname={nick} />

        {/* Sprint 2026-05-23 Phase 2d — 全データ JSON エクスポート (端末内のみ) */}
        <JsonExportCard />

        {/* 仕様 §13.1 / §13.6 — データ削除 (A6) */}
        <DataDeleteCard onAllDataDeleted={onAllDataDeleted} />
      </div>
      <BottomTabs active="me" onChange={onTab} />
    </PhoneShell>
  );
}

// ── 月末通所CSV出力カード ──────────────────────────────────────
// 仕様 §4.3 / §13.2 Phase 3:
//  - 通所時間データのみ書き出す (気分・体調・服薬・自由記述は含めない)
//  - 出力前にその旨を本人に明示する
//  - 共有はアプリ外で本人操作 (自動送信しない)
function AttendanceExportCard({
  schedule,
  nickname,
}: {
  schedule: Schedule;
  nickname?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex0, setMonthIndex0] = useState(today.getMonth());

  const records = useMemo(
    () => getMonthAttendance(schedule, year, monthIndex0),
    [schedule, year, monthIndex0],
  );
  const hasActual = hasAnyActual(records);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, monthIndex0 + delta, 1);
    setYear(d.getFullYear());
    setMonthIndex0(d.getMonth());
  };

  const doExport = () => {
    const csv = recordsToCsv(records);
    downloadCsv(attendanceFilename(year, monthIndex0, nickname), csv);
    setConfirming(false);
  };

  return (
    <div
      style={{
        marginTop: 18,
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: CARD_SHADOW,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 20 }}>📄</div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
          月末の通所ファイルを書き出す
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          lineHeight: 1.6,
        }}
      >
        通所時間のみをCSVとして書き出します。
        気分・体調・服薬・自由記述は含まれません。
      </div>

      {/* 月セレクタ */}
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => shiftMonth(-1)}
          style={monthBtnStyle()}
          aria-label="前の月"
        >
          ‹
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink }}>
          {year}年 {monthIndex0 + 1}月
        </div>
        <button
          onClick={() => shiftMonth(+1)}
          style={monthBtnStyle()}
          aria-label="次の月"
        >
          ›
        </button>
      </div>

      {!hasActual && (
        <div
          style={{
            marginTop: 8,
            background: PALETTE.amberSoft,
            color: PALETTE.ink,
            fontSize: 11,
            lineHeight: 1.6,
            borderRadius: 10,
            padding: '8px 10px',
          }}
        >
          この月はまだ実打刻がありません。書き出すと予定だけのファイルになります。
        </div>
      )}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          style={{
            marginTop: 12,
            width: '100%',
            border: `1.5px solid ${PALETTE.sage}`,
            background: PALETTE.sageSoft,
            color: PALETTE.sageDeep,
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
          }}
        >
          書き出す (CSV)
        </button>
      ) : (
        <div
          style={{
            marginTop: 12,
            background: PALETTE.creamSoft,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: PALETTE.ink,
              lineHeight: 1.6,
              marginBottom: 10,
            }}
          >
            気分・体調・服薬・自由記述は<strong>含まれません</strong>。
            <br />
            このまま書き出しますか？
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setConfirming(false)}
              style={{
                flex: 1,
                border: 'none',
                background: '#fff',
                color: PALETTE.inkSoft,
                borderRadius: 10,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
            <button
              onClick={doExport}
              style={{
                flex: 1.4,
                border: 'none',
                background: PALETTE.sageDeep,
                color: '#fff',
                borderRadius: 10,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              書き出す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function monthBtnStyle(): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    border: 'none',
    background: PALETTE.sageSoft,
    color: PALETTE.sageDeep,
    borderRadius: 12,
    fontSize: 18,
    fontWeight: 700,
    fontFamily: ROUNDED_FONT,
    cursor: 'pointer',
    flexShrink: 0,
  };
}

// ── JSON 全データエクスポート (Phase 2d) ────────────────────
// プライバシー方針:
//  - 本人操作・本人端末内の処理のみ。fetch は使わない。
//  - 自由記述・その他欄を含む。共有先には注意を促す。
//  - 外部送信ではないことを補足文で明示する。
//  - P-2 対応: 誤タップ防止のためインラインの確認ステップを挟む。
function JsonExportCard() {
  const [confirming, setConfirming] = useState(false);

  const doExport = () => {
    const envelope = buildExportEnvelope();
    downloadJson(exportFilename(), envelope);
    setConfirming(false);
  };

  return (
    <div
      style={{
        marginTop: 18,
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: CARD_SHADOW,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 20 }}>💾</div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
          データを書き出す（JSON）
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          lineHeight: 1.7,
        }}
      >
        端末にある記録すべて（自由記述・その他欄を含む）を1つのファイルとして書き出します。
        <br />
        あなたの端末で書き出します。外には送られません。
        <br />
        共有するときは、内容に個人情報が含まれていないか確認してください。
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          style={{
            marginTop: 12,
            width: '100%',
            minHeight: 44,
            border: `1.5px solid ${PALETTE.sage}`,
            background: PALETTE.sageSoft,
            color: PALETTE.sageDeep,
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
          }}
        >
          書き出す (JSON)
        </button>
      ) : (
        <div
          style={{
            marginTop: 12,
            background: PALETTE.creamSoft,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: PALETTE.ink,
              lineHeight: 1.6,
              marginBottom: 10,
            }}
          >
            自由記述・その他欄を含むすべての記録を1ファイルにまとめます。
            <br />
            共有先にご注意ください。
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setConfirming(false)}
              style={{
                flex: 1,
                border: 'none',
                background: '#fff',
                color: PALETTE.inkSoft,
                borderRadius: 10,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
            <button
              onClick={doExport}
              style={{
                flex: 1.4,
                border: 'none',
                background: PALETTE.sageDeep,
                color: '#fff',
                borderRadius: 10,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              書き出す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── データを消す (A6) ────────────────────────────────────────
//  - 端末のデータは即時削除できる
//  - 外部に送ったぶんは「アプリ外で」連絡してもらう旨を明示
function DataDeleteCard({
  onAllDataDeleted,
}: {
  onAllDataDeleted?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const doDelete = () => {
    deleteAllLocalData();
    setConfirming(false);
    onAllDataDeleted?.();
  };

  return (
    <div
      style={{
        marginTop: 18,
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: CARD_SHADOW,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 20 }}>🗑️</div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
          データを消す
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          lineHeight: 1.7,
        }}
      >
        この端末にあるすべての記録 (きもち・通所打刻・自由記述・設定)
        を消します。元に戻せません。
        <br />
        外部に送られたぶんは、配布者に「データを消してほしい」と
        伝えてもらえれば消してもらえます。
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          style={{
            marginTop: 12,
            width: '100%',
            border: `1.5px solid ${PALETTE.amber}`,
            background: '#fff',
            color: PALETTE.amber,
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            cursor: 'pointer',
          }}
        >
          端末のデータを消す
        </button>
      ) : (
        <div
          style={{
            marginTop: 12,
            background: PALETTE.amberSoft,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: PALETTE.ink,
              lineHeight: 1.6,
              marginBottom: 10,
            }}
          >
            ほんとうに、ぜんぶ消しますか？
            <br />
            元に戻すことはできません。
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setConfirming(false)}
              style={{
                flex: 1,
                border: 'none',
                background: '#fff',
                color: PALETTE.inkSoft,
                borderRadius: 10,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              やめる
            </button>
            <button
              onClick={doDelete}
              style={{
                flex: 1.4,
                border: 'none',
                background: PALETTE.amber,
                color: '#fff',
                borderRadius: 10,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              はい、消します
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
