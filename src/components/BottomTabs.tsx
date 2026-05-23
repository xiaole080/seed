import { PALETTE } from '../theme';

export type TabId = 'home' | 'log' | 'care' | 'me';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'home', label: 'ホーム', icon: '🌱' },
  { id: 'log',  label: 'きろく', icon: '📔' },
  { id: 'care', label: 'ケア',   icon: '🌿' },
  { id: 'me',   label: 'じぶん', icon: '🪺' },
];

interface BottomTabsProps {
  active: TabId;
  onChange?: (tab: TabId) => void;
}

export function BottomTabs({ active, onChange }: BottomTabsProps) {
  return (
    <div
      style={{
        height: 76,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${PALETTE.sageSoft}`,
        display: 'flex',
        alignItems: 'flex-start',
        paddingTop: 10,
        flexShrink: 0,
      }}
    >
      {TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange?.(t.id)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              color: isActive ? PALETTE.sageDeep : PALETTE.inkSoft,
              cursor: onChange ? 'pointer' : 'default',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 20, opacity: isActive ? 1 : 0.5 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
