import type {Tier} from '@domain/entities/Entitlement';

export type PaywallViewedEvent = {
  type: 'paywall_viewed';
  source: string;
  tier: Tier;
  timestamp: number;
};

export type PaywallDismissedEvent = {
  type: 'paywall_dismissed';
  source: string;
  duration: number;
  timestamp: number;
};

export type TrialStartedEvent = {
  type: 'trial_started';
  tier: Tier;
  timestamp: number;
};

export type PurchaseCompletedEvent = {
  type: 'purchase_completed';
  productId: string;
  price: number;
  tier: Tier;
  timestamp: number;
};

export type PurchaseFailedEvent = {
  type: 'purchase_failed';
  productId: string;
  error: string;
  timestamp: number;
};

export type FeatureGateHitEvent = {
  type: 'feature_gate_hit';
  feature: string;
  currentTier: Tier;
  timestamp: number;
};

export type UpgradePromptShownEvent = {
  type: 'upgrade_prompt_shown';
  trigger: string;
  screen: string;
  timestamp: number;
};

export type UpgradePromptDismissedEvent = {
  type: 'upgrade_prompt_dismissed';
  trigger: string;
  timestamp: number;
};

export type AffiliateClickedEvent = {
  type: 'affiliate_clicked';
  partnerId: string;
  timestamp: number;
};

export type WinbackShownEvent = {
  type: 'winback_shown';
  offerId: string;
  timestamp: number;
};

export type WinbackAcceptedEvent = {
  type: 'winback_accepted';
  offerId: string;
  timestamp: number;
};

export type TrialReminderSentEvent = {
  type: 'trial_reminder_sent';
  day: number;
  timestamp: number;
};

export type MonetizationEvent =
  | PaywallViewedEvent
  | PaywallDismissedEvent
  | TrialStartedEvent
  | PurchaseCompletedEvent
  | PurchaseFailedEvent
  | FeatureGateHitEvent
  | UpgradePromptShownEvent
  | UpgradePromptDismissedEvent
  | AffiliateClickedEvent
  | WinbackShownEvent
  | WinbackAcceptedEvent
  | TrialReminderSentEvent;
