import type {FeatureLimits, Tier} from './Entitlement';

const FREE_LIMITS: FeatureLimits = {
  maxWallets: 2,
  maxBudgets: 1,
  maxParserApps: 1,
  historyMonths: 6,

  customCategories: false,
  export: false,
  darkMode: false,
  biometricLock: false,
  encryption: false,
  goals: false,
  subscriptionTracking: false,
  billReminders: false,
  templates: false,
  receipts: false,
  tags: false,
  savedFilters: false,
  financialHealthScore: false,
  paydayPlanner: false,
  spendingAutopsy: false,

  backup: false,
  insights: 'basic',

  multiProfile: false,
  taxCategories: false,
  taxEstimate: false,
  invoiceTracking: false,
  profitLoss: false,
  clientExpenses: false,
  professionalReports: false,
  googleDriveBackup: false,
  scheduledExports: false,
  currencyGainLoss: false,
  spendingPredictions: false,
  customParsers: false,
  homeWidgets: false,
  splitExpenses: false,
  moneyLostTracker: false,
  currencyTimingAdvisor: false,
  freelancerDashboard: false,
  billNegotiationAlerts: false,
};

const PRO_LIMITS: FeatureLimits = {
  maxWallets: Infinity,
  maxBudgets: Infinity,
  maxParserApps: Infinity,
  historyMonths: Infinity,

  customCategories: true,
  export: true,
  darkMode: true,
  biometricLock: true,
  encryption: true,
  goals: true,
  subscriptionTracking: true,
  billReminders: true,
  templates: true,
  receipts: true,
  tags: true,
  savedFilters: true,
  financialHealthScore: true,
  paydayPlanner: true,
  spendingAutopsy: true,

  backup: 'local',
  insights: 'full',

  multiProfile: false,
  taxCategories: false,
  taxEstimate: false,
  invoiceTracking: false,
  profitLoss: false,
  clientExpenses: false,
  professionalReports: false,
  googleDriveBackup: false,
  scheduledExports: false,
  currencyGainLoss: true,
  spendingPredictions: false,
  customParsers: false,
  homeWidgets: false,
  splitExpenses: false,
  moneyLostTracker: true,
  currencyTimingAdvisor: true,
  freelancerDashboard: false,
  billNegotiationAlerts: false,
};

const BUSINESS_LIMITS: FeatureLimits = {
  ...PRO_LIMITS,

  backup: 'cloud',

  multiProfile: true,
  taxCategories: true,
  taxEstimate: true,
  invoiceTracking: true,
  profitLoss: true,
  clientExpenses: true,
  professionalReports: true,
  googleDriveBackup: true,
  scheduledExports: true,
  currencyGainLoss: true,
  spendingPredictions: true,
  customParsers: true,
  homeWidgets: true,
  splitExpenses: true,
  moneyLostTracker: true,
  currencyTimingAdvisor: true,
  freelancerDashboard: true,
  billNegotiationAlerts: true,
};

export const TIER_LIMITS: Record<Tier, FeatureLimits> = {
  free: FREE_LIMITS,
  pro: PRO_LIMITS,
  business: BUSINESS_LIMITS,
  lifetime: PRO_LIMITS,
};

export function getTierLimits(tier: Tier): FeatureLimits {
  return {...TIER_LIMITS[tier]};
}
