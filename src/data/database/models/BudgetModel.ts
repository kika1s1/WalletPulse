import {Model, Relation} from '@nozbe/watermelondb';
import {date, field, readonly, relation} from '@nozbe/watermelondb/decorators';
import type CategoryModel from './CategoryModel';

export default class BudgetModel extends Model {
  static table = 'budgets';
  static associations = {
    categories: {type: 'belongs_to' as const, key: 'category_id'},
  } as const;

  @field('category_id') categoryId!: string | null;
  @field('amount') amount!: number;
  @field('currency') currency!: string;
  @field('period') period!: string;
  @field('start_date') startDate!: number;
  @field('end_date') endDate!: number;
  @field('rollover') rollover!: boolean;
  @field('is_active') isActive!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('categories', 'category_id') category!: Relation<CategoryModel>;
}
