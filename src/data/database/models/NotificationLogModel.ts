import {Model} from '@nozbe/watermelondb';
import {field, readonly, date} from '@nozbe/watermelondb/decorators';

export default class NotificationLogModel extends Model {
  static table = 'notification_logs';

  @field('package_name') packageName!: string;
  @field('title') title!: string;
  @field('body') body!: string;
  @field('parsed_successfully') parsedSuccessfully!: boolean;
  @field('parse_result') parseResult!: string;
  @field('transaction_id') transactionId!: string;
  @field('received_at') receivedAt!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
