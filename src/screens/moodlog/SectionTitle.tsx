import { PALETTE } from '../../theme';

export function SectionTitle({
  index,
  title,
  hint,
}: {
  index: number;
  title: string;
  hint?: string;
}) {
  return (
    <div style={{ marginTop: 22, marginBottom: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: PALETTE.sageDeep,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {index}
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>
          {title}
        </span>
      </div>
      {hint && (
        <div
          style={{
            fontSize: 11,
            color: PALETTE.inkSoft,
            marginTop: 4,
            marginLeft: 28,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
