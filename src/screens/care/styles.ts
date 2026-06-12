import { ROUNDED_FONT } from '../../theme';

/** 確認ダイアログ内などで使う、小さな丸ピルボタンのスタイル。 */
export function pillBtn(bg: string, fg: string) {
  return {
    border: 'none',
    background: bg,
    color: fg,
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: ROUNDED_FONT,
    cursor: 'pointer',
  } as const;
}
