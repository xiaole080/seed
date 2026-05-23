import { PALETTE } from '../theme';

interface BackgroundLeavesProps {
  tint?: string;
}

export function BackgroundLeaves({ tint = PALETTE.sageSoft }: BackgroundLeavesProps) {
  return (
    <svg
      viewBox="0 0 390 780"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: 0.55,
      }}
      aria-hidden="true"
    >
      <circle cx="-30"  cy="120" r="120" fill={tint} />
      <circle cx="420"  cy="240" r="90"  fill={tint} />
      <circle cx="60"   cy="700" r="140" fill={tint} />
      <circle cx="380"  cy="640" r="70"  fill={tint} />
    </svg>
  );
}
