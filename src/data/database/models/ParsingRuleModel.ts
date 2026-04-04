import {Model} from '@nozbe/watermelondb';
import {field, readonly, date} from '@nozbe/watermelondb/decorators';

export default class ParsingRuleModel extends Model {
  static table = 'parsing_rules';

  @field('source_app') sourceApp!: string;
  @field('package_name') packageName!: string;
  @field('rule_name') ruleName!: string;
  @field('pattern') pattern!: string;
  @field('transaction_type') transactionType!: string;
  @field('is_active') isActive!: boolean;
  @field('priority') priority!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
