import { useEffect, useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';

interface LoginScreenProps {
  nickname?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export function LoginScreen({
  nickname = 'はる',
  onChange,
  onSubmit,
}: LoginScreenProps) {
  const [val, setVal] = useState(nickname);
  useEffect(() => setVal(nickname), [nickname]);

  return (
    <PhoneShell bg={PALETTE.cream} label="01 ログイン">
      <BackgroundLeaves />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 32px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 168,
            height: 168,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 40%, #fff, ${PALETTE.sageSoft})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: CARD_SHADOW,
            marginBottom: 28,
            fontSize: 84,
          }}
        >
          🥚
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.02em',
            marginBottom: 6,
            textAlign: 'center',
          }}
        >
          Seed
        </div>
        <div
          style={{
            fontSize: 13,
            color: PALETTE.inkSoft,
            marginBottom: 36,
            textAlign: 'center',
            lineHeight: 1.7,
          }}
        >
          はじめまして。
          <br />
          ここから いっしょに 育っていきましょう。
        </div>

        <label
          style={{
            width: '100%',
            fontSize: 12,
            color: PALETTE.inkSoft,
            marginBottom: 8,
            paddingLeft: 4,
          }}
        >
          ニックネーム（あとから変えられます）
        </label>
        <div
          style={{
            width: '100%',
            height: 52,
            background: '#fff',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            padding: '0 18px',
            boxShadow: CARD_SHADOW,
            marginBottom: 6,
          }}
        >
          <input
            value={val}
            onChange={(e) => {
              setVal(e.target.value);
              onChange?.(e.target.value);
            }}
            placeholder="例: はる"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 16,
              fontFamily: ROUNDED_FONT,
              color: PALETTE.ink,
              background: 'transparent',
            }}
          />
        </div>
        {/* 本名禁止の補足 (Sprint 2026-05-23 Phase 2b)。
            ニックネームは testerId としてアプリ内とテストの記録に表示される。 */}
        <div
          style={{
            width: '100%',
            fontSize: 11,
            color: PALETTE.inkSoft,
            lineHeight: 1.6,
            marginBottom: 18,
            paddingLeft: 4,
            paddingRight: 4,
          }}
        >
          本名や、家族・支援員の名前は使わないでください。
          アプリ内とテストの記録に表示されます。外部のスプレッドシートに送られる場合もあります。
        </div>

        <button
          onClick={() => onSubmit?.(val.trim() || 'あなた')}
          style={{
            width: '100%',
            height: 52,
            border: 'none',
            borderRadius: 18,
            background: PALETTE.sageDeep,
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            boxShadow: '0 6px 16px rgba(127, 169, 130, 0.3)',
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          はじめる
        </button>

        <div
          style={{
            marginTop: 22,
            fontSize: 11,
            color: PALETTE.inkSoft,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          認証は使いません。
          <br />
          記録はあなたの端末にだけ残ります。
        </div>
      </div>
    </PhoneShell>
  );
}
