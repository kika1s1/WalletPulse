import {Model, Query} from '@nozbe/watermelondb';
import {children, date, field, readonly} from '@nozbe/watermelondb/decorators';
import type TransactionModel from './TransactionModel';

export default class WalletModel extends Model {
  static table = 'wallets';
  static associations = {
    transactions: {type: 'has_many' as const, foreignKey: 'wallet_id'},
  } as const;

  @field('currency') currency!: string;
  @field('name') name!: string;
  @field('balance') balance!: number;
  @field('is_active') isActive!: boolean;
  @field('icon') icon!: string;
  @field('color') color!: string;
  @field('sort_order') sortOrder!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('transactions') transactions!: Query<TransactionModel>;
}
