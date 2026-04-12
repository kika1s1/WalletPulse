import type {Tier} from '@domain/entities/Entitlement';

export type PaywallTrigger = {
  id: string;
  type: 'soft' | 'hard';
  title: string;
  description: string;
  targetTier: Tier;
  screen: string;
  feature: string;
};

type TriggerContext = Record<string, unknown>;

type TriggerEvent =
  | 'wallet_limit_reached'
  | 'parser_limit_reached'
  | 'budget_limit_reached'
  | 'history_limit_reached'
  | 'export_attempted'
  | 'dark_mode_attempted'
  | 'custom_category_attempted'
  | 'month_end';

const TRIGGER_MAP: Record<TriggerEvent, (ctx: TriggerContext) => PaywallTrigger> = {
  wallet_limit_reached: (ctx) => ({
    id: 'wallet_limit',
    type: 'hard',
    title: `You have reached the ${ctx.limit ?? 2}-wallet limit`,
    description:
      'Upgrade to Pro for unlimited wallets across all your financial accounts.',
    targetTier: 'pro',
    screen: 'Paywall',
    feature: 'maxWallets',
  }),

  parser_limit_reached: () => ({
    id: 'parser_limit',
    type: 'hard',
    title: 'Free plan supports 1 banking app',
    description:
      'Upgrade to Pro to track all your financial apps automatically.',
    targetTier: 'pro',
    screen: 'Paywall',
    feature: 'maxParserApps',
  }),

  budget_limit_reached: (ctx) => ({
    id: 'budget_limit',
    type: 'hard',
    title: `You have reached the ${ctx.limit ?? 1}-budget limit`,
    description:
      'Unlock unlimited budgets with Pro to track spending across all categories.',
    targetTier: 'pro',
    screen: 'Paywall',
    feature: 'maxBudgets',
  }),

  history_limit_reached: () => ({
    id: 'history_limit',
    type: 'hard',
    title: 'Full history requires Pro',
    description:
      'See your complete financial history with Pro. Free plan shows the current month only.',
    targetTier: 'pro',
    screen: 'Paywall',
    feature: 'historyMonths',
  }),

  export_attempted: () => ({
    id: 'export_gate',
    type: 'hard',
    title: 'Export is a Pro feature',
    description:
      'Export your transactions as CSV, JSON, or PDF with Pro.',
    targetTier: 'pro',
    screen: 'Paywall',
    feature: 'export',
  }),

  dark_mode_attempted: () => ({
    id: 'dark_mode_gate',
    type: 'soft',
    title: 'Dark Mode is a Pro feature',
    description:
      'Unlock dark mode and system theme support with Pro.',
    targetTier: 'pro',
    screen: 'Paywall',
    feature: 'darkMode',
  }),

  custom_category_attempted: () => ({
    id: 'custom_category_gate',
    type: 'hard',
    title: 'Custom categories require Pro',
    description:
      'Create your own categories to organize transactions your way.',
    targetTier: 'pro',
    screen: 'Paywall',
    feature: 'customCategories',
  }),

  month_end: () => ({
    id: 'month_end_nudge',
    type: 'soft',
    title: 'Your monthly spending report is ready',
    description:
      'Pro users get a full Spending Autopsy with savings tips every month.',
    targetTier: 'pro',
    screen: 'Paywall',
    feature: 'spendingAutopsy',
  }),
};

export class CheckPaywallTrigger {
  shouldTrigger(
    event: string,
    context: TriggerContext = {},
  ): PaywallTrigger | null {
    const builder = TRIGGER_MAP[event as TriggerEvent];
    if (!builder) {
      return null;
    }
    return builder(context);
  }
}
