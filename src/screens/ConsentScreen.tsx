import { useState } from 'react';
import { PALETTE, ROUNDED_FONT, CARD_SHADOW } from '../theme';
import { PhoneShell } from '../components/PhoneShell';
import { BackgroundLeaves } from '../components/BackgroundLeaves';
import type { ConsentState } from '../data/types';

interface ConsentScreenProps {
  consent: ConsentState;
  onAccept: (next: ConsentState) => void;
}

// 仕様 §13.1 / §13.6:
//  - 利用者本人のセルフケアが第一目的であることを明示
//  - 取り扱うデータと送信先・撤回方法を提示
//  - 通所バックアップは別合意 (オプトイン)
//  - 研究利用は本MVPの対象外（同意項目自体出さない）
export function ConsentScreen({ consent, onAccept }: ConsentScreenProps) {
  const [agreed, setAgreed] = useState(false);
  const [optInBackup, setOptInBackup] = useState(
    consent.attendanceBackupConsent === 'accepted',
  );

  const submit = () => {
    if (!agreed) return;
    onAccept({
      ...consent,
      appTermsAccepted: true,
      attendanceBackupConsent: optInBackup ? 'accepted' : 'declined',
      attendanceExportConsent: 'accepted', // 本人操作でのCSV出力は常に許可
      researchConsent: consent.researchConsent ?? 'notAsked',
    });
  };

  return (
    <PhoneShell bg={PALETTE.cream} label="00 はじめに">
      <BackgroundLeaves />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 22px 24px',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
        }}
      >
        <div style={{ marginTop: 18, marginBottom: 12 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.4,
            }}
          >
            はじめに
            <br />
            おねがいごとです
          </div>
          <div
            style={{
              fontSize: 12,
              color: PALETTE.inkSoft,
              marginTop: 8,
              lineHeight: 1.7,
            }}
          >
            このアプリは「あなたの きもち と からだ を
            やさしく ふりかえる」ためのものです。
            医療的な診断はしません。
          </div>
        </div>

        <Section title="どこに のこるか">
          <Line icon="📱">
            きもち・睡眠・食事・体調・服薬・自由記述は
            <strong>あなたの端末にだけ</strong> 残ります。
          </Line>
          <Line icon="📤">
            通所の予定と打刻だけは、必要なときに
            CSVファイルとして書き出せます（あなたの操作で）。
          </Line>
          <Line icon="🚫">
            <strong>自由記述</strong>は、外には送られません。
            <br />
            個人名・施設名・第三者を特定できる情報は、なるべく書かないでください。
          </Line>
        </Section>

        <Section title="入力は任意です">
          <Line icon="🌱">
            書きたくない項目は空欄でかまいません。
            <br />
            未入力でも記録できます。
          </Line>
        </Section>

        <Section title="やめたくなったら">
          <Line icon="🗑️">
            「じぶん」画面から、いつでも端末のデータを消せます。
          </Line>
          <Line icon="✉️">
            外部に送られたぶんも、配布者に連絡すれば消してもらえます。
          </Line>
        </Section>

        <Section title="つらいときは">
          <Line icon="📞">
            ひとりで抱えこまないでください。
            <br />
            <strong>いのちの電話 0570-783-556</strong>
            <br />
            <strong>よりそいホットライン 0120-279-338</strong>
            <br />
            「じぶん」画面にも相談先のカードがあります。
          </Line>
        </Section>

        {/* 通所バックアップのオプトイン (§4.2) */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '14px 16px',
            boxShadow: CARD_SHADOW,
            marginTop: 16,
          }}
        >
          <label
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={optInBackup}
              onChange={(e) => setOptInBackup(e.target.checked)}
              style={{ marginTop: 4 }}
            />
            <span style={{ fontSize: 13, lineHeight: 1.6, color: PALETTE.ink }}>
              <strong>通所の打刻データの自動バックアップに同意する</strong>
              <br />
              <span style={{ fontSize: 11, color: PALETTE.inkSoft }}>
                月末に支援員と確認しやすくするためのものです。
                気分・体調・服薬・自由記述は含まれません。
                あとから「じぶん」で切り替えられます。
              </span>
            </span>
          </label>
        </div>

        {/* 同意チェック */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '14px 16px',
            boxShadow: CARD_SHADOW,
            marginTop: 12,
          }}
        >
          <label
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: 4 }}
            />
            <span style={{ fontSize: 13, lineHeight: 1.6, color: PALETTE.ink }}>
              内容を読みました。このアプリを使い始めます。
            </span>
          </label>
        </div>

        <button
          onClick={submit}
          disabled={!agreed}
          style={{
            marginTop: 18,
            width: '100%',
            height: 56,
            border: 'none',
            borderRadius: 20,
            background: agreed ? PALETTE.sageDeep : PALETTE.sageSoft,
            color: agreed ? '#fff' : PALETTE.inkSoft,
            fontSize: 15,
            fontWeight: 700,
            fontFamily: ROUNDED_FONT,
            boxShadow: agreed
              ? '0 6px 16px rgba(127,169,130,0.32)'
              : 'none',
            cursor: agreed ? 'pointer' : 'default',
            flexShrink: 0,
          }}
        >
          同意して はじめる
        </button>

        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: PALETTE.inkSoft,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          同意のバージョン: {consent.consentVersion}
        </div>
      </div>
    </PhoneShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: CARD_SHADOW,
        marginTop: 12,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: PALETTE.ink,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function Line({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <span
        style={{
          fontSize: 12,
          color: PALETTE.ink,
          lineHeight: 1.6,
        }}
      >
        {children}
      </span>
    </div>
  );
}
