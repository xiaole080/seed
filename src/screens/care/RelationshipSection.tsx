import { PALETTE, CARD_SHADOW } from '../../theme';
import type { RelationshipProgress } from '../../data/careView';

// ① 鳥との関係 (マイルストーン進捗)。進捗値は computeRelationshipProgress で算出済み。
interface RelationshipProps {
  eggName: string;
  totalDays: number;
  progress: RelationshipProgress;
}

export function RelationshipSection({
  eggName,
  totalDays,
  progress,
}: RelationshipProps) {
  const { milestone, nextLabel, segStart, segEnd, segPct, remaining, isMax } =
    progress;
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
        {eggName ? `${eggName}との関係` : '鳥との関係'}
      </div>
      <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginBottom: 10 }}>
        累計 {totalDays} 日の記録から
      </div>
      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          padding: '16px 18px 18px',
          boxShadow: CARD_SHADOW,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🤝</span>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: PALETTE.sageDeep,
              letterSpacing: '0.02em',
              lineHeight: 1.2,
            }}
          >
            {milestone.label}
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: PALETTE.inkSoft,
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            <span>{segStart}日</span>
            <span>{isMax ? '∞' : `${segEnd}日`}</span>
          </div>
          <div
            style={{
              height: 8,
              background: PALETTE.sageSoft,
              borderRadius: 999,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${segPct}%`,
                background: `linear-gradient(90deg, ${PALETTE.sage}, ${PALETTE.sageDeep})`,
                borderRadius: 999,
                transition: 'width .4s',
              }}
            />
          </div>
        </div>

        <div style={{ fontSize: 12, color: PALETTE.ink, lineHeight: 1.6 }}>
          {isMax ? (
            <span>もう、ことばでは言えない関係になりました。</span>
          ) : (
            <span>
              あと <b style={{ color: PALETTE.sageDeep }}>{remaining}日</b> で『
              {nextLabel}』
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
