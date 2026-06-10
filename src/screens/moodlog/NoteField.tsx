import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../../theme';

// Q4: 自由記述 (§2.5)。端末ローカル限定。本文は外部送信しない (§13.8)。
export function NoteField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例：朝、すこし散歩できた。"
        rows={3}
        style={{
          minHeight: 96,
          padding: 14,
          border: 'none',
          borderRadius: 16,
          background: '#fff',
          boxShadow: CARD_SHADOW,
          fontSize: 14,
          fontFamily: ROUNDED_FONT,
          color: PALETTE.ink,
          resize: 'none',
          outline: 'none',
          lineHeight: 1.6,
        }}
      />
      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          color: PALETTE.inkSoft,
          lineHeight: 1.6,
        }}
      >
        ※ 自由記述は端末に保存され、本人の振り返り用です。
        <br />
        書きたくないことは書かなくて大丈夫です。
        <br />
        緊急のご相談には使わないでください（わたし画面に相談先があります）。
        <br />
        個人名・施設名などを書きすぎないでください。
      </div>
    </>
  );
}
