import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { ChickSVG, EggSpeciesSVG, HatchingSVG } from '../components/BirdSpecies';
import { dailyWhisperFor } from '../data/stages';
import { MOODS } from '../data/moods';
import type { EggSpeciesId, Mood, Stage } from '../data/types';

interface ReactionScreenProps {
  stage?: Stage;
  nickname?: string;
  mood?: Mood;
  species?: EggSpeciesId;
  eggName?: string;
  onHome?: () => void;
}

const SPARKLES = [
  { l: -10, t: 20, s: 18, d: 0 },
  { l: 240, t: 40, s: 14, d: 0.5 },
  { l: 220, t: 200, s: 16, d: 1 },
  { l: -4, t: 200, s: 12, d: 1.5 },
];

export function ReactionScreen({
  stage = 3,
  mood = 4,
  species = 'chicken',
  eggName = '',
  onHome,
}: ReactionScreenProps) {
  const moodObj = MOODS.find((m) => m.v === mood) || MOODS[2];
  const reactionMsg =
    mood >= 4
      ? 'いい一日になりそうですね。\n記録してくれてありがとう。'
      : mood === 3
      ? 'ふつうの日って、じつは大切。\nきょうも来てくれてうれしいです。'
      : 'よくここまで来ました。\nゆっくり休んでくださいね。';
  const story = dailyWhisperFor(stage, true);

  return (
    <PhoneShell bg={PALETTE.creamSoft} label="04 鳥のリアクション">
      <BackgroundLeaves tint={PALETTE.amberSoft} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 28px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
        }}
      >
        <div style={{ position: 'relative', marginTop: 24, marginBottom: 22 }}>
          {SPARKLES.map((sp, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: sp.l,
                top: sp.t,
                fontSize: sp.s,
                animation: 'seed-twinkle 2.4s ease-in-out infinite',
                animationDelay: `${sp.d}s`,
                color: PALETTE.amber,
              }}
            >
              ✦
            </div>
          ))}

          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: '50%',
              background: `radial-gradient(circle at 50% 35%, #fff 0%, ${PALETTE.amberSoft} 60%, ${PALETTE.shellPink} 100%)`,
              boxShadow:
                'inset 0 -16px 40px rgba(232,184,115,0.2), 0 14px 36px rgba(232,184,115,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                animation: 'seed-hop 1.6s ease-in-out infinite',
                filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {stage === 0 || stage === 1 ? (
                <EggSpeciesSVG
                  species={species}
                  cracked={stage === 1}
                  size={150}
                  animate={false}
                />
              ) : stage === 2 ? (
                <HatchingSVG species={species} size={170} animate={false} />
              ) : (
                <ChickSVG species={species} size={170} animate={false} />
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 22,
            padding: '18px 22px',
            maxWidth: 320,
            position: 'relative',
            boxShadow: CARD_SHADOW,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -10,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 18,
              height: 18,
              background: '#fff',
            }}
          />
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.7,
              textAlign: 'center',
              color: PALETTE.ink,
              fontWeight: 500,
              whiteSpace: 'pre-line',
              position: 'relative',
            }}
          >
            {reactionMsg}
          </div>
        </div>

        <div
          style={{
            width: '100%',
            background: PALETTE.creamSoft,
            borderRadius: 18,
            padding: '14px 16px 16px',
            boxShadow: CARD_SHADOW,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 10,
              color: PALETTE.sageDeep,
              fontWeight: 700,
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13 }}>🐦</span>
            <span>{eggName ? `${eggName}のおはなし` : '今日のおはなし'}</span>
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.8,
              color: PALETTE.ink,
              fontWeight: 500,
              whiteSpace: 'pre-line',
            }}
          >
            {story}
          </div>
        </div>

        <div
          style={{
            width: '100%',
            background: '#fff',
            borderRadius: 18,
            padding: '14px 18px',
            boxShadow: CARD_SHADOW,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: PALETTE.inkSoft,
              marginBottom: 8,
              letterSpacing: '0.06em',
            }}
          >
            今日のきろく
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 26 }}>{moodObj.face}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{moodObj.label}</div>
              <div
                style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}
              >
                睡眠・食事のタグ
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: PALETTE.sageDeep,
                fontWeight: 700,
              }}
            >
              +1日
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            color: PALETTE.inkSoft,
            textAlign: 'center',
            lineHeight: 1.7,
            marginBottom: 'auto',
          }}
        >
          使えない日があっても、
          <br />
          このコは元気にあなたを待っています。
        </div>

        <button
          onClick={onHome}
          style={{
            width: '100%',
            height: 54,
            border: 'none',
            borderRadius: 18,
            background: PALETTE.sageDeep,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            boxShadow: '0 6px 16px rgba(127,169,130,0.32)',
            cursor: 'pointer',
            marginTop: 12,
          }}
        >
          ホームへもどる
        </button>
      </div>
    </PhoneShell>
  );
}
