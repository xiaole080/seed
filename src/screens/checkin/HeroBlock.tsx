import { PALETTE, CARD_SHADOW } from '../../theme';
import type { AttendanceMode, AttendanceState, TodayCard } from '../../data/types';

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

interface HeroBlockProps {
  heroEmoji: string;
  isOff: boolean;
  planIsOff: boolean;
  effectiveMode: AttendanceMode | null;
  state: AttendanceState;
  viewMode: AttendanceMode;
  today: TodayCard;
  nickname: string;
}

// ヒーロー (絵文字 + タイトル + サブテキスト)。
export function HeroBlock({
  heroEmoji,
  isOff,
  planIsOff,
  effectiveMode,
  state: s,
  viewMode,
  today,
  nickname,
}: HeroBlockProps) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 16, flexShrink: 0 }}>
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
  );
}
