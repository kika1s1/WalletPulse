import {
  validateOnboardingStep,
  getOnboardingSteps,
  type OnboardingState,
} from '@domain/usecases/onboarding-validation';

describe('onboarding-validation', () => {
  describe('getOnboardingSteps', () => {
    it('returns 4 steps including completion', () => {
      expect(getOnboardingSteps()).toHaveLength(4);
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
