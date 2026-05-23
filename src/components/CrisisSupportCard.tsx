import { PALETTE, CARD_SHADOW } from '../theme';

// 危機時の相談先カード。落ち着いた、押し付けないトーンで常設。
// 番号・URL は厚労省「まもろうよ こころ」掲載の代表的な窓口から。
// (https://www.mhlw.go.jp/mamorouyokokoro/)
//
// 文字数は最小限。タップ即発信できるよう tel: リンクを使う。

interface Resource {
  icon: string;
  name: string;
  detail: string;
  tel?: string;
  href?: string;
}

const RESOURCES: Resource[] = [
  {
    icon: '☎️',
    name: 'よりそいホットライン',
    detail: '24時間・無料',
    tel: '0120-279-338',
  },
  {
    icon: '💬',
    name: 'いのちの電話 ナビダイヤル',
    detail: '10:00–22:00（有料）',
    tel: '0570-783-556',
  },
  {
    icon: '🌐',
    name: 'まもろうよ こころ（厚生労働省）',
    detail: '相談先のまとめ',
    href: 'https://www.mhlw.go.jp/mamorouyokokoro/',
  },
];

export function CrisisSupportCard() {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: CARD_SHADOW,
        border: `1px solid ${PALETTE.sageSoft}`,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: PALETTE.ink,
          marginBottom: 4,
        }}
      >
        つらいときの相談先
      </div>
      <div
        style={{
          fontSize: 11,
          color: PALETTE.inkSoft,
          lineHeight: 1.6,
          marginBottom: 12,
        }}
      >
        ひとりで かかえこまなくて 大丈夫。話を聞いてくれる場所があります。
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {RESOURCES.map((r) => {
          const href = r.tel ? `tel:${r.tel.replace(/-/g, '')}` : r.href!;
          const external = !r.tel;
          return (
            <a
              key={r.name}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                background: PALETTE.sageSoft,
                borderRadius: 12,
                textDecoration: 'none',
                color: PALETTE.ink,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {r.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: PALETTE.inkSoft,
                    marginTop: 1,
                  }}
                >
                  {r.tel ? `${r.tel} ・ ${r.detail}` : r.detail}
                </div>
              </div>
              <div style={{ fontSize: 14, color: PALETTE.sageDeep }}>›</div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
