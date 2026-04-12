export type TrialStatusInput = {
  isTrialing: boolean;
  trialEndsAt: number | null;
  trialStartedAt: number | null;
};

export type TrialStatus = {
  isActive: boolean;
  daysRemaining: number | null;
  startedAt: number | null;
  endsAt: number | null;
  isExpired: boolean;
  isInGracePeriod: boolean;
};

const MS_PER_DAY = 86_400_000;
const GRACE_PERIOD_DAYS = 3;

export class CheckTrialStatus {
  execute(input: TrialStatusInput, now: number = Date.now()): TrialStatus {
    if (!input.isTrialing || input.trialEndsAt == null) {
      return {
        isActive: false,
        daysRemaining: null,
        startedAt: input.trialStartedAt,
        endsAt: input.trialEndsAt,
        isExpired: false,
        isInGracePeriod: false,
      };
    }

    const msRemaining = input.trialEndsAt - now;

    if (msRemaining > 0) {
      return {
        isActive: true,
        daysRemaining: Math.ceil(msRemaining / MS_PER_DAY),
        startedAt: input.trialStartedAt,
        endsAt: input.trialEndsAt,
        isExpired: false,
        isInGracePeriod: false,
      };
    }

    const msSinceExpiry = now - input.trialEndsAt;
    const daysSinceExpiry = msSinceExpiry / MS_PER_DAY;
    const isInGracePeriod = daysSinceExpiry <= GRACE_PERIOD_DAYS;

    return {
      isActive: false,
      daysRemaining: 0,
      startedAt: input.trialStartedAt,
      endsAt: input.trialEndsAt,
      isExpired: true,
      isInGracePeriod,
    };
  }
}
