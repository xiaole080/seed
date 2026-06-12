import { PALETTE } from '../../theme';
import type { OneOffTask } from '../../data/routines';
import { OneOffRow } from './OneOffRow';

// ③ 今日だけタスク。
interface OneOffSectionProps {
  tasks: OneOffTask[];
  seeds: number;
  onToggle: (t: OneOffTask) => void;
  onDelete: (id: string) => void;
  confirming: string | null;
  onAskDelete: (id: string | null) => void;
  recentReward: { id: string; amount: number } | null;
}

export function OneOffSection({
  tasks,
  seeds,
  onToggle,
  onDelete,
  confirming,
  onAskDelete,
  recentReward,
}: OneOffSectionProps) {
  return (
    <div style={{ marginTop: 22 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>🌱 今日だけタスク</div>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>
            今日のうちに、できたら うれしいこと
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 700,
            color: PALETTE.sageDeep,
            background: PALETTE.sageSoft,
            padding: '4px 10px',
            borderRadius: 999,
          }}
        >
          <span style={{ fontSize: 13 }}>🌱</span>
          <span>{seeds} たね</span>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginTop: 10,
        }}
      >
        {tasks.length === 0 ? (
          <div
            style={{
              fontSize: 11,
              color: PALETTE.inkSoft,
              padding: '8px 4px',
              lineHeight: 1.6,
            }}
          >
            今日はまだタスクがありません
          </div>
        ) : (
          tasks.map((t) => (
            <OneOffRow
              key={t.id}
              task={t}
              onToggle={() => onToggle(t)}
              onDelete={() => onDelete(t.id)}
              confirming={confirming === t.id}
              onAskDelete={() => onAskDelete(t.id)}
              onCancelDelete={() => onAskDelete(null)}
              reward={
                recentReward && recentReward.id === t.id
                  ? recentReward.amount
                  : null
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
