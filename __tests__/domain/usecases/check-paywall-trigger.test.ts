import {CheckPaywallTrigger} from '@domain/usecases/check-paywall-trigger';

describe('CheckPaywallTrigger', () => {
  const checker = new CheckPaywallTrigger();

  describe('wallet_limit_reached', () => {
    it('returns a hard trigger targeting pro', () => {
      const trigger = checker.shouldTrigger('wallet_limit_reached', {limit: 2});
      expect(trigger).not.toBeNull();
      expect(trigger!.type).toBe('hard');
      expect(trigger!.targetTier).toBe('pro');
      expect(trigger!.feature).toBe('maxWallets');
      expect(trigger!.title).toContain('2-wallet limit');
    });
  });

  describe('parser_limit_reached', () => {
    it('returns a hard trigger for parser apps', () => {
      const trigger = checker.shouldTrigger('parser_limit_reached');
      expect(trigger).not.toBeNull();
      expect(trigger!.type).toBe('hard');
      expect(trigger!.targetTier).toBe('pro');
      expect(trigger!.feature).toBe('maxParserApps');
    });
  });

  describe('budget_limit_reached', () => {
    it('returns a hard trigger for budgets', () => {
      const trigger = checker.shouldTrigger('budget_limit_reached', {limit: 1});
      expect(trigger).not.toBeNull();
      expect(trigger!.type).toBe('hard');
      expect(trigger!.title).toContain('1-budget limit');
      expect(trigger!.feature).toBe('maxBudgets');
    });
  });

  describe('history_limit_reached', () => {
    it('returns a hard trigger for history', () => {
      const trigger = checker.shouldTrigger('history_limit_reached');
      expect(trigger).not.toBeNull();
      expect(trigger!.type).toBe('hard');
      expect(trigger!.feature).toBe('historyMonths');
    });
  });

  describe('export_attempted', () => {
    it('returns a hard trigger for export', () => {
      const trigger = checker.shouldTrigger('export_attempted');
      expect(trigger).not.toBeNull();
      expect(trigger!.type).toBe('hard');
      expect(trigger!.feature).toBe('export');
    });
  });

  describe('dark_mode_attempted', () => {
    it('returns a soft trigger for dark mode', () => {
      const trigger = checker.shouldTrigger('dark_mode_attempted');
      expect(trigger).not.toBeNull();
      expect(trigger!.type).toBe('soft');
      expect(trigger!.feature).toBe('darkMode');
    });
  });

  describe('custom_category_attempted', () => {
    it('returns a hard trigger for custom categories', () => {
      const trigger = checker.shouldTrigger('custom_category_attempted');
      expect(trigger).not.toBeNull();
      expect(trigger!.type).toBe('hard');
      expect(trigger!.feature).toBe('customCategories');
    });
  });

  describe('month_end', () => {
    it('returns a soft trigger for month end nudge', () => {
      const trigger = checker.shouldTrigger('month_end');
      expect(trigger).not.toBeNull();
      expect(trigger!.type).toBe('soft');
      expect(trigger!.feature).toBe('spendingAutopsy');
      expect(trigger!.targetTier).toBe('pro');
    });
  });

  describe('unknown event', () => {
    it('returns null for unrecognized events', () => {
      expect(checker.shouldTrigger('unknown_event')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(checker.shouldTrigger('')).toBeNull();
    });
  });

  describe('all triggers have required fields', () => {
    const events = [
      'wallet_limit_reached',
      'parser_limit_reached',
      'budget_limit_reached',
      'history_limit_reached',
      'export_attempted',
      'dark_mode_attempted',
      'custom_category_attempted',
      'month_end',
    ];

    for (const event of events) {
      it(`${event} has id, type, title, description, targetTier, screen, feature`, () => {
        const trigger = checker.shouldTrigger(event);
        expect(trigger).not.toBeNull();
        expect(trigger!.id).toBeTruthy();
        expect(['soft', 'hard']).toContain(trigger!.type);
        expect(trigger!.title.length).toBeGreaterThan(0);
        expect(trigger!.description.length).toBeGreaterThan(0);
        expect(trigger!.targetTier).toBeTruthy();
        expect(trigger!.screen).toBeTruthy();
        expect(trigger!.feature).toBeTruthy();
      });
    }
  });
});
