import {
  validateOnboardingStep,
  getOnboardingSteps,
  type OnboardingState,
} from '@domain/usecases/onboarding-validation';

describe('onboarding-validation', () => {
  describe('getOnboardingSteps', () => {
    it('returns 6 steps including completion', () => {
      expect(getOnboardingSteps()).toHaveLength(6);
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
      monitoredAppPackageIds: ['com.payoneer.android'],
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

    it('apps step requires at least one package when notifications enabled', () => {
      expect(validateOnboardingStep('apps', base)).toBeNull();
      expect(
        validateOnboardingStep('apps', {
          ...base,
          enableNotifications: true,
          monitoredAppPackageIds: [],
        }),
      ).toBe('Pick at least one app to monitor, or turn off auto-detect');
      expect(
        validateOnboardingStep('apps', {
          ...base,
          enableNotifications: true,
          monitoredAppPackageIds: ['com.grey.android'],
        }),
      ).toBeNull();
    });

    it('categories step always passes', () => {
      expect(validateOnboardingStep('categories', base)).toBeNull();
    });

    it('returns null for unknown step', () => {
      expect(validateOnboardingStep('unknown' as any, base)).toBeNull();
    });
  });
});
