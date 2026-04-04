import database from '@data/database';
import {TransactionRepository} from '@data/repositories/TransactionRepository';
import {WalletRepository} from '@data/repositories/WalletRepository';
import {CategoryRepository} from '@data/repositories/CategoryRepository';
import {BudgetRepository} from '@data/repositories/BudgetRepository';
import {GoalRepository} from '@data/repositories/GoalRepository';
import {FxRateRepository} from '@data/repositories/FxRateRepository';
import {NotificationLogRepository} from '@data/repositories/NotificationLogRepository';
import {SettingsRepository} from '@data/repositories/SettingsRepository';

import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';
import type {IGoalRepository} from '@domain/repositories/IGoalRepository';
import type {IFxRateRepository} from '@domain/repositories/IFxRateRepository';
import type {INotificationLogRepository} from '@domain/repositories/INotificationLogRepository';
import type {ISettingsRepository} from '@domain/repositories/ISettingsRepository';

export type LocalDataSource = {
  transactions: ITransactionRepository;
  wallets: IWalletRepository;
  categories: ICategoryRepository;
  budgets: IBudgetRepository;
  goals: IGoalRepository;
  fxRates: IFxRateRepository;
  notificationLogs: INotificationLogRepository;
  settings: ISettingsRepository;
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
      fxRates: new FxRateRepository(database),
      notificationLogs: new NotificationLogRepository(database),
      settings: new SettingsRepository(database),
    };
  }
  return instance;
}

export function resetLocalDataSource(): void {
  instance = null;
}
