import {CheckWinbackEligibility} from '@domain/usecases/check-winback-eligibility';

describe('CheckWinbackEligibility', () => {
  const checker = new CheckWinbackEligibility();
  const now = Date.now();
  const day = 86_400_000;

  it('recently cancelled user (7 days) gets 50% offer', () => {
    const result = checker.execute(
      {previousTier: 'pro', cancelledAt: now - 5 * day, alreadyShown: false},
      now,
    );
    expect(result).not.toBeNull();
    expect(result!.discountPercent).toBe(50);
    expect(result!.durationLabel).toBe('1 month');
  });

  it('user cancelled 20 days ago gets 40% offer', () => {
    const result = checker.execute(
      {previousTier: 'pro', cancelledAt: now - 20 * day, alreadyShown: false},
      now,
    );
    expect(result).not.toBeNull();
    expect(result!.discountPercent).toBe(40);
    expect(result!.durationLabel).toBe('3 months');
  });

  it('user cancelled 45 days ago gets annual offer', () => {
    const result = checker.execute(
      {previousTier: 'business', cancelledAt: now - 45 * day, alreadyShown: false},
      now,
    );
    expect(result).not.toBeNull();
    expect(result!.discountPercent).toBe(30);
    expect(result!.durationLabel).toBe('1 year');
  });

  it('never-subscribed user gets null', () => {
    const result = checker.execute(
      {previousTier: 'free', cancelledAt: null, alreadyShown: false},
      now,
    );
    expect(result).toBeNull();
  });

  it('lifetime user gets null (no churn possible)', () => {
    const result = checker.execute(
      {previousTier: 'lifetime', cancelledAt: now - 5 * day, alreadyShown: false},
      now,
    );
    expect(result).toBeNull();
  });

  it('already shown offer returns null', () => {
    const result = checker.execute(
      {previousTier: 'pro', cancelledAt: now - 5 * day, alreadyShown: true},
      now,
    );
    expect(result).toBeNull();
  });

  it('user cancelled over 60 days ago gets null', () => {
    const result = checker.execute(
      {previousTier: 'pro', cancelledAt: now - 65 * day, alreadyShown: false},
      now,
    );
    expect(result).toBeNull();
  });

  it('offer includes days since cancellation', () => {
    const result = checker.execute(
      {previousTier: 'pro', cancelledAt: now - 3 * day, alreadyShown: false},
      now,
    );
    expect(result!.daysSinceCancellation).toBe(3);
  });
});
