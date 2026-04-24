import type {RecurringSchedule} from '@domain/entities/RecurringSchedule';

export interface IRecurringScheduleRepository {
  findById(id: string): Promise<RecurringSchedule | null>;
  findByTemplateTransactionId(templateTransactionId: string): Promise<RecurringSchedule | null>;
  findActive(): Promise<RecurringSchedule[]>;
  save(schedule: RecurringSchedule): Promise<void>;
  update(schedule: RecurringSchedule): Promise<void>;
  deactivate(id: string, updatedAt: number): Promise<void>;
  delete(id: string): Promise<void>;
}
