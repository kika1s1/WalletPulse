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
  userName?: string;
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
const LOGO_SVG = `<svg width="40" height="40" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6C5CE7" stop-opacity="1"/>
      <stop offset="1" stop-color="#4132AA" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="120" height="120" rx="26" ry="26" fill="url(#bgGrad)"/>
  <path d="M30 38 L42 82 L60 52 L78 82 L90 38" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M22 72 L40 72 L46 80 L52 58 L58 78 L62 65 L66 72 L98 72" fill="none" stroke="#A29BFE" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="52" cy="58" r="3" fill="#A29BFE" opacity="0.6"/>
</svg>`;

export function formatTransactionsAsPdfHtml(
  transactions: Transaction[],
  options?: ExportOptions,
): string {
  const generatedAt = new Date().toISOString();
  const userName = options?.userName?.trim() ?? '';
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

  const userLine = userName
    ? `<p class="user-name">Prepared for: <strong>${escapeHtml(userName)}</strong></p>`
    : '';

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
  .header-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 6px;
  }
  .header-row svg { flex-shrink: 0; }
  .header-text { flex: 1; }
  .brand-name {
    font-size: 22px;
    font-weight: 700;
    color: #111;
    margin: 0;
    letter-spacing: -0.3px;
  }
  .brand-name .accent { color: #6C5CE7; }
  .user-name {
    font-size: 12px;
    color: #333;
    margin: 2px 0 0 0;
  }
  .meta {
    font-size: 11px;
    color: #555;
    margin: 4px 0 20px 0;
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
    background: #6C5CE7;
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
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>
</head>
<body>
  <div class="header-row">
    ${LOGO_SVG}
    <div class="header-text">
      <p class="brand-name">Wallet<span class="accent">Pulse</span></p>
      ${userLine}
    </div>
  </div>
  <p class="meta">Generated: ${escapeHtml(generatedAt)} · ${transactions.length} transaction(s)</p>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <p class="footer">
    <span>Amounts are in major currency units (e.g. 12.99 not cents).</span>
    <span>WalletPulse</span>
  </p>
</body>
</html>`;
}
