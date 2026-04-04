import {Model} from '@nozbe/watermelondb';
import {field, readonly, date} from '@nozbe/watermelondb/decorators';

export default class TransactionTemplateModel extends Model {
  static table = 'transaction_templates';

  @field('name') name!: string;
  @field('amount') amount!: number;
  @field('currency') currency!: string;
  @field('type') type!: string;
  @field('category_id') categoryId!: string;
  @field('description') description!: string;
  @field('merchant') merchant!: string;
  @field('usage_count') usageCount!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
