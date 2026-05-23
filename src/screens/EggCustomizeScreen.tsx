import { useEffect, useState, type ReactNode } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import { EggSpeciesSVG } from '../components/BirdSpecies';
import { EGG_SPECIES_OPTIONS, EGG_TRAITS } from '../data/species';
import type { EggSpeciesId, EggTraitId } from '../data/types';

export interface EggCustomizePayload {
  eggSpecies: EggSpeciesId;
  eggTrait: EggTraitId;
  eggName: string;
}

interface EggCustomizeScreenProps {
  initialSpecies?: EggSpeciesId;
  initialTrait?: EggTraitId | null;
  initialName?: string;
  label?: string;
  onSave?: (payload: EggCustomizePayload) => void;
  onSkip?: () => void;
}

export function EggCustomizeScreen({
  initialSpecies = 'chicken',
  initialTrait = null,
  initialName = '',
  label = '01a′ 卵カスタマイズ',
  onSave,
  onSkip,
}: EggCustomizeScreenProps) {
  const [speciesId, setSpeciesId] = useState<EggSpeciesId>(initialSpecies);
  const [traitId, setTraitId] = useState<EggTraitId | null>(initialTrait);
  const [name, setName] = useState(initialName);

  const trait = EGG_TRAITS.find((t) => t.id === traitId);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('seed.egg');
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<EggCustomizePayload>;
      if (saved.eggSpecies && initialSpecies === 'chicken')
        setSpeciesId(saved.eggSpecies);
      if (saved.eggTrait && initialTrait == null) setTraitId(saved.eggTrait);
      if (saved.eggName && !initialName) setName(saved.eggName);
    } catch {
      // ignore — localStorage is best-effort
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = !!speciesId && !!traitId && name.trim().length > 0;

  const submit = () => {
    if (!canSubmit || !traitId) return;
    const payload: EggCustomizePayload = {
      eggSpecies: speciesId,
      eggTrait: traitId,
      eggName: name.trim(),
    };
    try {
      localStorage.setItem('seed.egg', JSON.stringify(payload));
    } catch {
      // ignore
    }
    onSave?.(payload);
  };

  return (
    <PhoneShell bg={PALETTE.cream} label={label}>
      <BackgroundLeaves />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '4px 24px 22px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <div style={{ marginTop: 14, marginBottom: 4 }}>
          <div
            style={{ fontSize: 12, color: PALETTE.inkSoft, marginBottom: 4 }}
          >
            ステップ 2 / 4
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4 }}>
            あなたの卵を
            <br />
            えらぼう
          </div>
          <div
            style={{
              fontSize: 12,
              color: PALETTE.inkSoft,
              marginTop: 8,
              lineHeight: 1.7,
            }}
          >
            いっしょに育っていく仲間です。
            <br />
            たまごの種類と性格をえらんでください。
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            marginBottom: 4,
            background: `radial-gradient(circle at 50% 38%, #fff 0%, ${PALETTE.sageSoft} 75%)`,
            borderRadius: 22,
            padding: '18px 18px 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: CARD_SHADOW,
          }}
        >
          <EggSpeciesSVG species={speciesId} cracked={false} size={130} />
          <div
            style={{
              fontSize: 11,
              color: PALETTE.inkSoft,
              marginTop: 10,
              letterSpacing: '0.06em',
            }}
          >
            {name.trim() ? (
              <span style={{ color: PALETTE.sageDeep, fontWeight: 700 }}>
                「{name.trim()}」
              </span>
            ) : (
              'プレビュー'
            )}
            {trait && (
              <span>
                {' '}
                ・ {trait.icon} {trait.label}
              </span>
            )}
          </div>
        </div>

        <SectionLabel>たまごの種類</SectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {EGG_SPECIES_OPTIONS.map((opt) => {
            const sel = opt.id === speciesId;
            return (
              <button
                key={opt.id}
                onClick={() => setSpeciesId(opt.id)}
                aria-pressed={sel}
                style={{
                  border: sel
                    ? `2px solid ${PALETTE.sageDeep}`
                    : '2px solid transparent',
                  background: sel ? '#FBF7EE' : '#fff',
                  borderRadius: 16,
                  padding: '12px 6px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  fontFamily: ROUNDED_FONT,
                  boxShadow: sel
                    ? '0 4px 12px rgba(127,169,130,0.18)'
                    : '0 2px 6px rgba(60,80,60,0.06)',
                  transition: 'all .15s',
                }}
              >
                <EggSpeciesSVG species={opt.id} size={64} animate={false} />
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    marginTop: 4,
                    color: sel ? PALETTE.sageDeep : PALETTE.ink,
                  }}
                >
                  {opt.label}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: PALETTE.inkSoft,
                    lineHeight: 1.3,
                    textAlign: 'center',
                  }}
                >
                  {opt.sub}
                </div>
              </button>
            );
          })}
        </div>

        <SectionLabel>性格をえらぶ</SectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}
        >
          {EGG_TRAITS.map((t) => {
            const sel = t.id === traitId;
            return (
              <button
                key={t.id}
                onClick={() => setTraitId(t.id)}
                aria-pressed={sel}
                style={{
                  border: sel
                    ? `2px solid ${PALETTE.sageDeep}`
                    : '2px solid transparent',
                  background: sel ? '#FBF7EE' : '#fff',
                  borderRadius: 16,
                  padding: '12px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 2,
                  cursor: 'pointer',
                  fontFamily: ROUNDED_FONT,
                  textAlign: 'left',
                  boxShadow: sel
                    ? '0 4px 12px rgba(127,169,130,0.18)'
                    : '0 2px 6px rgba(60,80,60,0.06)',
                  transition: 'all .15s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 700,
                    color: sel ? PALETTE.sageDeep : PALETTE.ink,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <span>{t.label}</span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: PALETTE.inkSoft,
                    marginTop: 2,
                    lineHeight: 1.5,
                  }}
                >
                  {t.sub}
                </div>
              </button>
            );
          })}
        </div>

        <SectionLabel>名前をつける</SectionLabel>
        <div
          style={{
            width: '100%',
            height: 52,
            background: '#fff',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            boxShadow: CARD_SHADOW,
            border: name.trim()
              ? `1.5px solid ${PALETTE.sage}`
              : '1.5px solid transparent',
            transition: 'border-color .15s',
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: ぴーちゃん"
            maxLength={12}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              fontFamily: ROUNDED_FONT,
              color: PALETTE.ink,
              background: 'transparent',
            }}
          />
          {name.length > 0 && (
            <span
              style={{
                fontSize: 10,
                color: PALETTE.inkSoft,
                marginLeft: 8,
                flexShrink: 0,
              }}
            >
              {name.length}/12
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: PALETTE.inkSoft,
            marginTop: 6,
            paddingLeft: 4,
            lineHeight: 1.5,
          }}
        >
          あとから変えられます。
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            marginTop: 20,
            width: '100%',
            height: 56,
            border: 'none',
            borderRadius: 18,
            background: canSubmit ? PALETTE.sageDeep : PALETTE.sage,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            boxShadow: canSubmit
              ? '0 8px 18px rgba(127,169,130,0.32)'
              : '0 2px 6px rgba(127,169,130,0.12)',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : 0.7,
            letterSpacing: '0.06em',
            transition: 'all .18s',
            flexShrink: 0,
          }}
        >
          つぎへ
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            style={{
              marginTop: 12,
              border: 'none',
              background: 'transparent',
              color: PALETTE.inkSoft,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: ROUNDED_FONT,
              cursor: 'pointer',
              padding: '8px 12px',
              alignSelf: 'center',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            あとで設定する
          </button>
        )}
      </div>
    </PhoneShell>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: PALETTE.ink,
        marginTop: 22,
        marginBottom: 10,
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </div>
  );
}
