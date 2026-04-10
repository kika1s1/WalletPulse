import type {Transaction} from '@domain/entities/Transaction';

export type ExportFormat = 'csv' | 'json' | 'pdf';

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type ExportOptions = {
  categoryMap?: Record<string, string>;
};

function resolveCategoryName(
  categoryId: string,
  categoryMap?: Record<string, string>,
): string {
  return categoryMap?.[categoryId] ?? categoryId;
}

export function formatTransactionsAsCsv(
  transactions: Transaction[],
  options?: ExportOptions,
): string {
  const rows: string[] = [CSV_HEADERS.join(',')];

  for (const t of transactions) {
    const fields = [
      formatDate(t.transactionDate),
      toMajor(t.amount),
      t.currency,
      t.type,
      escapeCsvField(resolveCategoryName(t.categoryId, options?.categoryMap)),
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

export function formatTransactionsAsJson(
  transactions: Transaction[],
  options?: ExportOptions,
): string {
  const rows: ExportRow[] = transactions.map((t) => ({
    date: formatDate(t.transactionDate),
    amount: parseFloat(toMajor(t.amount)),
    currency: t.currency,
    type: t.type,
    category: resolveCategoryName(t.categoryId, options?.categoryMap),
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
  const ext = format === 'pdf' ? 'pdf' : format;
  return `walletpulse-export-${date}.${ext}`;
}

/**
 * Full HTML document suitable for PDF conversion or opening in a browser.
 */
export function formatTransactionsAsPdfHtml(
  transactions: Transaction[],
  options?: ExportOptions,
): string {
  const generatedAt = new Date().toISOString();
  const headerCells = CSV_HEADERS.map(
    (h) => `<th>${escapeHtml(h)}</th>`,
  ).join('');

  const bodyRows = transactions
    .map((t) => {
      const cells = [
        formatDate(t.transactionDate),
        toMajor(t.amount),
        t.currency,
        t.type,
        resolveCategoryName(t.categoryId, options?.categoryMap),
        t.description,
        t.merchant,
        t.source,
        t.tags.join('; '),
        t.notes,
        t.isRecurring ? 'Yes' : 'No',
      ].map((c) => `<td>${escapeHtml(String(c))}</td>`);
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>WalletPulse export</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: #1a1a1a;
    margin: 24px;
    background: #fafafa;
  }
  h1 {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: #111;
  }
  .meta {
    font-size: 11px;
    color: #555;
    margin-bottom: 20px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    border-radius: 8px;
    overflow: hidden;
  }
  th {
    text-align: left;
    background: #2563eb;
    color: #fff;
    font-weight: 600;
    padding: 10px 8px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  td {
    padding: 8px;
    border-bottom: 1px solid #eee;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #f9fafb; }
  tr:last-child td { border-bottom: none; }
  .footer {
    margin-top: 16px;
    font-size: 10px;
    color: #888;
  }
</style>
</head>
<body>
  <h1>WalletPulse transaction export</h1>
  <p class="meta">Generated: ${escapeHtml(generatedAt)} · ${transactions.length} transaction(s)</p>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <p class="footer">Amounts are in major currency units (e.g. 12.99 not cents).</p>
</body>
</html>`;
}
