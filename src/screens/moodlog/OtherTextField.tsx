import { PALETTE, ROUNDED_FONT } from '../../theme';

// T9 / T10: その他用の自由入力欄。100文字上限。端末ローカル限定 (§9.5)。
export function OtherTextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div
      style={{
        marginTop: 8,
        background: PALETTE.creamSoft,
        borderRadius: 12,
        padding: '10px 12px',
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 100))}
        placeholder={placeholder ?? 'その他、気になったこと'}
        maxLength={100}
        style={{
          width: '100%',
          border: 'none',
          borderBottom: `1px solid ${PALETTE.sage}`,
          outline: 'none',
          background: 'transparent',
          fontSize: 13,
          fontFamily: ROUNDED_FONT,
          color: PALETTE.ink,
          padding: '4px 2px',
        }}
      />
      <div
        style={{
          marginTop: 4,
          fontSize: 10,
          color: PALETTE.inkSoft,
          lineHeight: 1.5,
        }}
      >
        個人名・施設名などを書きすぎないでください。
      </div>
    </div>
  );
}
