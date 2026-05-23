import type { CSSProperties, ReactNode } from 'react';
import { PALETTE, ROUNDED_FONT } from '../theme';
import { StatusBar } from './StatusBar';

interface PhoneShellProps {
  children: ReactNode;
  bg?: string;
  label?: string;
  style?: CSSProperties;
}

export function PhoneShell({
  children,
  bg = PALETTE.creamSoft,
  label,
  style,
}: PhoneShellProps) {
  return (
    <div
      data-screen-label={label}
      style={{
        width: '100%',
        height: '100%',
        background: bg,
        fontFamily: ROUNDED_FONT,
        color: PALETTE.ink,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      <StatusBar />
      {children}
    </div>
  );
}
