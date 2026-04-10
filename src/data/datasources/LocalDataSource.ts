import database from '@data/database';
import {TransactionRepository} from '@data/repositories/TransactionRepository';
import {WalletRepository} from '@data/repositories/WalletRepository';
import {CategoryRepository} from '@data/repositories/CategoryRepository';
import {BudgetRepository} from '@data/repositories/BudgetRepository';
import {GoalRepository} from '@data/repositories/GoalRepository';
import {SubscriptionRepository} from '@data/repositories/SubscriptionRepository';
import {BillReminderRepository} from '@data/repositories/BillReminderRepository';
import {FxRateRepository} from '@data/repositories/FxRateRepository';
import {NotificationLogRepository} from '@data/repositories/NotificationLogRepository';
import {SettingsRepository} from '@data/repositories/SettingsRepository';
import {TagRepository} from '@data/repositories/TagRepository';
import {ParsingRuleRepository} from '@data/repositories/ParsingRuleRepository';
import {TransactionTemplateRepository} from '@data/repositories/TransactionTemplateRepository';

import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';
import type {IGoalRepository} from '@domain/repositories/IGoalRepository';
import type {ISubscriptionRepository} from '@domain/repositories/ISubscriptionRepository';
import type {IBillReminderRepository} from '@domain/repositories/IBillReminderRepository';
import type {IFxRateRepository} from '@domain/repositories/IFxRateRepository';
import type {INotificationLogRepository} from '@domain/repositories/INotificationLogRepository';
import type {ISettingsRepository} from '@domain/repositories/ISettingsRepository';
import type {ITagRepository} from '@domain/repositories/ITagRepository';
import type {IParsingRuleRepository} from '@domain/repositories/IParsingRuleRepository';
import type {ITransactionTemplateRepository} from '@domain/repositories/ITransactionTemplateRepository';

export type LocalDataSource = {
  transactions: ITransactionRepository;
  wallets: IWalletRepository;
  categories: ICategoryRepository;
  budgets: IBudgetRepository;
  goals: IGoalRepository;
  subscriptions: ISubscriptionRepository;
  billReminders: IBillReminderRepository;
  fxRates: IFxRateRepository;
  notificationLogs: INotificationLogRepository;
  settings: ISettingsRepository;
  tags: ITagRepository;
  parsingRules: IParsingRuleRepository;
  templates: ITransactionTemplateRepository;
};

let instance: LocalDataSource | null = null;

export function getLocalDataSource(): LocalDataSource {
  if (!instance) {
    instance = {
      transactions: new TransactionRepository(database),
      wallets: new WalletRepository(database),
      categories: new CategoryRepository(database),
      budgets: new BudgetRepository(database),
      goals: new GoalRepository(database),
      subscriptions: new SubscriptionRepository(database),
      billReminders: new BillReminderRepository(database),
      fxRates: new FxRateRepository(database),
      notificationLogs: new NotificationLogRepository(database),
      settings: new SettingsRepository(database),
      tags: new TagRepository(database),
      parsingRules: new ParsingRuleRepository(database),
      templates: new TransactionTemplateRepository(database),
    };
  }
  return instance;
}

export function resetLocalDataSource(): void {
  instance = null;
}
