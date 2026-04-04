import {Model} from '@nozbe/watermelondb';
import {date, field, readonly} from '@nozbe/watermelondb/decorators';

export default class GoalModel extends Model {
  static table = 'goals';

  @field('name') name!: string;
  @field('target_amount') targetAmount!: number;
  @field('current_amount') currentAmount!: number;
  @field('currency') currency!: string;
  @field('deadline') deadline!: number;
  @field('icon') icon!: string;
  @field('color') color!: string;
  @field('category') category!: string;
  @field('is_completed') isCompleted!: boolean;
  @field('completed_at') completedAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
