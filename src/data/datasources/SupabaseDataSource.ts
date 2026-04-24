import {getSupabaseClient} from './supabase-client';
import {TransactionRepository} from '@data/repositories/TransactionRepository';
import {WalletRepository} from '@data/repositories/WalletRepository';
import {CategoryRepository} from '@data/repositories/CategoryRepository';
import {BudgetRepository} from '@data/repositories/BudgetRepository';
import {GoalRepository} from '@data/repositories/GoalRepository';
import {SubscriptionRepository} from '@data/repositories/SubscriptionRepository';
import {BillReminderRepository} from '@data/repositories/BillReminderRepository';
import {RecurringScheduleRepository} from '@data/repositories/RecurringScheduleRepository';
import {FxRateRepository} from '@data/repositories/FxRateRepository';
import {NotificationLogRepository} from '@data/repositories/NotificationLogRepository';
import {SettingsRepository} from '@data/repositories/SettingsRepository';
import {TagRepository} from '@data/repositories/TagRepository';
import {ParsingRuleRepository} from '@data/repositories/ParsingRuleRepository';
import {TransactionTemplateRepository} from '@data/repositories/TransactionTemplateRepository';
import {UniversalSearchRepository} from '@data/repositories/UniversalSearchRepository';

import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';
import type {IGoalRepository} from '@domain/repositories/IGoalRepository';
import type {ISubscriptionRepository} from '@domain/repositories/ISubscriptionRepository';
import type {IBillReminderRepository} from '@domain/repositories/IBillReminderRepository';
import type {IRecurringScheduleRepository} from '@domain/repositories/IRecurringScheduleRepository';
import type {IFxRateRepository} from '@domain/repositories/IFxRateRepository';
import type {INotificationLogRepository} from '@domain/repositories/INotificationLogRepository';
import type {ISettingsRepository} from '@domain/repositories/ISettingsRepository';
import type {ITagRepository} from '@domain/repositories/ITagRepository';
import type {IParsingRuleRepository} from '@domain/repositories/IParsingRuleRepository';
import type {ITransactionTemplateRepository} from '@domain/repositories/ITransactionTemplateRepository';

export type SupabaseDataSource = {
  transactions: ITransactionRepository;
  wallets: IWalletRepository;
  categories: ICategoryRepository;
  budgets: IBudgetRepository;
  goals: IGoalRepository;
  subscriptions: ISubscriptionRepository;
  billReminders: IBillReminderRepository;
  recurringSchedules: IRecurringScheduleRepository;
  fxRates: IFxRateRepository;
  notificationLogs: INotificationLogRepository;
  settings: ISettingsRepository;
  tags: ITagRepository;
  parsingRules: IParsingRuleRepository;
  templates: ITransactionTemplateRepository;
  // Concrete class (no interface yet) because the RPC is the only
  // implementation and the shape is tied to server behaviour.
  search: UniversalSearchRepository;
};

let cachedUserId: string | null = null;
let instance: SupabaseDataSource | null = null;

export function isDataSourceReady(): boolean {
  return instance !== null && cachedUserId !== null;
}

export function getSupabaseDataSource(userId?: string): SupabaseDataSource {
  const uid = userId ?? cachedUserId;
  if (!uid) {
    throw new Error('getSupabaseDataSource requires a userId on first call');
  }

  if (instance && cachedUserId === uid) {
    return instance;
  }

  const supabase = getSupabaseClient();
  cachedUserId = uid;

  instance = {
    transactions: new TransactionRepository(supabase, uid),
    wallets: new WalletRepository(supabase, uid),
    categories: new CategoryRepository(supabase, uid),
    budgets: new BudgetRepository(supabase, uid),
    goals: new GoalRepository(supabase, uid),
    subscriptions: new SubscriptionRepository(supabase, uid),
    billReminders: new BillReminderRepository(supabase, uid),
    recurringSchedules: new RecurringScheduleRepository(supabase, uid),
    fxRates: new FxRateRepository(supabase),
    notificationLogs: new NotificationLogRepository(supabase, uid),
    settings: new SettingsRepository(supabase, uid),
    tags: new TagRepository(supabase, uid),
    parsingRules: new ParsingRuleRepository(supabase, uid),
    templates: new TransactionTemplateRepository(supabase, uid),
    search: new UniversalSearchRepository(supabase),
  };

  return instance;
}

export function resetSupabaseDataSource(): void {
  instance = null;
  cachedUserId = null;
}
