import {generateId} from '@shared/utils/hash';
import type {
  TransactionTemplate,
  TemplateInput,
  AppliedTemplate,
} from '@domain/entities/TransactionTemplate';

export type {TransactionTemplate, TemplateInput, AppliedTemplate};

const MAX_NAME_LENGTH = 40;

export function getDefaultTemplates(): TransactionTemplate[] {
  const now = Date.now();
  return [
    {
      id: 'tpl-coffee',
      name: 'Coffee',
      icon: 'coffee',
      color: '#FF6B6B',
      type: 'expense',
      categoryId: 'food-and-dining',
      amount: 350,
      currency: 'USD',
      merchant: 'Coffee Shop',
      tags: ['food'],
      sortOrder: 0,
      createdAt: now,
    },
    {
      id: 'tpl-lunch',
      name: 'Lunch',
      icon: 'fork-knife',
      color: '#E17055',
      type: 'expense',
      categoryId: 'food-and-dining',
      amount: 1200,
      currency: 'USD',
      merchant: 'Restaurant',
      tags: ['food'],
      sortOrder: 1,
      createdAt: now,
    },
    {
      id: 'tpl-transport',
      name: 'Ride',
      icon: 'car',
      color: '#4ECDC4',
      type: 'expense',
      categoryId: 'transportation',
      amount: 500,
      currency: 'USD',
      tags: ['transport'],
      sortOrder: 2,
      createdAt: now,
    },
    {
      id: 'tpl-groceries',
      name: 'Groceries',
      icon: 'cart',
      color: '#45B7D1',
      type: 'expense',
      categoryId: 'groceries',
      tags: ['home'],
      sortOrder: 3,
      createdAt: now,
    },
    {
      id: 'tpl-salary',
      name: 'Salary',
      icon: 'cash',
      color: '#00B894',
      type: 'income',
      categoryId: 'salary',
      description: 'Monthly salary',
      tags: ['payroll'],
      sortOrder: 4,
      createdAt: now,
    },
    {
      id: 'tpl-freelance',
      name: 'Freelance',
      icon: 'briefcase',
      color: '#0984E3',
      type: 'income',
      categoryId: 'freelance-income',
      tags: ['client-a'],
      sortOrder: 5,
      createdAt: now,
    },
  ];
}

export function createTemplate(input: TemplateInput): TransactionTemplate {
  return {
    id: generateId(),
    name: input.name.trim(),
    icon: input.icon,
    color: input.color,
    type: input.type,
    categoryId: input.categoryId,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    merchant: input.merchant,
    tags: input.tags,
    sortOrder: 0,
    createdAt: Date.now(),
  };
}

export function applyTemplate(template: TransactionTemplate): AppliedTemplate {
  return {
    type: template.type,
    categoryId: template.categoryId ?? '',
    amount: template.amount ?? 0,
    currency: template.currency ?? '',
    description: template.description ?? '',
    merchant: template.merchant ?? '',
    tags: template.tags ?? [],
  };
}

export function validateTemplate(
  input: Pick<TemplateInput, 'name' | 'icon' | 'color' | 'type'>,
): string | null {
  const name = input.name.trim();
  if (!name) {
    return 'Template name is required';
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `Template name must be ${MAX_NAME_LENGTH} characters or fewer`;
  }
  if (!input.icon.trim()) {
    return 'Icon is required';
  }
  return null;
}
