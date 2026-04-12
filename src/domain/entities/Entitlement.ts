export type Tier = 'free' | 'pro' | 'business' | 'lifetime';

export const VALID_TIERS: readonly Tier[] = [
  'free',
  'pro',
  'business',
  'lifetime',
];

export type FeatureLimits = {
  // Numeric limits
  maxWallets: number;
  maxBudgets: number;
  maxParserApps: number;
  historyMonths: number;

  // Boolean feature flags (Pro)
  customCategories: boolean;
  export: boolean;
  darkMode: boolean;
  biometricLock: boolean;
  encryption: boolean;
  goals: boolean;
  subscriptionTracking: boolean;
  billReminders: boolean;
  templates: boolean;
  receipts: boolean;
  tags: boolean;
  savedFilters: boolean;
  financialHealthScore: boolean;
  paydayPlanner: boolean;
  spendingAutopsy: boolean;

  // String-or-boolean fields
  backup: string | boolean;
  insights: string | boolean;

  // Business-only flags
  multiProfile: boolean;
  taxCategories: boolean;
  taxEstimate: boolean;
  invoiceTracking: boolean;
  profitLoss: boolean;
  clientExpenses: boolean;
  professionalReports: boolean;
  googleDriveBackup: boolean;
  scheduledExports: boolean;
  currencyGainLoss: boolean;
  spendingPredictions: boolean;
  customParsers: boolean;
  homeWidgets: boolean;
  splitExpenses: boolean;
  moneyLostTracker: boolean;
  currencyTimingAdvisor: boolean;
  freelancerDashboard: boolean;
  billNegotiationAlerts: boolean;
};

export type Entitlement = {
  id: string;
  tier: Tier;
  featureLimits: FeatureLimits;
  isTrialing: boolean;
  trialEndsAt: number | null;
  expiresAt: number | null;
  purchasedAt: number | null;
};

export type CreateEntitlementInput = {
  id: string;
  tier: Tier;
  featureLimits: FeatureLimits;
  isTrialing: boolean;
  trialEndsAt: number | null;
  expiresAt: number | null;
  purchasedAt: number | null;
};

export function createEntitlement(input: CreateEntitlementInput): Entitlement {
  if (!input.id.trim()) {
    throw new Error('Entitlement id is required');
  }
  if (!VALID_TIERS.includes(input.tier)) {
    throw new Error('Invalid tier');
  }
  if (input.isTrialing && input.trialEndsAt === null) {
    throw new Error('Trial end date is required when trialing');
  }

  return {
    id: input.id,
    tier: input.tier,
    featureLimits: {...input.featureLimits},
    isTrialing: input.isTrialing,
    trialEndsAt: input.trialEndsAt,
    expiresAt: input.expiresAt,
    purchasedAt: input.purchasedAt,
  };
}

export function isTrialActive(e: Entitlement, nowMs: number): boolean {
  if (!e.isTrialing || e.trialEndsAt === null) {
    return false;
  }
  return nowMs < e.trialEndsAt;
}

export function isExpired(e: Entitlement, nowMs: number): boolean {
  if (e.tier === 'lifetime') {
    return false;
  }
  if (e.expiresAt === null) {
    return false;
  }
  return nowMs >= e.expiresAt;
}
