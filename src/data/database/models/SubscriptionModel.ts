import {Model, Relation} from '@nozbe/watermelondb';
import {date, field, readonly, relation} from '@nozbe/watermelondb/decorators';
import type CategoryModel from './CategoryModel';

export default class SubscriptionModel extends Model {
  static table = 'subscriptions';
  static associations = {
    categories: {type: 'belongs_to' as const, key: 'category_id'},
  } as const;

  @field('name') name!: string;
  @field('amount') amount!: number;
  @field('currency') currency!: string;
  @field('billing_cycle') billingCycle!: string;
  @field('next_due_date') nextDueDate!: number;
  @field('category_id') categoryId!: string;
  @field('is_active') isActive!: boolean;
  @field('cancelled_at') cancelledAt!: number | null;
  @field('icon') icon!: string;
  @field('color') color!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('categories', 'category_id') category!: Relation<CategoryModel>;
}
