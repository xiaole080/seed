import type { ReactNode } from 'react';
import { PALETTE, CARD_SHADOW } from '../../theme';
import { PRESET_BY_ID } from '../../data/historyView';

// HistoryScreen 内で共有する小さな表示パーツ群。

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '12px 8px',
        boxShadow: CARD_SHADOW,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 10, color: PALETTE.inkSoft, marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: PALETTE.sageDeep,
          lineHeight: 1,
        }}
      >
        {value}
        {sub && (
          <span style={{ fontSize: 11, color: PALETTE.inkSoft, marginLeft: 2 }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

export function SectionCard({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 18,
        padding: '16px 14px',
        boxShadow: CARD_SHADOW,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

export function SectionHeading({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
      {title}
    </div>
  );
}

export function EmptyNote({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: PALETTE.inkSoft,
        padding: '10px 4px',
        lineHeight: 1.6,
      }}
    >
      {text}
    </div>
  );
}

/** 頻度チップの並び */
export function ChipRow({
  items,
}: {
  items: { key: string; label: string; icon?: string; count: number }[];
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((it) => (
        <span
          key={it.key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: PALETTE.sageSoft,
            color: PALETTE.inkSoft,
            borderRadius: 999,
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {it.icon && <span>{it.icon}</span>}
          <span>{it.label}</span>
          <span style={{ color: PALETTE.sageDeep, fontWeight: 700 }}>
            {it.count}
          </span>
        </span>
      ))}
    </div>
  );
}

export function CardHeading({ id, title }: { id: string; title: string }) {
  const preset = PRESET_BY_ID[id];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
      }}
    >
      <span style={{ fontSize: 15 }}>{preset?.icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{title}</span>
    </div>
  );
}
