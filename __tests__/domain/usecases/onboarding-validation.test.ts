import {
  validateOnboardingStep,
  getOnboardingSteps,
  type OnboardingState,
} from '@domain/usecases/onboarding-validation';

describe('onboarding-validation', () => {
  describe('getOnboardingSteps', () => {
    it('returns 5 steps including completion', () => {
      expect(getOnboardingSteps()).toHaveLength(5);
    });

    it('steps have required fields', () => {
      const steps = getOnboardingSteps();
      for (const step of steps) {
        expect(step.id).toBeTruthy();
        expect(step.title).toBeTruthy();
        expect(step.description).toBeTruthy();
      }
    });
  });

  describe('validateOnboardingStep', () => {
    const base: OnboardingState = {
      walletName: 'My Wallet',
      currency: 'USD',
      enableNotifications: false,
    };

    it('welcome step always passes', () => {
      expect(validateOnboardingStep('welcome', base)).toBeNull();
    });

    it('currency step requires a valid 3-letter currency', () => {
      expect(validateOnboardingStep('currency', base)).toBeNull();
      expect(validateOnboardingStep('currency', {...base, currency: ''})).toBe(
        'Select a currency',
      );
      expect(validateOnboardingStep('currency', {...base, currency: 'XX'})).toBe(
        'Select a valid currency',
      );
    });

    it('wallet step requires a non-empty wallet name', () => {
      expect(validateOnboardingStep('wallet', base)).toBeNull();
      expect(validateOnboardingStep('wallet', {...base, walletName: ''})).toBe(
        'Enter a wallet name',
      );
      expect(validateOnboardingStep('wallet', {...base, walletName: '   '})).toBe(
        'Enter a wallet name',
      );
    });

    it('wallet name must not exceed 30 characters', () => {
      const long = 'a'.repeat(31);
      expect(validateOnboardingStep('wallet', {...base, walletName: long})).toBe(
        'Wallet name must be 30 characters or fewer',
      );
    });

    it('notification step always passes', () => {
      expect(validateOnboardingStep('notifications', base)).toBeNull();
      expect(
        validateOnboardingStep('notifications', {...base, enableNotifications: true}),
      ).toBeNull();
    });

    it('returns null for unknown step', () => {
      expect(validateOnboardingStep('unknown' as any, base)).toBeNull();
    });
  });
});
