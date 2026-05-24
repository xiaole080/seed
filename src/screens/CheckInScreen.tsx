import { useEffect, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { BottomTabs, type TabId } from '../components/BottomTabs';
import { BAND_LABEL, MODE_COLOR, MODE_LABEL } from '../data/attendance';
import type { AttendanceMode, AttendanceState, TodayCard } from '../data/types';

interface CheckInScreenProps {
  today?: TodayCard;
  state?: AttendanceState;
  nickname?: string;
  onBack?: () => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onTab?: (t: TabId) => void;
  /**
   * T1-C: 「時刻を手で直す」インライン編集 → 保存。
   * 親側で upsertAttendance + bumpStore を行う。
   * checkOut が undefined のときは帰宅時刻なしで保存。
   */
  onTimeEdit?: (next: { checkIn?: string; checkOut?: string }) => void;
  /**
   * T3-B: 今日の打刻 (AttendanceMonthlyRecord) を丸ごと取り消す。
   * 親側で deleteAttendance(todayISO()) + bumpStore を行う。
   * §13.2: Sheets 既送信のぶんはここでは取り消せない (UI 側で注記)。
   */
  onDelete?: () => void;
}

const TITLE_BY_STATE = {
  before: {
    office: '到着したら打刻してね',
    home: '在宅でつないでいきましょう',
    off: 'きょうは休みの日',
  },
  checkedIn: {
    office: 'ようこそ。おつかれさまです',
    home: '在宅をはじめました',
    off: 'きょうは休みの日',
  },
  checkedOut: {
    office: 'おつかれさまでした',
    home: 'おつかれさまでした',
    off: 'おつかれさまでした',
  },
} as const;

function bandHours(band: TodayCard['band']) {
  if (band === 'full') return '9:00 〜 15:00';
  if (band === 'am') return '9:00 〜 12:00';
  return '13:00 〜 16:00';
}

export function CheckInScreen({
  today = {
    mode: 'office',
    band: 'full',
    dayLabel: '土',
  },
  state = 'before',
  nickname = 'はる',
  onBack,
  onCheckIn,
  onCheckOut,
  onTab,
  onTimeEdit,
  onDelete,
}: CheckInScreenProps) {
  const [s, setS] = useState<AttendanceState>(state);
  useEffect(() => setS(state), [state]);

  // T6: お休みの日の例外打刻。ローカル state のみ (localStorage には保存しない)。
  // 「お休みのままにする/やっぱり通所する」の2択で切り替え、画面離脱や翌日には初期状態へ戻る。
  const [effectiveMode, setEffectiveMode] = useState<AttendanceMode | null>(null);
  // today が外側で変わった (日付跨ぎ等) ら例外打刻状態はリセット
  useEffect(() => {
    setEffectiveMode(null);
  }, [today.mode]);

  const planIsOff = today.mode === 'off';
  // 例外打刻に進んだ場合は office 表示として扱う。
  // BUG-1 修正: 例外打刻後 (checkedIn / checkedOut) に再訪したときは
  // effectiveMode が null にリセットされても、state を根拠に実モード (office) を
  // 表示する。これがないと「お休み」ラベルのまま帰宅打刻ボタンが出ない。
  const viewMode: AttendanceMode =
    s !== 'before' && planIsOff
      ? 'office'
      : (effectiveMode ?? today.mode);
  const isOffice = viewMode === 'office';
  const isHome = viewMode === 'home';
  // 「初期の休み2択画面」を出す条件: 予定が休み かつ まだ「やっぱり通所する」を選んでいない
  // かつ 未打刻 (s === 'before')。打刻済みのときは通常フローに合流させる (BUG-1)。
  const isOff = planIsOff && effectiveMode == null && s === 'before';
  const c = MODE_COLOR[viewMode];

  const inTime = today.checkInTime ?? '— : —';
  const outTime = today.checkOutTime ?? '— : —';

  const heroEmoji = isOff
    ? '🌿'
    : s === 'before'
    ? isOffice
      ? '🚪'
      : isHome
      ? '🏠'
      : '🌿'
    : s === 'checkedIn'
    ? isOffice
      ? '✓'
      : '🏠'
    : '🌙';

  const handleCheckIn = () => {
    setS('checkedIn');
    onCheckIn?.();
  };
  const handleCheckOut = () => {
    setS('checkedOut');
    onCheckOut?.();
  };

  // ── T1-C: 時刻を手で直す (インライン編集) ────────────────────
  // - HH:mm の input 2 つを編集モード中だけ表示
  // - 未来時刻 / checkOut < checkIn はエラーで保存を弾く
  // - 帰宅前 (s === 'checkedIn') は checkOut 入力を表示しない
  const [editing, setEditing] = useState(false);
  const [draftIn, setDraftIn] = useState('');
  const [draftOut, setDraftOut] = useState('');
  const beginEdit = () => {
    setDraftIn(today.checkInTime ?? '');
    setDraftOut(today.checkOutTime ?? '');
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraftIn('');
    setDraftOut('');
  };
  const timeToMin = (hhmm: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return h * 60 + min;
  };
  // バリデーション: 編集モードのみで参照される。空文字は「未入力」とみなして
  // 個別チェックを通す (帰宅は任意)。エラーがあるときは保存ボタンを無効化する。
  let editError: string | null = null;
  if (editing) {
    const nowMin = (() => {
      const d = new Date();
      return d.getHours() * 60 + d.getMinutes();
    })();
    const inMin = draftIn === '' ? null : timeToMin(draftIn);
    const outMin = draftOut === '' ? null : timeToMin(draftOut);
    if (draftIn !== '' && inMin === null) {
      editError = '到着の時刻が読めません';
    } else if (draftOut !== '' && outMin === null) {
      editError = '帰宅の時刻が読めません';
    } else if (inMin != null && inMin > nowMin) {
      editError = '未来の時刻は記録できません';
    } else if (outMin != null && outMin > nowMin) {
      editError = '未来の時刻は記録できません';
    } else if (inMin != null && outMin != null && outMin < inMin) {
      editError = '帰宅は到着より後にしてください';
    }
  }
  const saveEdit = () => {
    if (editError) return;
    onTimeEdit?.({
      checkIn: draftIn === '' ? undefined : draftIn,
      checkOut: draftOut === '' ? undefined : draftOut,
    });
    setEditing(false);
  };

  // ── T3-B: 今日の打刻を取り消す (インライン確認) ─────────────
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const doDelete = () => {
    onDelete?.();
    setConfirmingDelete(false);
  };

  return (
    <PhoneShell bg={PALETTE.cream} label="08 打刻">
      <BackgroundLeaves />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '4px 22px 16px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <button
            onClick={onBack}
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
          <div style={{ fontSize: 13, color: PALETTE.inkSoft }}>
            5月2日(土) · 打刻
          </div>
          <div style={{ width: 44 }} />
        </div>

        <div
          style={{
            marginTop: 14,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: PALETTE.inkSoft,
            }}
          >
            ATTENDANCE
          </div>
          <div style={{ flex: 1, height: 1, background: PALETTE.sage }} />
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            boxShadow: CARD_SHADOW,
            overflow: 'hidden',
            border: `1.5px solid ${c.soft}`,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              background: c.soft,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: isOff ? '#fff' : c.bg,
                color: isOff ? PALETTE.inkSoft : c.fg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {today.dayLabel ?? '今'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {MODE_LABEL[viewMode]}・{BAND_LABEL[today.band]}
              </div>
              <div
                style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}
              >
                {bandHours(today.band)}
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 18px 18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: `1px dashed ${PALETTE.sageSoft}`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background:
                    s !== 'before' ? PALETTE.sageDeep : PALETTE.sageSoft,
                  color: s !== 'before' ? '#fff' : PALETTE.sageDeep,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {s !== 'before' ? '✓' : '入'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: PALETTE.inkSoft }}>到着</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {s !== 'before' ? inTime : '— : —'}
                </div>
              </div>
              {s !== 'before' && (
                <div
                  style={{
                    fontSize: 10,
                    color: PALETTE.sageDeep,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                  }}
                >
                  済
                </div>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background:
                    s === 'checkedOut' ? PALETTE.sageDeep : PALETTE.sageSoft,
                  color: s === 'checkedOut' ? '#fff' : PALETTE.sageDeep,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {s === 'checkedOut' ? '✓' : '帰'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: PALETTE.inkSoft }}>帰宅</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {s === 'checkedOut' ? outTime : '— : —'}
                </div>
              </div>
              {s === 'checkedOut' && (
                <div
                  style={{
                    fontSize: 10,
                    color: PALETTE.sageDeep,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                  }}
                >
                  済
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: '50%',
              background: `radial-gradient(circle at 50% 38%, #fff, ${PALETTE.sageSoft})`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 42,
              marginBottom: 12,
              boxShadow: CARD_SHADOW,
            }}
          >
            {heroEmoji}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>
            {isOff
              ? 'きょうはお休みの日ですね'
              : planIsOff && effectiveMode != null && s === 'before'
              ? '今日だけ打刻しますか？'
              : TITLE_BY_STATE[s][viewMode]}
          </div>
          {/* T3: checkedOut のとき、打刻時刻レンジを見切れずに添える。 */}
          {s === 'checkedOut' && today.checkInTime && today.checkOutTime && (
            <div
              style={{
                fontSize: 12,
                color: PALETTE.inkSoft,
                marginTop: 6,
                lineHeight: 1.6,
                padding: '0 4px',
                wordBreak: 'keep-all',
              }}
            >
              ({today.checkInTime} 〜 {today.checkOutTime})
            </div>
          )}
          <div
            style={{
              fontSize: 11,
              color: PALETTE.inkSoft,
              marginTop: 6,
              lineHeight: 1.6,
            }}
          >
            {isOff
              ? 'もし通所する場合は、打刻に進めます'
              : planIsOff && effectiveMode != null && s === 'before'
              ? '予定はお休みのままです'
              : `${nickname}さんのペースで大丈夫です。`}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {!isOff && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {s === 'before' && (
              <button
                onClick={handleCheckIn}
                style={{
                  width: '100%',
                  height: 60,
                  border: 'none',
                  borderRadius: 20,
                  background: PALETTE.sageDeep,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: ROUNDED_FONT,
                  boxShadow: '0 8px 20px rgba(127,169,130,0.32)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>{isOffice ? '🚪' : '🏠'}</span>
                <span>{isOffice ? '通所打刻' : '開始打刻'}（いま）</span>
              </button>
            )}
            {s === 'checkedIn' && (
              <button
                onClick={handleCheckOut}
                style={{
                  width: '100%',
                  height: 60,
                  border: 'none',
                  borderRadius: 20,
                  background: PALETTE.sageDeep,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: ROUNDED_FONT,
                  boxShadow: '0 8px 20px rgba(127,169,130,0.32)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>👋</span>
                <span>帰宅打刻（いま）</span>
              </button>
            )}
            {s === 'checkedOut' && (
              <button
                onClick={onBack}
                style={{
                  width: '100%',
                  height: 60,
                  border: 'none',
                  borderRadius: 20,
                  background: PALETTE.sageDeep,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: ROUNDED_FONT,
                  boxShadow: '0 8px 20px rgba(127,169,130,0.32)',
                  cursor: 'pointer',
                }}
              >
                ホームへもどる　→
              </button>
            )}

            {/* T1-C: 時刻を手で直す (インライン編集パネル) */}
            {!editing ? (
              <button
                onClick={beginEdit}
                style={{
                  width: '100%',
                  height: 44,
                  border: `1px solid ${PALETTE.sage}`,
                  borderRadius: 14,
                  background: 'transparent',
                  color: PALETTE.inkSoft,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: ROUNDED_FONT,
                  cursor: 'pointer',
                }}
              >
                時刻を手で直す
              </button>
            ) : (
              <div
                style={{
                  background: PALETTE.creamSoft,
                  borderRadius: 14,
                  border: `1.5px solid ${PALETTE.sage}`,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: PALETTE.ink,
                    marginBottom: 8,
                  }}
                >
                  時刻を手で直す
                </div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 12,
                    color: PALETTE.ink,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ width: 40, color: PALETTE.inkSoft }}>到着</span>
                  <input
                    aria-label="到着時刻"
                    type="time"
                    value={draftIn}
                    onChange={(e) => setDraftIn(e.target.value)}
                    style={{
                      flex: 1,
                      fontFamily: ROUNDED_FONT,
                      fontSize: 14,
                      padding: '6px 8px',
                      border: `1px solid ${PALETTE.sage}`,
                      borderRadius: 8,
                      background: '#fff',
                      color: PALETTE.ink,
                    }}
                  />
                </label>
                {s !== 'checkedIn' && (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 12,
                      color: PALETTE.ink,
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ width: 40, color: PALETTE.inkSoft }}>
                      帰宅
                    </span>
                    <input
                      aria-label="帰宅時刻"
                      type="time"
                      value={draftOut}
                      onChange={(e) => setDraftOut(e.target.value)}
                      style={{
                        flex: 1,
                        fontFamily: ROUNDED_FONT,
                        fontSize: 14,
                        padding: '6px 8px',
                        border: `1px solid ${PALETTE.sage}`,
                        borderRadius: 8,
                        background: '#fff',
                        color: PALETTE.ink,
                      }}
                    />
                  </label>
                )}
                {editError && (
                  <div
                    role="alert"
                    style={{
                      fontSize: 11,
                      color: '#A86A4A',
                      marginBottom: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    {editError}
                  </div>
                )}
                {/* T1-C: Sheets 既送信注記 (一律表示)。
                    handleTimeEdit は localStorage のみ更新し Sheets に再送しないため、
                    アプリ側で時刻を直してもシート上は最初の打刻時刻が残ることを明示する。 */}
                <div
                  style={{
                    fontSize: 10,
                    color: PALETTE.inkSoft,
                    lineHeight: 1.6,
                    marginBottom: 10,
                  }}
                >
                  ※ Google Sheets には最初の打刻時刻が残ります。
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={cancelEdit}
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
                    onClick={saveEdit}
                    disabled={editError != null}
                    style={{
                      flex: 1.4,
                      border: 'none',
                      background: editError
                        ? PALETTE.sageSoft
                        : PALETTE.sageDeep,
                      color: editError ? PALETTE.inkSoft : '#fff',
                      borderRadius: 10,
                      padding: '9px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: ROUNDED_FONT,
                      cursor: editError ? 'not-allowed' : 'pointer',
                    }}
                  >
                    保存
                  </button>
                </div>
              </div>
            )}

            {/* T3-B: 「この打刻を取り消す」ボタン + インライン確認ダイアログ。
                状態が checkedIn / checkedOut のときだけ表示する。
                §13.2: deleteAttendance(todayISO()) は親側で呼ぶ。 */}
            {(s === 'checkedIn' || s === 'checkedOut') && !editing && (
              !confirmingDelete ? (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  style={{
                    width: '100%',
                    height: 44,
                    border: `1px solid ${PALETTE.sage}`,
                    borderRadius: 14,
                    background: 'transparent',
                    color: PALETTE.inkSoft,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: ROUNDED_FONT,
                    cursor: 'pointer',
                  }}
                >
                  この打刻を取り消す
                </button>
              ) : (
                <div
                  style={{
                    background: PALETTE.creamSoft,
                    borderRadius: 14,
                    border: `1.5px solid ${PALETTE.sage}`,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: PALETTE.ink,
                      lineHeight: 1.6,
                      marginBottom: 8,
                    }}
                  >
                    今日の打刻を取り消しますか？この操作はもとに戻せません。
                  </div>
                  {/* T3-C: Sheets 既送信注記 (一律表示) */}
                  <div
                    style={{
                      fontSize: 10,
                      color: PALETTE.inkSoft,
                      lineHeight: 1.6,
                      marginBottom: 10,
                    }}
                  >
                    ※ すでに Google Sheets に送信された記録は、ここで取り消してもシート側には残ります。
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setConfirmingDelete(false)}
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
                      取り消す
                    </button>
                  </div>
                </div>
              )
            )}

            {/* T6: 予定が休み × 例外打刻に進んだ後の「お休みに戻す」リンク。
                打刻データは触らない (この場で AttendanceMonthlyRecord は消さない)。 */}
            {planIsOff && effectiveMode != null && s === 'before' && (
              <button
                onClick={() => setEffectiveMode(null)}
                style={{
                  width: '100%',
                  height: 36,
                  border: 'none',
                  background: 'transparent',
                  color: PALETTE.inkSoft,
                  fontSize: 12,
                  fontFamily: ROUNDED_FONT,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationColor: PALETTE.sage,
                  textUnderlineOffset: 3,
                }}
              >
                お休みに戻す
              </button>
            )}
          </div>
        )}

        {isOff && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* T6 メイン: お休みのままにする (ホームへ戻る) */}
            <button
              onClick={onBack}
              style={{
                width: '100%',
                height: 56,
                border: 'none',
                borderRadius: 18,
                background: PALETTE.sageDeep,
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                boxShadow: '0 6px 16px rgba(127,169,130,0.32)',
                cursor: 'pointer',
              }}
            >
              お休みのままにする
            </button>
            {/* T4-A: サブ「やっぱり通所する」 (枠線セカンダリ。effectiveMode=office に切替)
                旧文言「打刻に進む」は通所への決断を促す印象が強かったため、休みに戻す
                余地を残す文言に置換 (PM§T4 B案)。 */}
            <button
              onClick={() => setEffectiveMode('office')}
              style={{
                width: '100%',
                height: 48,
                border: `1.5px solid ${PALETTE.sage}`,
                borderRadius: 16,
                background: '#fff',
                color: PALETTE.sageDeep,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: ROUNDED_FONT,
                cursor: 'pointer',
              }}
            >
              やっぱり通所する
            </button>
          </div>
        )}

        {/* T2-A/T2-B: 旧フッター文言は「欠席でも問題ない」と受け取られかねず、
            事業所への出欠連絡の責務を曖昧にしていたためコードごと削除。
            代わりに「打刻 ≠ 連絡」を明示する C 案文言を表示する。 */}
        <div
          style={{
            marginTop: 12,
            fontSize: 10,
            color: PALETTE.inkSoft,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          この打刻は記録のためのものです。
          <br />
          事業所への出欠の連絡は、これまでどおりお願いします。
        </div>
      </div>
      <BottomTabs active="home" onChange={onTab} />
    </PhoneShell>
  );
}
