import {Model, Relation} from '@nozbe/watermelondb';
import {date, field, readonly, relation} from '@nozbe/watermelondb/decorators';
import type CategoryModel from './CategoryModel';

export default class BillReminderModel extends Model {
  static table = 'bill_reminders';
  static associations = {
    categories: {type: 'belongs_to' as const, key: 'category_id'},
  } as const;

  @field('name') name!: string;
  @field('amount') amount!: number;
  @field('currency') currency!: string;
  @field('due_date') dueDate!: number;
  @field('recurrence') recurrence!: string;
  @field('category_id') categoryId!: string;
  @field('wallet_id') walletId!: string;
  @field('is_paid') isPaid!: boolean;
  @field('paid_transaction_id') paidTransactionId!: string | null;
  @field('remind_days_before') remindDaysBefore!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('categories', 'category_id') category!: Relation<CategoryModel>;
}
