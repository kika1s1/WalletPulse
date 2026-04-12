import {TIER_LIMITS, getTierLimits} from '@domain/entities/tier-config';
import type {FeatureLimits, Tier} from '@domain/entities/Entitlement';

describe('Tier configuration', () => {
  describe('TIER_LIMITS', () => {
    it('defines all four tiers', () => {
      expect(Object.keys(TIER_LIMITS).sort()).toEqual([
        'business',
        'free',
        'lifetime',
        'pro',
      ]);
    });
  });

  describe('Free tier', () => {
    const free = TIER_LIMITS.free;

    it('restricts numeric limits', () => {
      expect(free.maxWallets).toBe(2);
      expect(free.maxBudgets).toBe(1);
      expect(free.maxParserApps).toBe(1);
      expect(free.historyMonths).toBe(6);
    });

    it('disables all Pro boolean features', () => {
      expect(free.customCategories).toBe(false);
      expect(free.export).toBe(false);
      expect(free.darkMode).toBe(false);
      expect(free.biometricLock).toBe(false);
      expect(free.encryption).toBe(false);
      expect(free.goals).toBe(false);
      expect(free.subscriptionTracking).toBe(false);
      expect(free.billReminders).toBe(false);
      expect(free.templates).toBe(false);
      expect(free.receipts).toBe(false);
      expect(free.tags).toBe(false);
      expect(free.savedFilters).toBe(false);
      expect(free.financialHealthScore).toBe(false);
      expect(free.paydayPlanner).toBe(false);
      expect(free.spendingAutopsy).toBe(false);
    });

    it('disables backup and sets insights to basic', () => {
      expect(free.backup).toBe(false);
      expect(free.insights).toBe('basic');
    });

    it('disables all Business features', () => {
      expect(free.multiProfile).toBe(false);
      expect(free.taxCategories).toBe(false);
      expect(free.taxEstimate).toBe(false);
      expect(free.invoiceTracking).toBe(false);
      expect(free.profitLoss).toBe(false);
      expect(free.clientExpenses).toBe(false);
      expect(free.professionalReports).toBe(false);
      expect(free.googleDriveBackup).toBe(false);
      expect(free.scheduledExports).toBe(false);
      expect(free.currencyGainLoss).toBe(false);
      expect(free.spendingPredictions).toBe(false);
      expect(free.customParsers).toBe(false);
      expect(free.homeWidgets).toBe(false);
      expect(free.splitExpenses).toBe(false);
      expect(free.moneyLostTracker).toBe(false);
      expect(free.currencyTimingAdvisor).toBe(false);
      expect(free.freelancerDashboard).toBe(false);
      expect(free.billNegotiationAlerts).toBe(false);
    });
  });

  describe('Pro tier', () => {
    const pro = TIER_LIMITS.pro;

    it('has unlimited numeric limits', () => {
      expect(pro.maxWallets).toBe(Infinity);
      expect(pro.maxBudgets).toBe(Infinity);
      expect(pro.maxParserApps).toBe(Infinity);
      expect(pro.historyMonths).toBe(Infinity);
    });

    it('enables all Pro boolean features', () => {
      expect(pro.customCategories).toBe(true);
      expect(pro.export).toBe(true);
      expect(pro.darkMode).toBe(true);
      expect(pro.biometricLock).toBe(true);
      expect(pro.encryption).toBe(true);
      expect(pro.goals).toBe(true);
      expect(pro.subscriptionTracking).toBe(true);
      expect(pro.billReminders).toBe(true);
      expect(pro.templates).toBe(true);
      expect(pro.receipts).toBe(true);
      expect(pro.tags).toBe(true);
      expect(pro.savedFilters).toBe(true);
      expect(pro.financialHealthScore).toBe(true);
      expect(pro.paydayPlanner).toBe(true);
      expect(pro.spendingAutopsy).toBe(true);
    });

    it('sets backup to local and insights to full', () => {
      expect(pro.backup).toBe('local');
      expect(pro.insights).toBe('full');
    });

    it('does NOT enable Business-only features', () => {
      expect(pro.multiProfile).toBe(false);
      expect(pro.taxCategories).toBe(false);
      expect(pro.taxEstimate).toBe(false);
      expect(pro.invoiceTracking).toBe(false);
      expect(pro.profitLoss).toBe(false);
      expect(pro.clientExpenses).toBe(false);
      expect(pro.professionalReports).toBe(false);
      expect(pro.googleDriveBackup).toBe(false);
      expect(pro.scheduledExports).toBe(false);
      expect(pro.currencyGainLoss).toBe(true);
      expect(pro.spendingPredictions).toBe(false);
      expect(pro.customParsers).toBe(false);
      expect(pro.homeWidgets).toBe(false);
      expect(pro.splitExpenses).toBe(false);
      expect(pro.moneyLostTracker).toBe(true);
      expect(pro.currencyTimingAdvisor).toBe(true);
      expect(pro.freelancerDashboard).toBe(false);
      expect(pro.billNegotiationAlerts).toBe(false);
    });
  });

  describe('Business tier', () => {
    const biz = TIER_LIMITS.business;

    it('includes all Pro numeric limits', () => {
      expect(biz.maxWallets).toBe(Infinity);
      expect(biz.maxBudgets).toBe(Infinity);
      expect(biz.maxParserApps).toBe(Infinity);
      expect(biz.historyMonths).toBe(Infinity);
    });

    it('includes all Pro boolean features', () => {
      expect(biz.customCategories).toBe(true);
      expect(biz.export).toBe(true);
      expect(biz.darkMode).toBe(true);
      expect(biz.biometricLock).toBe(true);
      expect(biz.encryption).toBe(true);
      expect(biz.goals).toBe(true);
      expect(biz.subscriptionTracking).toBe(true);
      expect(biz.billReminders).toBe(true);
      expect(biz.templates).toBe(true);
      expect(biz.receipts).toBe(true);
      expect(biz.tags).toBe(true);
      expect(biz.savedFilters).toBe(true);
      expect(biz.financialHealthScore).toBe(true);
      expect(biz.paydayPlanner).toBe(true);
      expect(biz.spendingAutopsy).toBe(true);
    });

    it('has local backup upgraded to google drive', () => {
      expect(biz.backup).toBe('cloud');
      expect(biz.insights).toBe('full');
    });

    it('enables all Business-only features', () => {
      expect(biz.multiProfile).toBe(true);
      expect(biz.taxCategories).toBe(true);
      expect(biz.taxEstimate).toBe(true);
      expect(biz.invoiceTracking).toBe(true);
      expect(biz.profitLoss).toBe(true);
      expect(biz.clientExpenses).toBe(true);
      expect(biz.professionalReports).toBe(true);
      expect(biz.googleDriveBackup).toBe(true);
      expect(biz.scheduledExports).toBe(true);
      expect(biz.currencyGainLoss).toBe(true);
      expect(biz.spendingPredictions).toBe(true);
      expect(biz.customParsers).toBe(true);
      expect(biz.homeWidgets).toBe(true);
      expect(biz.splitExpenses).toBe(true);
      expect(biz.moneyLostTracker).toBe(true);
      expect(biz.currencyTimingAdvisor).toBe(true);
      expect(biz.freelancerDashboard).toBe(true);
      expect(biz.billNegotiationAlerts).toBe(true);
    });
  });

  describe('Lifetime tier', () => {
    it('matches Pro tier exactly', () => {
      expect(TIER_LIMITS.lifetime).toEqual(TIER_LIMITS.pro);
    });
  });

  describe('getTierLimits', () => {
    it('returns correct limits for each tier', () => {
      const tiers: Tier[] = ['free', 'pro', 'business', 'lifetime'];
      for (const tier of tiers) {
        expect(getTierLimits(tier)).toEqual(TIER_LIMITS[tier]);
      }
    });

    it('returns a copy so mutations do not affect the original', () => {
      const limits = getTierLimits('free');
      limits.maxWallets = 999;
      expect(TIER_LIMITS.free.maxWallets).toBe(2);
    });
  });
});
