export type OnboardingStepId = 'welcome' | 'currency' | 'notifications' | 'complete';

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  description: string;
  icon: string;
};

export type OnboardingState = {
  currency: string;
  enableNotifications: boolean;
};

export function getOnboardingSteps(): OnboardingStep[] {
  return [
    {
      id: 'welcome',
      title: 'Welcome to WalletPulse',
      description:
        'Your smart, offline-first expense tracker. Track spending, set budgets, and gain insights into your finances.',
      icon: 'wallet',
    },
    {
      id: 'currency',
      title: 'Choose your currency',
      description:
        'Select your primary currency. You can always add more currencies and convert between them later.',
      icon: 'currency',
    },
    {
      id: 'notifications',
      title: 'Auto-detect transactions',
      description:
        'WalletPulse can read your bank notifications and automatically log transactions. You can enable or disable this anytime.',
      icon: 'bell',
    },
    {
      id: 'complete',
      title: 'You are all set!',
      description:
        'You can start tracking transactions, budgets, and goals right away.',
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

    default:
      return null;
  }
}
