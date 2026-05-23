import { PALETTE } from '../theme';
import { getSpecies } from '../data/species';
import type { EggSpeciesId, Stage } from '../data/types';

interface CommonProps {
  species?: EggSpeciesId;
  size?: number;
  animate?: boolean;
}

export function EggSpeciesSVG({
  species = 'chicken',
  cracked = false,
  size = 120,
  animate = true,
}: CommonProps & { cracked?: boolean }) {
  const s = getSpecies(species);
  const w = (size * 80) / 96;
  const h = size;
  return (
    <svg
      viewBox="0 0 80 96"
      width={w}
      height={h}
      style={{
        display: 'block',
        filter: 'drop-shadow(0 6px 14px rgba(60,80,60,0.16))',
        animation: animate ? 'seed-breath 4s ease-in-out infinite' : 'none',
      }}
      aria-hidden="true"
    >
      <ellipse cx="40" cy="54" rx="32" ry="40" fill={s.shell} />
      <ellipse cx="29" cy="32" rx="8" ry="13" fill="#ffffff" opacity="0.55" />
      <ellipse cx="26" cy="26" rx="2.5" ry="4" fill="#ffffff" opacity="0.85" />

      {s.speckle && (
        <g fill={s.speckle} opacity="0.85">
          <ellipse cx="32" cy="42" rx="2.4" ry="2" />
          <ellipse cx="48" cy="38" rx="1.6" ry="1.4" />
          <ellipse cx="54" cy="56" rx="2.8" ry="2.2" />
          <ellipse cx="28" cy="62" rx="2" ry="1.6" />
          <ellipse cx="44" cy="68" rx="2.6" ry="2" />
          <ellipse cx="38" cy="54" rx="1.4" ry="1.2" />
          <ellipse cx="22" cy="50" rx="1.8" ry="1.5" />
          <ellipse cx="56" cy="72" rx="1.6" ry="1.3" />
          <ellipse cx="50" cy="46" rx="1" ry="0.9" />
          <ellipse cx="36" cy="78" rx="1.4" ry="1.2" />
        </g>
      )}

      {cracked && (
        <g
          stroke={s.shellShadow}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 44 L28 48 L24 54 L30 58 L26 64" />
          <path d="M30 58 L36 56 L34 62" />
          <path d="M28 48 L33 46" />
        </g>
      )}
    </svg>
  );
}

export function HatchingSVG({
  species = 'chicken',
  size = 160,
  animate = true,
}: CommonProps) {
  const s = getSpecies(species);
  const w = (size * 100) / 120;
  const h = size;

  return (
    <svg
      viewBox="0 0 100 120"
      width={w}
      height={h}
      style={{
        display: 'block',
        filter: 'drop-shadow(0 6px 14px rgba(60,80,60,0.16))',
        animation: animate ? 'seed-breath 4s ease-in-out infinite' : 'none',
      }}
      aria-hidden="true"
    >
      <path
        d={`M 22 70
            Q 22 100 50 105
            Q 78 100 78 70
            L 76 72 L 70 64 L 64 70 L 58 62 L 52 70 L 46 62 L 40 70 L 34 62 L 28 70 L 24 64 Z`}
        fill={s.shell}
      />
      <path
        d={`M 22 70 Q 22 100 50 105 Q 78 100 78 70 L 76 72 L 70 64 L 64 70 L 58 62 L 52 70 L 46 62 L 40 70 L 34 62 L 28 70 L 24 64 Z`}
        fill={s.shellShadow}
        opacity="0.18"
      />

      {s.speckle && (
        <g fill={s.speckle} opacity="0.85">
          <ellipse cx="34" cy="82" rx="2" ry="1.6" />
          <ellipse cx="52" cy="88" rx="2.4" ry="2" />
          <ellipse cx="66" cy="80" rx="1.8" ry="1.4" />
          <ellipse cx="44" cy="96" rx="1.6" ry="1.3" />
          <ellipse cx="60" cy="98" rx="2" ry="1.6" />
          <ellipse cx="28" cy="92" rx="1.4" ry="1.2" />
        </g>
      )}

      <ellipse cx="50" cy="58" rx="22" ry="20" fill={s.body} />

      {s.belly && <ellipse cx="50" cy="64" rx="13" ry="11" fill={s.belly} />}
      {s.stripe && (
        <g fill={s.stripe} opacity="0.55">
          <ellipse cx="42" cy="50" rx="3" ry="1.2" />
          <ellipse cx="58" cy="50" rx="3" ry="1.2" />
          <ellipse cx="50" cy="44" rx="4" ry="1.2" />
          <ellipse cx="38" cy="60" rx="2.5" ry="1" />
          <ellipse cx="62" cy="60" rx="2.5" ry="1" />
        </g>
      )}

      <ellipse cx="30" cy="60" rx="6" ry="9" fill={s.bodyDark} transform="rotate(-25 30 60)" />
      <ellipse cx="70" cy="60" rx="6" ry="9" fill={s.bodyDark} transform="rotate(25 70 60)" />

      <circle cx="36" cy="56" r="3.4" fill={s.cheek} opacity="0.7" />
      <circle cx="64" cy="56" r="3.4" fill={s.cheek} opacity="0.7" />

      <ellipse cx="42" cy="50" rx="3.6" ry="4.2" fill="#1F1A14" />
      <ellipse cx="58" cy="50" rx="3.6" ry="4.2" fill="#1F1A14" />
      <circle cx="43.4" cy="48.6" r="1.2" fill="#fff" />
      <circle cx="59.4" cy="48.6" r="1.2" fill="#fff" />

      <path d="M 47 56 L 53 56 L 50 60.5 Z" fill={s.beak} />
      <path d="M 47 56 L 53 56 L 50 58 Z" fill="#000" opacity="0.12" />

      <path
        d={`M 30 38 L 36 32 L 40 38 L 44 30 L 50 36 L 56 30 L 60 38 L 66 32 L 72 38
            L 70 36 L 64 30 L 58 36 L 52 30 L 48 36 L 42 30 L 38 36 L 34 30 Z`}
        fill={s.shell}
        transform="translate(0 -2)"
      />
      <path
        d={`M 30 38 L 36 32 L 40 38 L 44 30 L 50 36 L 56 30 L 60 38 L 66 32 L 72 38`}
        fill="none"
        stroke={s.shellShadow}
        strokeWidth="1"
        opacity="0.5"
        transform="translate(0 -2)"
      />

      {s.speckle && (
        <g fill={s.speckle} opacity="0.85">
          <ellipse cx="42" cy="33" rx="1.4" ry="1.2" />
          <ellipse cx="58" cy="33" rx="1.6" ry="1.3" />
          <ellipse cx="68" cy="35" rx="1.2" ry="1" />
          <ellipse cx="34" cy="35" rx="1.2" ry="1" />
        </g>
      )}
    </svg>
  );
}

export function ChickSVG({
  species = 'chicken',
  size = 160,
  animate = true,
}: CommonProps) {
  const s = getSpecies(species);
  const w = (size * 110) / 120;
  const h = size;

  return (
    <svg
      viewBox="0 0 110 120"
      width={w}
      height={h}
      style={{
        display: 'block',
        filter: 'drop-shadow(0 6px 14px rgba(60,80,60,0.16))',
        animation: animate ? 'seed-breath 3.6s ease-in-out infinite' : 'none',
      }}
      aria-hidden="true"
    >
      <g fill={s.foot} stroke={s.foot} strokeWidth="1.2" strokeLinecap="round">
        <line x1="44" y1="108" x2="44" y2="114" />
        <line x1="44" y1="114" x2="40" y2="116" />
        <line x1="44" y1="114" x2="44" y2="117" />
        <line x1="44" y1="114" x2="48" y2="116" />
        <line x1="66" y1="108" x2="66" y2="114" />
        <line x1="66" y1="114" x2="62" y2="116" />
        <line x1="66" y1="114" x2="66" y2="117" />
        <line x1="66" y1="114" x2="70" y2="116" />
      </g>

      <ellipse cx="55" cy="78" rx="32" ry="28" fill={s.body} />
      {s.belly && <ellipse cx="55" cy="84" rx="20" ry="16" fill={s.belly} />}

      {s.stripe && (
        <g fill={s.stripe} opacity="0.5">
          <ellipse cx="40" cy="68" rx="4" ry="1.4" />
          <ellipse cx="55" cy="64" rx="6" ry="1.4" />
          <ellipse cx="70" cy="68" rx="4" ry="1.4" />
          <ellipse cx="38" cy="80" rx="3.5" ry="1.2" />
          <ellipse cx="72" cy="80" rx="3.5" ry="1.2" />
          <ellipse cx="42" cy="92" rx="3" ry="1.1" />
          <ellipse cx="68" cy="92" rx="3" ry="1.1" />
        </g>
      )}

      <ellipse cx="28" cy="80" rx="8" ry="14" fill={s.bodyDark} transform="rotate(-12 28 80)" />
      <ellipse cx="82" cy="80" rx="8" ry="14" fill={s.bodyDark} transform="rotate(12 82 80)" />

      <circle cx="55" cy="46" r="26" fill={s.body} />

      {species === 'quail' && (
        <ellipse cx="55" cy="22" rx="2" ry="5" fill={s.bodyDark} transform="rotate(-10 55 22)" />
      )}

      <circle cx="38" cy="52" r="4.5" fill={s.cheek} opacity="0.7" />
      <circle cx="72" cy="52" r="4.5" fill={s.cheek} opacity="0.7" />

      <ellipse cx="46" cy="44" rx="4.4" ry="5.4" fill="#1F1A14" />
      <ellipse cx="64" cy="44" rx="4.4" ry="5.4" fill="#1F1A14" />
      <circle cx="47.6" cy="42" r="1.5" fill="#fff" />
      <circle cx="65.6" cy="42" r="1.5" fill="#fff" />
      <circle cx="44.8" cy="46" r="0.7" fill="#fff" opacity="0.7" />
      <circle cx="62.8" cy="46" r="0.7" fill="#fff" opacity="0.7" />

      <path d="M 51 52 L 59 52 L 55 58 Z" fill={s.beak} />
      <path d="M 51 52 L 59 52 L 55 54.5 Z" fill="#000" opacity="0.15" />

      <path
        d="M 48 22 Q 50 18 52 22 Q 54 16 56 22 Q 58 18 60 22"
        stroke={s.bodyDark}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface BirdSpeciesStageProps {
  species?: EggSpeciesId;
  stage: Stage;
  size?: number;
}

export function BirdSpeciesStage({
  species = 'chicken',
  stage = 0,
  size = 240,
}: BirdSpeciesStageProps) {
  const inner = size * 0.62;
  let figure;
  if (stage === 0) {
    figure = <EggSpeciesSVG species={species} cracked={false} size={inner * 0.85} />;
  } else if (stage === 1) {
    figure = <EggSpeciesSVG species={species} cracked={true} size={inner * 0.85} />;
  } else if (stage === 2) {
    figure = <HatchingSVG species={species} size={inner} />;
  } else {
    figure = <ChickSVG species={species} size={inner} />;
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 50% 38%, #fff 0%, ${PALETTE.sageSoft} 70%, ${PALETTE.sage} 100%)`,
        boxShadow:
          'inset 0 -16px 40px rgba(127,169,130,0.18), 0 14px 36px rgba(127,169,130,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 24,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.7), transparent 60%)',
        }}
      />
      <div style={{ position: 'relative' }}>{figure}</div>
    </div>
  );
}
