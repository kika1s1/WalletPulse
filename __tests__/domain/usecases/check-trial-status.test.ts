import {CheckTrialStatus} from '@domain/usecases/check-trial-status';

describe('CheckTrialStatus', () => {
  const checker = new CheckTrialStatus();
  const now = Date.now();
  const day = 86_400_000;

  it('active trial returns correct days remaining', () => {
    const result = checker.execute(
      {
        isTrialing: true,
        trialEndsAt: now + 7 * day,
        trialStartedAt: now - 7 * day,
      },
      now,
    );

    expect(result.isActive).toBe(true);
    expect(result.daysRemaining).toBe(7);
    expect(result.isExpired).toBe(false);
    expect(result.isInGracePeriod).toBe(false);
  });

  it('trial ending in less than 1 day shows 1 day remaining', () => {
    const result = checker.execute(
      {
        isTrialing: true,
        trialEndsAt: now + 0.5 * day,
        trialStartedAt: now - 13.5 * day,
      },
      now,
    );

    expect(result.isActive).toBe(true);
    expect(result.daysRemaining).toBe(1);
  });

  it('expired trial within grace period', () => {
    const result = checker.execute(
      {
        isTrialing: true,
        trialEndsAt: now - 1 * day,
        trialStartedAt: now - 15 * day,
      },
      now,
    );

    expect(result.isActive).toBe(false);
    expect(result.isExpired).toBe(true);
    expect(result.isInGracePeriod).toBe(true);
    expect(result.daysRemaining).toBe(0);
  });

  it('expired trial past grace period', () => {
    const result = checker.execute(
      {
        isTrialing: true,
        trialEndsAt: now - 5 * day,
        trialStartedAt: now - 19 * day,
      },
      now,
    );

    expect(result.isActive).toBe(false);
    expect(result.isExpired).toBe(true);
    expect(result.isInGracePeriod).toBe(false);
  });

  it('no trial returns null values', () => {
    const result = checker.execute(
      {
        isTrialing: false,
        trialEndsAt: null,
        trialStartedAt: null,
      },
      now,
    );

    expect(result.isActive).toBe(false);
    expect(result.daysRemaining).toBeNull();
    expect(result.startedAt).toBeNull();
    expect(result.endsAt).toBeNull();
    expect(result.isExpired).toBe(false);
    expect(result.isInGracePeriod).toBe(false);
  });

  it('grace period is exactly 3 days', () => {
    const justInGrace = checker.execute(
      {
        isTrialing: true,
        trialEndsAt: now - 3 * day,
        trialStartedAt: now - 17 * day,
      },
      now,
    );
    expect(justInGrace.isInGracePeriod).toBe(true);

    const pastGrace = checker.execute(
      {
        isTrialing: true,
        trialEndsAt: now - 3.1 * day,
        trialStartedAt: now - 17.1 * day,
      },
      now,
    );
    expect(pastGrace.isInGracePeriod).toBe(false);
  });
});
