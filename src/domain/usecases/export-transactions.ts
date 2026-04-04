import type {Transaction} from '@domain/entities/Transaction';

export type ExportFormat = 'csv' | 'json';

const CSV_HEADERS = [
  'Date',
  'Amount',
  'Currency',
  'Type',
  'Category',
  'Description',
  'Merchant',
  'Source',
  'Tags',
  'Notes',
  'Recurring',
];

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function toMajor(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatTransactionsAsCsv(transactions: Transaction[]): string {
  const rows: string[] = [CSV_HEADERS.join(',')];

  for (const t of transactions) {
    const fields = [
      formatDate(t.transactionDate),
      toMajor(t.amount),
      t.currency,
      t.type,
      escapeCsvField(t.categoryId),
      escapeCsvField(t.description),
      escapeCsvField(t.merchant),
      t.source,
      escapeCsvField(t.tags.join(';')),
      escapeCsvField(t.notes),
      t.isRecurring ? 'Yes' : 'No',
    ];
    rows.push(fields.join(','));
  }

  return rows.join('\n');
}

type ExportRow = {
  date: string;
  amount: number;
  currency: string;
  type: string;
  category: string;
  description: string;
  merchant: string;
  source: string;
  tags: string[];
  notes: string;
  recurring: boolean;
};

export function formatTransactionsAsJson(transactions: Transaction[]): string {
  const rows: ExportRow[] = transactions.map((t) => ({
    date: formatDate(t.transactionDate),
    amount: parseFloat(toMajor(t.amount)),
    currency: t.currency,
    type: t.type,
    category: t.categoryId,
    description: t.description,
    merchant: t.merchant,
    source: t.source,
    tags: t.tags,
    notes: t.notes,
    recurring: t.isRecurring,
  }));

  return JSON.stringify(rows, null, 2);
}

export function buildExportFilename(format: ExportFormat): string {
  const date = new Date().toISOString().slice(0, 10);
  return `walletpulse-export-${date}.${format}`;
}
