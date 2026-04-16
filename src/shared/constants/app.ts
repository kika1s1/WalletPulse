export const APP_NAME = 'WalletPulse';
export const APP_VERSION = '1.3.0';

export const FX_RATE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours
export const FX_RATE_FETCH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

export const BUDGET_WARNING_THRESHOLD = 50;
export const BUDGET_DANGER_THRESHOLD = 80;

export const LOW_BALANCE_THRESHOLD_CENTS = 50000; // $500

export const INSIGHT_SPENDING_CHANGE_THRESHOLD = 20; // 20%

export const RECENT_TRANSACTIONS_LIMIT = 5;
export const SEARCH_RESULTS_LIMIT = 50;
export const TOP_CATEGORIES_LIMIT = 5;

export const NOTIFICATION_LOG_RETENTION_DAYS = 30;

export const DATE_FORMATS = {
  US: 'MM/dd/yyyy',
  EU: 'dd/MM/yyyy',
  ISO: 'yyyy-MM-dd',
} as const;

export const SETTINGS_KEYS = {
  BASE_CURRENCY: 'base_currency',
  DATE_FORMAT: 'date_format',
  FIRST_DAY_OF_WEEK: 'first_day_of_week',
  THEME_MODE: 'theme_mode',
  NOTIFICATION_ENABLED: 'notification_enabled',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  APP_LOCK_ENABLED: 'app_lock_enabled',
  DEVELOPER_MODE: 'developer_mode',
} as const;
