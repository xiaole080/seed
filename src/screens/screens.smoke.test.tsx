// 全画面のスモークテスト: 最小 props でクラッシュせず描画されることを確認する。
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { ConsentState } from '../data/types';

import { ConsentScreen } from './ConsentScreen';
import { LoginScreen } from './LoginScreen';
import { EggCustomizeScreen } from './EggCustomizeScreen';
import { AttendanceSetupScreen } from './AttendanceSetupScreen';
import { RecordItemsSetupScreen } from './RecordItemsSetupScreen';
import { HomeScreen } from './HomeScreen';
import { MoodLogScreen } from './MoodLogScreen';
import { ReactionScreen } from './ReactionScreen';
import { CheckInScreen } from './CheckInScreen';
import { HistoryScreen } from './HistoryScreen';
import { CareScreen } from './CareScreen';
import { ProfileScreen } from './ProfileScreen';
import { RegionSearchScreen } from './RegionSearchScreen';

const consent: ConsentState = {
  appTermsAccepted: false,
  attendanceBackupConsent: 'notAsked',
  attendanceExportConsent: 'notAsked',
  researchConsent: 'notAsked',
  weatherApiConsent: 'notAsked',
  consentVersion: 'v1.1',
};

function expectRendered(node: ReturnType<typeof render>) {
  expect(node.container.firstChild).not.toBeNull();
  expect((node.container.textContent ?? '').length).toBeGreaterThan(0);
}

describe('画面スモークテスト — クラッシュせず描画される', () => {
  it('ConsentScreen', () => {
    expectRendered(render(<ConsentScreen consent={consent} onAccept={() => {}} />));
  });

  it('LoginScreen', () => {
    expectRendered(render(<LoginScreen />));
  });

  it('EggCustomizeScreen', () => {
    expectRendered(render(<EggCustomizeScreen />));
  });

  it('AttendanceSetupScreen', () => {
    expectRendered(render(<AttendanceSetupScreen />));
  });

  it('RecordItemsSetupScreen', () => {
    expectRendered(render(<RecordItemsSetupScreen />));
  });

  it('HomeScreen', () => {
    expectRendered(render(<HomeScreen />));
  });

  it('MoodLogScreen', () => {
    expectRendered(render(<MoodLogScreen />));
  });

  it('ReactionScreen', () => {
    expectRendered(render(<ReactionScreen />));
  });

  it('CheckInScreen', () => {
    expectRendered(render(<CheckInScreen />));
  });

  it('HistoryScreen', () => {
    expectRendered(render(<HistoryScreen />));
  });

  it('CareScreen', () => {
    expectRendered(render(<CareScreen />));
  });

  it('ProfileScreen', () => {
    expectRendered(render(<ProfileScreen />));
  });

  it('RegionSearchScreen (同意未取得)', () => {
    expectRendered(
      render(<RegionSearchScreen consent="notAsked" onPick={() => {}} />),
    );
  });

  it('RegionSearchScreen (同意済み)', () => {
    expectRendered(
      render(<RegionSearchScreen consent="accepted" onPick={() => {}} />),
    );
  });
});
