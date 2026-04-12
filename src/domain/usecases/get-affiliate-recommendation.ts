import {
  AFFILIATE_PARTNERS,
  type AffiliatePartner,
} from '@shared/constants/affiliate-links';

export type AffiliateContext = {
  totalFxFees?: number;
  currencies?: string[];
  source?: string;
  existingSources?: string[];
  region?: string;
};

export type AffiliateRecommendation = {
  partner: AffiliatePartner;
  reason: string;
};

type DismissRecord = Map<string, number>;

const HIGH_FX_THRESHOLD = 500;
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function isOnCooldown(
  partnerId: string,
  dismissed: DismissRecord,
  now: number,
): boolean {
  const ts = dismissed.get(partnerId);
  if (ts == null) {
    return false;
  }
  return now - ts < COOLDOWN_MS;
}

export class GetAffiliateRecommendation {
  private dismissed: DismissRecord;

  constructor(dismissed?: DismissRecord) {
    this.dismissed = dismissed ?? new Map();
  }

  dismiss(partnerId: string, now: number = Date.now()): void {
    this.dismissed.set(partnerId, now);
  }

  execute(context: AffiliateContext): AffiliateRecommendation | null {
    const now = Date.now();
    const existing = new Set(
      (context.existingSources ?? []).map((s) => s.toLowerCase()),
    );

    if (
      (context.totalFxFees ?? 0) >= HIGH_FX_THRESHOLD &&
      !existing.has('wise')
    ) {
      const partner = AFFILIATE_PARTNERS.find((p) => p.id === 'wise')!;
      if (!isOnCooldown(partner.id, this.dismissed, now)) {
        return {
          partner,
          reason: `You paid ${Math.round((context.totalFxFees ?? 0) / 100)} in conversion fees this month. Wise offers much lower rates.`,
        };
      }
    }

    if (
      context.region?.toLowerCase() === 'africa' &&
      !existing.has('grey')
    ) {
      const partner = AFFILIATE_PARTNERS.find((p) => p.id === 'grey')!;
      if (!isOnCooldown(partner.id, this.dismissed, now)) {
        return {
          partner,
          reason: 'Receive USD, GBP, and EUR in Africa with competitive rates.',
        };
      }
    }

    if (
      (context.currencies?.length ?? 0) >= 3 &&
      !existing.has('revolut')
    ) {
      const partner = AFFILIATE_PARTNERS.find((p) => p.id === 'revolut')!;
      if (!isOnCooldown(partner.id, this.dismissed, now)) {
        return {
          partner,
          reason: 'Manage multiple currencies in one place with Revolut.',
        };
      }
    }

    return null;
  }
}
