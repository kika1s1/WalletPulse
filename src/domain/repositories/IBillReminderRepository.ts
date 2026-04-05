import type {BillReminder} from '@domain/entities/BillReminder';

export interface IBillReminderRepository {
  findById(id: string): Promise<BillReminder | null>;
  findAll(): Promise<BillReminder[]>;
  findUnpaid(): Promise<BillReminder[]>;
  findPaid(): Promise<BillReminder[]>;
  save(bill: BillReminder): Promise<void>;
  update(bill: BillReminder): Promise<void>;
  markPaid(id: string, paidTransactionId?: string): Promise<void>;
  delete(id: string): Promise<void>;
}
