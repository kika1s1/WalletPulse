import {Model, Query} from '@nozbe/watermelondb';
import {children, date, field, readonly} from '@nozbe/watermelondb/decorators';
import type BillReminderModel from './BillReminderModel';
import type BudgetModel from './BudgetModel';
import type SubscriptionModel from './SubscriptionModel';
import type TransactionModel from './TransactionModel';

export default class CategoryModel extends Model {
  static table = 'categories';
  static associations = {
    transactions: {type: 'has_many' as const, foreignKey: 'category_id'},
    budgets: {type: 'has_many' as const, foreignKey: 'category_id'},
    subscriptions: {type: 'has_many' as const, foreignKey: 'category_id'},
    bill_reminders: {type: 'has_many' as const, foreignKey: 'category_id'},
    categories: {type: 'has_many' as const, foreignKey: 'parent_id'},
  } as const;

  @field('name') name!: string;
  @field('icon') icon!: string;
  @field('color') color!: string;
  @field('type') type!: string;
  @field('parent_id') parentId!: string | null;
  @field('is_default') isDefault!: boolean;
  @field('is_archived') isArchived!: boolean;
  @field('sort_order') sortOrder!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('transactions') transactions!: Query<TransactionModel>;
  @children('budgets') budgets!: Query<BudgetModel>;
  @children('subscriptions') subscriptions!: Query<SubscriptionModel>;
  @children('bill_reminders') billReminders!: Query<BillReminderModel>;
  @children('categories') subcategories!: Query<CategoryModel>;
}
