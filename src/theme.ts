// Seed design palette and shared visual tokens.
// Mirrors the SEED_PALETTE used in the Claude Design prototype.
export const PALETTE = {
  cream:     '#F7F2E7',
  creamSoft: '#FBF7EE',
  sage:      '#C7DCC2',
  sageSoft:  '#E3EDDC',
  sageDeep:  '#7FA982',
  inkSoft:   '#5A6A5C',
  ink:       '#2F3A2F',
  amber:     '#E8B873',
  amberSoft: '#F5DDB0',
  shellPink: '#F4D9CC',
} as const;

export const ROUNDED_FONT =
  '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Yu Gothic", system-ui, sans-serif';

export const CARD_SHADOW =
  '0 8px 24px rgba(60, 80, 60, 0.08), 0 2px 6px rgba(60, 80, 60, 0.04)';
