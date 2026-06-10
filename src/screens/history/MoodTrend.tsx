import { PALETTE } from '../../theme';
import type { StoredDailyRecord } from '../../data/store';
import { moodSeries, averageMood } from '../../data/historyStats';
import { SECTION_TITLE, EMPTY_COPY } from '../../data/historyCopy';
import { EmptyNote } from './parts';

// 気分の可視化 (T3)。折れ線グラフ + 平均。
export function MoodTrend({
  records,
  rangeLabel,
}: {
  records: StoredDailyRecord[];
  rangeLabel: string;
}) {
  const series = moodSeries(records);
  const avg = averageMood(records);

  const Header = (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700 }}>{SECTION_TITLE.mood}</div>
      <div style={{ fontSize: 10, color: PALETTE.inkSoft }}>{rangeLabel}</div>
    </div>
  );

  if (series.length === 0) {
    return (
      <div>
        {Header}
        <EmptyNote text={EMPTY_COPY.mood} />
      </div>
    );
  }

  const W = 300;
  const H = 140;
  const P = 16;
  // 1件のときも除算で落ちないよう、分母を最低 1 にする。
  const denom = Math.max(series.length - 1, 1);
  const points = series.map((p, i) => {
    const x = series.length === 1 ? W / 2 : P + (i / denom) * (W - 2 * P);
    const y = H - P - ((p.mood - 1) / 4) * (H - 2 * P);
    return [x, y] as const;
  });
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`)
    .join(' ');

  return (
    <div>
      {Header}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {[1, 2, 3, 4, 5].map((v) => {
          const y = H - P - ((v - 1) / 4) * (H - 2 * P);
          return (
            <line
              key={v}
              x1={P}
              x2={W - P}
              y1={y}
              y2={y}
              stroke={PALETTE.sageSoft}
              strokeWidth="1"
              strokeDasharray={v === 3 ? '0' : '2 4'}
            />
          );
        })}
        {points.length >= 2 && (
          <path
            d={path}
            fill="none"
            stroke={PALETTE.sageDeep}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={i === points.length - 1 ? 5 : 3.5}
            fill="#fff"
            stroke={PALETTE.sageDeep}
            strokeWidth={i === points.length - 1 ? 2.5 : 1.5}
          />
        ))}
        <text x="4" y={P + 3} fontSize="9" fill={PALETTE.inkSoft}>
          げんき
        </text>
        <text x="4" y={H - P + 3} fontSize="9" fill={PALETTE.inkSoft}>
          つらい
        </text>
      </svg>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          marginTop: 8,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>記録した日: {series.length}日</span>
        {avg != null && (
          <span>
            記録した日の平均:{' '}
            <span style={{ color: PALETTE.sageDeep, fontWeight: 700 }}>
              {avg}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
