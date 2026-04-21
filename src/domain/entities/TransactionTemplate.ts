import type {TransactionType} from './Transaction';

export type TransactionTemplate = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  categoryId?: string;
  amount?: number;
  currency?: string;
  description?: string;
  merchant?: string;
  tags?: string[];
  sortOrder: number;
  createdAt: number;
};

export type TemplateInput = {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  categoryId?: string;
  amount?: number;
  currency?: string;
  description?: string;
  merchant?: string;
  tags?: string[];
};

export type AppliedTemplate = {
  type: TransactionType;
  categoryId: string;
  amount: number;
  currency: string;
  description: string;
  merchant: string;
  tags: string[];
};
