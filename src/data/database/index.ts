import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import migrations from './migrations';
import WalletModel from './models/WalletModel';
import TransactionModel from './models/TransactionModel';
import CategoryModel from './models/CategoryModel';
import BudgetModel from './models/BudgetModel';
import GoalModel from './models/GoalModel';
import SubscriptionModel from './models/SubscriptionModel';
import BillReminderModel from './models/BillReminderModel';
import FxRateModel from './models/FxRateModel';
import NotificationLogModel from './models/NotificationLogModel';
import ParsingRuleModel from './models/ParsingRuleModel';
import TagModel from './models/TagModel';
import TransactionTemplateModel from './models/TransactionTemplateModel';
import AppSettingsModel from './models/AppSettingsModel';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
  onSetUpError: (error) => {
    console.error('WatermelonDB setup failed:', error);
  },
});

const database = new Database({
  adapter,
  modelClasses: [
    WalletModel,
    TransactionModel,
    CategoryModel,
    BudgetModel,
    GoalModel,
    SubscriptionModel,
    BillReminderModel,
    FxRateModel,
    NotificationLogModel,
    ParsingRuleModel,
    TagModel,
    TransactionTemplateModel,
    AppSettingsModel,
  ],
});

export default database;
