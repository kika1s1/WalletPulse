import {Model} from '@nozbe/watermelondb';
import {field, readonly, date} from '@nozbe/watermelondb/decorators';

export default class TagModel extends Model {
  static table = 'tags';

  @field('name') name!: string;
  @field('color') color!: string;
  @field('usage_count') usageCount!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
