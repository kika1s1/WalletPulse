export type OnboardingStepId = 'welcome' | 'currency' | 'wallet' | 'notifications' | 'pro_trial';

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  description: string;
  icon: string;
};

export type OnboardingState = {
  walletName: string;
  currency: string;
  enableNotifications: boolean;
};

const MAX_WALLET_NAME = 30;

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
      id: 'wallet',
      title: 'Create your first wallet',
      description:
        'A wallet groups your transactions. You might have one for cash, a bank account, or a credit card.',
      icon: 'creditcard',
    },
    {
      id: 'notifications',
      title: 'Auto-detect transactions',
      description:
        'WalletPulse can read your bank notifications and automatically log transactions. You can enable or disable this anytime.',
      icon: 'bell',
    },
    {
      id: 'pro_trial',
      title: 'You are all set!',
      description:
        'Start your free trial of WalletPulse Pro and unlock the full experience.',
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

    case 'wallet': {
      const trimmed = state.walletName.trim();
      if (!trimmed) {
        return 'Enter a wallet name';
      }
      if (trimmed.length > MAX_WALLET_NAME) {
        return `Wallet name must be ${MAX_WALLET_NAME} characters or fewer`;
      }
      return null;
    }

    case 'notifications':
      return null;

    default:
      return null;
  }
}
