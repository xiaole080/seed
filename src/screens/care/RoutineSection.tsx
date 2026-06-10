import { PALETTE } from '../../theme';
import type { Schedule } from '../../data/types';
import type { Routine, RoutineLog } from '../../data/routines';
import { RoutineCard } from './RoutineCard';

// ② まいにちのリズム。
interface RoutineSectionProps {
  routines: Routine[];
  logs: RoutineLog;
  schedule: Schedule;
  today: string;
  onDone: (r: Routine) => void;
  onRest: (r: Routine) => void;
  onUpdate: (id: string, patch: Partial<Routine>) => void;
  onDelete: (id: string) => void;
}

export function RoutineSection({
  routines,
  logs,
  schedule,
  today,
  onDone,
  onRest,
  onUpdate,
  onDelete,
}: RoutineSectionProps) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>🌱 まいにちのリズム</div>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          marginTop: 2,
          marginBottom: 10,
        }}
      >
        つづけたいことを、ゆっくり育てる場所
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {routines.length === 0 ? (
          <div
            style={{
              fontSize: 11,
              color: PALETTE.inkSoft,
              padding: '8px 4px',
              lineHeight: 1.6,
            }}
          >
            『+ サッと追加』から、ひとつはじめてみよう
          </div>
        ) : (
          routines.map((r) => (
            <RoutineCard
              key={r.id}
              routine={r}
              state={logs[r.id]?.[today]}
              schedule={schedule}
              today={today}
              logs={logs}
              onDone={() => onDone(r)}
              onRest={() => onRest(r)}
              onUpdate={(patch) => onUpdate(r.id, patch)}
              onDelete={() => onDelete(r.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
