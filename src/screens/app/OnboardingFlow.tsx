import type { ReactNode } from 'react';
import { ConsentScreen } from '../ConsentScreen';
import { LoginScreen } from '../LoginScreen';
import { EggCustomizeScreen } from '../EggCustomizeScreen';
import { AttendanceSetupScreen } from '../AttendanceSetupScreen';
import { RecordItemsSetupScreen } from '../RecordItemsSetupScreen';
import { nowISO } from '../../data/store';
import type { ConsentState } from '../../data/types';
import type { AppState, Phase } from '../../data/appState';
import type { Route } from './MainRouter';

interface OnboardingFlowProps {
  phase: Phase;
  state: AppState;
  consent: ConsentState;
  setConsent: (c: ConsentState) => void;
  setPhase: (p: Phase) => void;
  setRoute: (r: Route) => void;
  update: (patch: Partial<AppState>) => void;
}

// phase !== 'app' のときの、オンボーディング (同意 → ログイン → 各セットアップ) ルーティング。
export function OnboardingFlow({
  phase,
  state,
  consent,
  setConsent,
  setPhase,
  setRoute,
  update,
}: OnboardingFlowProps): ReactNode {
  if (phase === 'consent') {
    return (
      <ConsentScreen
        consent={consent}
        onAccept={(next) => {
          setConsent({
            ...next,
            appTermsAccepted: true,
            consentedAt: nowISO(),
          });
          setPhase('login');
        }}
      />
    );
  }

  if (phase === 'login') {
    return (
      <LoginScreen
        nickname={state.nickname}
        onChange={(v) => update({ nickname: v })}
        onSubmit={(v) => {
          update({ nickname: v });
          setPhase('setup-egg');
        }}
      />
    );
  }

  if (phase === 'setup-egg') {
    return (
      <EggCustomizeScreen
        initialSpecies={state.eggSpecies}
        initialTrait={state.eggTrait}
        initialName={state.eggName}
        onSave={({ eggSpecies, eggTrait, eggName }) => {
          update({ eggSpecies, eggTrait, eggName });
          setPhase('setup-attendance');
        }}
        onSkip={() => setPhase('setup-attendance')}
      />
    );
  }

  if (phase === 'setup-attendance') {
    return (
      <AttendanceSetupScreen
        initial={state.schedule}
        onSave={(s) => {
          update({ schedule: s });
          setPhase('setup-records');
        }}
        onSkip={() => setPhase('setup-records')}
      />
    );
  }

  if (phase === 'setup-records') {
    return (
      <RecordItemsSetupScreen
        initialIds={state.recordIds}
        onSave={(ids) => {
          update({ recordIds: ids });
          setPhase('app');
          setRoute('home');
        }}
        onSkip={() => {
          setPhase('app');
          setRoute('home');
        }}
      />
    );
  }

  return null;
}
