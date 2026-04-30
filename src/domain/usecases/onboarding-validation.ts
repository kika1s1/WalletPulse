export type OnboardingStepId =
  | 'welcome'
  | 'currency'
  | 'notifications'
  | 'apps'
  | 'categories'
  | 'complete';

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  description: string;
  icon: string;
};

export type OnboardingState = {
  currency: string;
  enableNotifications: boolean;
  monitoredAppPackageIds: string[];
};

export function getOnboardingSteps(): OnboardingStep[] {
  return [
    {
      id: 'welcome',
      title: 'Welcome to WalletPulse',
      description:
        'Track spending and budgets with sync across your devices. Capture transactions from bank notifications on your phone when you allow it.',
      icon: 'wallet',
    },
    {
      id: 'currency',
      title: 'Choose your currency',
      description:
        'Select your primary currency. You can add wallets in other currencies and convert later.',
      icon: 'currency',
    },
    {
      id: 'notifications',
      title: 'Auto-detect transactions',
      description:
        'WalletPulse can read certain bank app notifications on this device and add matching transactions. You can change this anytime in Settings.',
      icon: 'bell',
    },
    {
      id: 'apps',
      title: 'Which apps to watch',
      description:
        'Choose which installed finance apps we try to parse when notification capture is on. Other notifications still use your custom parsing rules when set up.',
      icon: 'cellphone',
    },
    {
      id: 'categories',
      title: 'Default categories',
      description:
        'We create a full set of starter categories so you can log expenses right away. Edit or add more anytime under Settings.',
      icon: 'shape',
    },
    {
      id: 'complete',
      title: 'You are all set!',
      description:
        'You can start tracking transactions, budgets, and goals whenever you are ready.',
      icon: 'star',
    },
  ];
}

export function validateOnboardingStep(
  stepId: OnboardingStepId | string,
  state: OnboardingState,
): string | null {
  switch (stepId) {
    case 'welcome':
      return null;

    case 'currency': {
      if (!state.currency) {
        return 'Select a currency';
      }
      if (state.currency.length !== 3 || !/^[A-Z]{3}$/.test(state.currency)) {
        return 'Select a valid currency';
      }
      return null;
    }

    case 'notifications':
      return null;

    case 'apps': {
      if (!state.enableNotifications) {
        return null;
      }
      if (!state.monitoredAppPackageIds?.length) {
        return 'Pick at least one app to monitor, or turn off auto-detect';
      }
      return null;
    }

    case 'categories':
      return null;

    default:
      return null;
  }
}
