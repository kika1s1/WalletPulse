import type {TransactionTemplate, TemplateInput} from '@domain/entities/TransactionTemplate';

export type ITransactionTemplateRepository = {
  findAll(): Promise<TransactionTemplate[]>;
  create(input: TransactionTemplate): Promise<void>;
  update(id: string, input: Partial<TemplateInput>): Promise<void>;
  delete(id: string): Promise<void>;
  incrementUsageCount(id: string): Promise<void>;
};
