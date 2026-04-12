/**
 * Integration tests verifying monetization layers work together:
 * - Entitlement / tier system (Phase A)
 * - Paywall triggers (Phase F)
 * - Feature gating with tier limits (Phase E)
 * - IAP product registry + ownership (Phase H)
 * - Premium domain features: Health Score, Payday Planner, Spending Autopsy,
 *   Money Lost, Currency Timing (Phase G)
 */

import {getTierLimits} from '@domain/entities/tier-config';
import {createEntitlement} from '@domain/entities/Entitlement';
import {CheckPaywallTrigger} from '@domain/usecases/check-paywall-trigger';
import {CalculateHealthScore} from '@domain/usecases/calculate-health-score';
import {CalculatePaydayPlan} from '@domain/usecases/calculate-payday-plan';
import {GenerateSpendingAutopsy} from '@domain/usecases/generate-spending-autopsy';
import {CalculateMoneyLost} from '@domain/usecases/calculate-money-lost';
import {AnalyzeCurrencyTiming} from '@domain/usecases/analyze-currency-timing';
import {
  IAP_PRODUCTS,
  PARSER_PACKS,
  THEME_PACKS,
  getIAPProduct,
  getProductsByCategory,
} from '@shared/constants/iap-products';

describe('Monetization Integration', () => {
  describe('Tier system gates features correctly', () => {
    it('free tier blocks premium features', () => {
      const limits = getTierLimits('free');
      expect(limits.maxWallets).toBe(2);
      expect(limits.maxBudgets).toBe(1);
      expect(limits.export).toBe(false);
      expect(limits.financialHealthScore).toBe(false);
      expect(limits.paydayPlanner).toBe(false);
      expect(limits.spendingAutopsy).toBe(false);
    });

    it('pro tier unlocks all standard premium features', () => {
      const limits = getTierLimits('pro');
      expect(limits.maxWallets).toBe(Infinity);
      expect(limits.maxBudgets).toBe(Infinity);
      expect(limits.export).toBe(true);
      expect(limits.financialHealthScore).toBe(true);
      expect(limits.paydayPlanner).toBe(true);
      expect(limits.spendingAutopsy).toBe(true);
    });

    it('lifetime tier matches pro features', () => {
      const pro = getTierLimits('pro');
      const lifetime = getTierLimits('lifetime');
      expect(lifetime.maxWallets).toBe(pro.maxWallets);
      expect(lifetime.export).toBe(pro.export);
      expect(lifetime.financialHealthScore).toBe(pro.financialHealthScore);
    });

    it('createEntitlement wires tier limits correctly', () => {
      const proLimits = getTierLimits('pro');
      const ent = createEntitlement({
        id: 'ent-pro-test',
        tier: 'pro',
        featureLimits: proLimits,
        isTrialing: false,
        trialEndsAt: null,
        expiresAt: null,
        purchasedAt: Date.now(),
      });
      expect(ent.featureLimits.paydayPlanner).toBe(true);
      expect(ent.featureLimits.spendingAutopsy).toBe(true);
      expect(ent.tier).toBe('pro');
    });
  });

  describe('Paywall triggers fire for correct events', () => {
    const trigger = new CheckPaywallTrigger();

    it('wallet limit triggers hard gate with correct feature key', () => {
      const result = trigger.shouldTrigger('wallet_limit_reached', {limit: 2});
      expect(result).not.toBeNull();
      expect(result!.type).toBe('hard');
      expect(result!.feature).toBe('maxWallets');
      expect(result!.targetTier).toBe('pro');
    });

    it('export trigger matches the export feature gate', () => {
      const result = trigger.shouldTrigger('export_attempted');
      expect(result).not.toBeNull();
      expect(result!.feature).toBe('export');
      const freeLimits = getTierLimits('free');
      expect(freeLimits.export).toBe(false);
      const proLimits = getTierLimits('pro');
      expect(proLimits.export).toBe(true);
    });

    it('month_end soft trigger links to spending autopsy', () => {
      const result = trigger.shouldTrigger('month_end');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('soft');
      expect(result!.feature).toBe('spendingAutopsy');
    });
  });

  describe('Premium features produce valid output', () => {
    it('Health Score integrates with tier limits', () => {
      const calc = new CalculateHealthScore();
      const result = calc.execute({
        totalIncome: 500_000,
        totalExpenses: 300_000,
        budgetAdherencePercent: 80,
        billsOnTimePercent: 90,
        activeSubscriptionCount: 3,
        usedSubscriptionCount: 3,
        emergencyFundProgress: 50,
        previousPeriodExpenses: 350_000,
      });

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.factors).toHaveLength(6);
      expect(result.grade).toMatch(/^[A-F]$/);

      const freeLimits = getTierLimits('free');
      expect(freeLimits.financialHealthScore).toBe(false);
    });

    it('Payday Planner produces actionable spending plan', () => {
      const calc = new CalculatePaydayPlan();
      const now = Date.now();
      const result = calc.execute({
        incomeAmount: 400_000,
        incomeCurrency: 'USD',
        upcomingBills: [
          {name: 'Rent', amount: 120_000, currency: 'USD', dueDate: now + 7 * 86_400_000},
        ],
        activeBudgets: [
          {name: 'Food', remaining: 30_000, currency: 'USD'},
        ],
        currentWalletBalance: 50_000,
        nextPaydayDate: now + 30 * 86_400_000,
      });

      expect(result.availableToSpend).toBe(300_000);
      expect(result.upcomingBillsTotal).toBe(120_000);
      expect(result.budgetCommitmentsTotal).toBe(30_000);
      expect(result.safeDaily).toBeGreaterThan(0);
      expect(result.nextBillName).toBe('Rent');
    });

    it('Spending Autopsy detects overspend and links to trigger', () => {
      const now = Date.now();
      const autopsy = new GenerateSpendingAutopsy();
      const result = autopsy.execute({
        currentPeriodTransactions: [
          {amount: 100_000, categoryId: 'food', transactionDate: now, type: 'expense'},
        ],
        previousPeriodTransactions: [
          {amount: 30_000, categoryId: 'food', transactionDate: now - 30 * 86_400_000, type: 'expense'},
        ],
        categories: [{id: 'food', name: 'Food'}],
      });

      expect(result.totalSpent).toBe(100_000);
      expect(result.periodComparison.changePercent).toBeGreaterThan(0);

      const overspendInsight = result.insights.find((i) => i.type === 'overspend');
      expect(overspendInsight).toBeDefined();
      expect(overspendInsight!.category).toBe('Food');

      const trigger = new CheckPaywallTrigger();
      const monthEnd = trigger.shouldTrigger('month_end');
      expect(monthEnd!.feature).toBe('spendingAutopsy');
    });

    it('Money Lost Tracker produces source breakdown', () => {
      const calc = new CalculateMoneyLost();
      const result = calc.execute({
        transactions: [
          {
            date: Date.now(),
            amount: 100_000,
            currency: 'USD',
            appliedRate: 0.95,
            midMarketRate: 1.0,
            source: 'Payoneer',
          },
          {
            date: Date.now(),
            amount: 50_000,
            currency: 'USD',
            appliedRate: 0.97,
            midMarketRate: 1.0,
            source: 'Grey',
          },
        ],
        targetCurrency: 'USD',
      });

      expect(result.totalLost).toBeGreaterThan(0);
      expect(result.bySource).toHaveLength(2);
      expect(result.worstTransaction).not.toBeNull();
      expect(result.savingsTip.length).toBeGreaterThan(0);
    });

    it('Currency Timing Advisor produces recommendation', () => {
      const day = 86_400_000;
      const now = Date.now();
      const analyzer = new AnalyzeCurrencyTiming();
      const result = analyzer.execute({
        currencyPair: {from: 'USD', to: 'ETB'},
        historicalRates: Array.from({length: 30}, (_, i) => ({
          rate: 56.0 + i * 0.1,
          date: now - (29 - i) * day,
        })),
      });

      expect(result.currentRate).toBeGreaterThan(0);
      expect(['buy_now', 'wait', 'neutral']).toContain(result.recommendation);
      expect(['high', 'medium', 'low']).toContain(result.confidence);
      expect(['rising', 'falling', 'stable']).toContain(result.trend);
    });
  });

  describe('IAP product registry consistency', () => {
    it('all products have unique IDs', () => {
      const ids = IAP_PRODUCTS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all products have unique Google Play IDs', () => {
      const gpIds = IAP_PRODUCTS.map((p) => p.googlePlayId);
      expect(new Set(gpIds).size).toBe(gpIds.length);
    });

    it('getIAPProduct retrieves correct product', () => {
      const product = getIAPProduct('parser_international');
      expect(product).toBeDefined();
      expect(product!.category).toBe('parser_pack');
    });

    it('getProductsByCategory filters correctly', () => {
      const parsers = getProductsByCategory('parser_pack');
      expect(parsers.length).toBe(PARSER_PACKS.length);
      const themes = getProductsByCategory('theme_pack');
      expect(themes.length).toBe(THEME_PACKS.length);
    });

    it('parser and theme packs include a bundle product', () => {
      const parserBundle = PARSER_PACKS.find((p) => p.id === 'parser_allbanks');
      const themeBundle = THEME_PACKS.find((p) => p.id === 'theme_all_themes');
      expect(parserBundle).toBeDefined();
      expect(themeBundle).toBeDefined();
    });
  });

  describe('Cross-phase feature interactions', () => {
    it('free user hits wallet limit, trigger fires, pro limits unlock it', () => {
      const freeLimits = getTierLimits('free');
      expect(freeLimits.maxWallets).toBe(2);

      const trigger = new CheckPaywallTrigger();
      const result = trigger.shouldTrigger('wallet_limit_reached', {
        limit: freeLimits.maxWallets,
      });
      expect(result).not.toBeNull();
      expect(result!.type).toBe('hard');

      const proLimits = getTierLimits('pro');
      expect(proLimits.maxWallets).toBe(Infinity);
    });

    it('budget limit trigger matches tier config', () => {
      const freeLimits = getTierLimits('free');
      const trigger = new CheckPaywallTrigger();
      const result = trigger.shouldTrigger('budget_limit_reached', {
        limit: freeLimits.maxBudgets,
      });
      expect(result!.title).toContain(String(freeLimits.maxBudgets));
    });

    it('health score, payday planner, autopsy all gated behind same tier', () => {
      const freeLimits = getTierLimits('free');
      expect(freeLimits.financialHealthScore).toBe(false);
      expect(freeLimits.paydayPlanner).toBe(false);
      expect(freeLimits.spendingAutopsy).toBe(false);

      const proLimits = getTierLimits('pro');
      expect(proLimits.financialHealthScore).toBe(true);
      expect(proLimits.paydayPlanner).toBe(true);
      expect(proLimits.spendingAutopsy).toBe(true);
    });
  });
});
