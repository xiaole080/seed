import { PALETTE } from '../../theme';
import type { PrimaryInfluence } from '../../data/types';
import type { StoredDailyRecord } from '../../data/store';
import { influenceRanking } from '../../data/historyStats';
import { SECTION_TITLE, EMPTY_COPY } from '../../data/historyCopy';
import { INFLUENCE_BY_ID } from '../../data/historyView';
import { SectionHeading, EmptyNote } from './parts';

// 影響要因ランキング (T4)。上位 5 件。
export function InfluenceRanking({ records }: { records: StoredDailyRecord[] }) {
  const ranking = influenceRanking(records).slice(0, 5);

  return (
    <div>
      <SectionHeading title={SECTION_TITLE.influence} />
      {ranking.length === 0 ? (
        <EmptyNote text={EMPTY_COPY.influence} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {ranking.map((it) => {
            const opt = INFLUENCE_BY_ID[it.id as PrimaryInfluence];
            return (
              <div
                key={it.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: PALETTE.sageSoft,
                  borderRadius: 10,
                  padding: '8px 10px',
                }}
              >
                <span style={{ fontSize: 15 }}>{opt?.icon ?? '✨'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>
                  {opt?.label ?? it.id}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: PALETTE.sageDeep,
                    fontWeight: 700,
                  }}
                >
                  {it.count}回
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
