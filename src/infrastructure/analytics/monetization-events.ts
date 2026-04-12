import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Tier} from '@domain/entities/Entitlement';
import type {MonetizationEvent} from './analytics-types';

const STORAGE_KEY = '@walletpulse/monetization_events';
const MAX_EVENTS = 500;

export class MonetizationAnalytics {
  private buffer: MonetizationEvent[] = [];
  private flushing = false;

  private async append(event: MonetizationEvent): Promise<void> {
    this.buffer.push(event);
    if (!this.flushing) {
      this.flushing = true;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const existing: MonetizationEvent[] = raw ? JSON.parse(raw) : [];
        const merged = [...existing, ...this.buffer].slice(-MAX_EVENTS);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        this.buffer = [];
      } catch {
        // Events will be retried on next append
      } finally {
        this.flushing = false;
      }
    }
  }

  async trackPaywallViewed(source: string, tier: Tier): Promise<void> {
    await this.append({type: 'paywall_viewed', source, tier, timestamp: Date.now()});
  }

  async trackPaywallDismissed(source: string, duration: number): Promise<void> {
    await this.append({type: 'paywall_dismissed', source, duration, timestamp: Date.now()});
  }

  async trackTrialStarted(tier: Tier): Promise<void> {
    await this.append({type: 'trial_started', tier, timestamp: Date.now()});
  }

  async trackPurchaseCompleted(productId: string, price: number, tier: Tier): Promise<void> {
    await this.append({type: 'purchase_completed', productId, price, tier, timestamp: Date.now()});
  }

  async trackPurchaseFailed(productId: string, error: string): Promise<void> {
    await this.append({type: 'purchase_failed', productId, error, timestamp: Date.now()});
  }

  async trackFeatureGateHit(feature: string, currentTier: Tier): Promise<void> {
    await this.append({type: 'feature_gate_hit', feature, currentTier, timestamp: Date.now()});
  }

  async trackUpgradePromptShown(trigger: string, screen: string): Promise<void> {
    await this.append({type: 'upgrade_prompt_shown', trigger, screen, timestamp: Date.now()});
  }

  async trackUpgradePromptDismissed(trigger: string): Promise<void> {
    await this.append({type: 'upgrade_prompt_dismissed', trigger, timestamp: Date.now()});
  }

  async trackAffiliateClicked(partnerId: string): Promise<void> {
    await this.append({type: 'affiliate_clicked', partnerId, timestamp: Date.now()});
  }

  async trackWinbackShown(offerId: string): Promise<void> {
    await this.append({type: 'winback_shown', offerId, timestamp: Date.now()});
  }

  async trackWinbackAccepted(offerId: string): Promise<void> {
    await this.append({type: 'winback_accepted', offerId, timestamp: Date.now()});
  }

  async trackTrialReminderSent(day: number): Promise<void> {
    await this.append({type: 'trial_reminder_sent', day, timestamp: Date.now()});
  }

  async getEvents(): Promise<MonetizationEvent[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async clearEvents(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    this.buffer = [];
  }
}

export const monetizationAnalytics = new MonetizationAnalytics();
