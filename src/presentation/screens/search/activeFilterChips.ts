import type {TransactionFilter} from '@domain/repositories/ITransactionRepository';

// Mirror of the legacy SearchScreen filter shape — keeping it inline here
// so the helper has zero dependencies on the screen module and can be
// unit-tested in isolation.
export type FilterChipsInput = {
  type?: TransactionFilter['type'];
  source?: TransactionFilter['source'];
  categoryId?: string;
  walletId?: string;
  currency?: string;
  merchant?: string;
  minAmount?: number;
  maxAmount?: number;
  dateRange?: {startMs: number; endMs: number};
  tags?: string[];
  hasReceipt?: boolean;
  hasNotes?: boolean;
  hasLocation?: boolean;
  hasTags?: boolean;
  isRecurring?: boolean;
  isTemplate?: boolean;
  isUncategorized?: boolean;
};

export type ActiveFilterChip = {
  key: string;
  label: string;
};

type Lookup = {
  categories: Array<{id: string; name: string}>;
  wallets: Array<{id: string; name: string}>;
};

const SOURCE_LABELS: Record<NonNullable<FilterChipsInput['source']>, string> = {
  manual: 'Manual',
  payoneer: 'Payoneer',
  grey: 'Grey',
  dukascopy: 'Dukascopy',
};

const TYPE_LABELS: Record<NonNullable<FilterChipsInput['type']>, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
};

// Returns one user-readable chip per active filter slot, in the same
// stable order the chip bar renders. Centralising this makes the
// "selected filters must always be visible" guarantee testable —
// every filter the FilterSheet can set must yield a chip here.
export function buildActiveFilterChips(
  filters: FilterChipsInput,
  lookup: Lookup,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.type) {
    chips.push({key: 'type', label: TYPE_LABELS[filters.type] ?? filters.type});
  }
  if (filters.source) {
    chips.push({
      key: 'source',
      label: SOURCE_LABELS[filters.source] ?? filters.source,
    });
  }
  if (filters.categoryId) {
    const c = lookup.categories.find((x) => x.id === filters.categoryId);
    chips.push({key: 'category', label: c?.name ?? 'Category'});
  }
  if (filters.walletId) {
    const w = lookup.wallets.find((x) => x.id === filters.walletId);
    chips.push({key: 'wallet', label: w?.name ?? 'Wallet'});
  }
  if (filters.merchant) {
    chips.push({key: 'merchant', label: filters.merchant});
  }
  if (filters.currency) {
    chips.push({key: 'currency', label: filters.currency});
  }
  if (filters.dateRange) {
    chips.push({key: 'date', label: 'Date range'});
  }
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    const min = filters.minAmount !== undefined
      ? `>=${(filters.minAmount / 100).toFixed(0)}`
      : '';
    const max = filters.maxAmount !== undefined
      ? `<=${(filters.maxAmount / 100).toFixed(0)}`
      : '';
    chips.push({key: 'amount', label: `${min} ${max}`.trim()});
  }
  if (filters.tags && filters.tags.length > 0) {
    chips.push({key: 'tags', label: `#${filters.tags.join(' #')}`});
  }

  const booleanChips: Array<{key: keyof FilterChipsInput; label: string}> = [
    {key: 'hasReceipt', label: 'Has receipt'},
    {key: 'hasNotes', label: 'Has notes'},
    {key: 'hasLocation', label: 'Has location'},
    {key: 'hasTags', label: 'Has tags'},
    {key: 'isRecurring', label: 'Recurring'},
    {key: 'isTemplate', label: 'Template'},
    {key: 'isUncategorized', label: 'Uncategorized'},
  ];
  for (const chip of booleanChips) {
    if (filters[chip.key]) {
      chips.push({key: String(chip.key), label: chip.label});
    }
  }

  return chips;
}
