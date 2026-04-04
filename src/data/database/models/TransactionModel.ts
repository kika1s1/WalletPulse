import {Model, Relation} from '@nozbe/watermelondb';
import {date, field, readonly, relation} from '@nozbe/watermelondb/decorators';
import type CategoryModel from './CategoryModel';
import type WalletModel from './WalletModel';

export default class TransactionModel extends Model {
  static table = 'transactions';
  static associations = {
    wallets: {type: 'belongs_to' as const, key: 'wallet_id'},
    categories: {type: 'belongs_to' as const, key: 'category_id'},
  } as const;

  @field('wallet_id') walletId!: string;
  @field('category_id') categoryId!: string;
  @field('amount') amount!: number;
  @field('currency') currency!: string;
  @field('type') type!: string;
  @field('description') description!: string;
  @field('merchant') merchant!: string;
  @field('source') source!: string;
  @field('source_hash') sourceHash!: string;
  @field('tags') tags!: string;
  @field('receipt_uri') receiptUri!: string;
  @field('is_recurring') isRecurring!: boolean;
  @field('recurrence_rule') recurrenceRule!: string;
  @field('confidence') confidence!: number;
  @field('location_lat') locationLat!: number | null;
  @field('location_lng') locationLng!: number | null;
  @field('location_name') locationName!: string | null;
  @field('notes') notes!: string;
  @field('is_template') isTemplate!: boolean;
  @field('template_name') templateName!: string;
  @field('transaction_date') transactionDate!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('wallets', 'wallet_id') wallet!: Relation<WalletModel>;
  @relation('categories', 'category_id') category!: Relation<CategoryModel>;
}
