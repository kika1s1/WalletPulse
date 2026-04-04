import {Model} from '@nozbe/watermelondb';
import {field, readonly, date} from '@nozbe/watermelondb/decorators';

export default class FxRateModel extends Model {
  static table = 'fx_rates';

  @field('base_currency') baseCurrency!: string;
  @field('target_currency') targetCurrency!: string;
  @field('rate') rate!: number;
  @field('fetched_at') fetchedAt!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
