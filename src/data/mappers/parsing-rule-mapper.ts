import type {ParsingRule} from '@domain/entities/ParsingRule';

export type ParsingRuleRaw = {
  id: string;
  sourceApp: string;
  packageName: string;
  ruleName: string;
  pattern: string;
  transactionType: string;
  isActive: boolean;
  priority: number;
  createdAt: number;
  updatedAt: number;
};

export function toDomain(raw: ParsingRuleRaw): ParsingRule {
  return {
    id: raw.id,
    sourceApp: raw.sourceApp,
    packageName: raw.packageName,
    ruleName: raw.ruleName,
    pattern: raw.pattern,
    transactionType: raw.transactionType as 'income' | 'expense',
    isActive: raw.isActive,
    priority: raw.priority,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}
