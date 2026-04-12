export type WinbackInput = {
  previousTier: 'free' | 'pro' | 'business' | 'lifetime';
  cancelledAt: number | null;
  alreadyShown: boolean;
};

export type WinbackOffer = {
  id: string;
  discountPercent: number;
  description: string;
  durationLabel: string;
  daysSinceCancellation: number;
};

const MAX_WINBACK_DAYS = 60;

export class CheckWinbackEligibility {
  execute(
    input: WinbackInput,
    now: number = Date.now(),
  ): WinbackOffer | null {
    if (input.previousTier === 'free' || input.previousTier === 'lifetime') {
      return null;
    }
    if (input.cancelledAt == null) {
      return null;
    }
    if (input.alreadyShown) {
      return null;
    }

    const daysSince = Math.floor((now - input.cancelledAt) / 86_400_000);

    if (daysSince < 0 || daysSince > MAX_WINBACK_DAYS) {
      return null;
    }

    if (daysSince <= 7) {
      return {
        id: 'winback_7d_50',
        discountPercent: 50,
        description: '50% off your first month back',
        durationLabel: '1 month',
        daysSinceCancellation: daysSince,
      };
    }

    if (daysSince <= 30) {
      return {
        id: 'winback_30d_40',
        discountPercent: 40,
        description: '40% off for 3 months',
        durationLabel: '3 months',
        daysSinceCancellation: daysSince,
      };
    }

    return {
      id: 'winback_60d_annual',
      discountPercent: 30,
      description: 'Special 30% off annual plan',
      durationLabel: '1 year',
      daysSinceCancellation: daysSince,
    };
  }
}
