import type {Transaction} from '@domain/entities/Transaction';

export type StatementInput = {
  user: {fullName: string; email: string; address: string};
  wallet: {name: string; currency: string};
  transactions: Transaction[];
  categoryMap: Record<string, string>;
  dateRange: {startMs: number; endMs: number};
  openingBalanceCents: number;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(ms: number): string {
  const d = new Date(ms);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtMoney(cents: number, currency: string): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents) / 100;
  return `${sign}${currency} ${abs.toFixed(2)}`;
}

function nl2br(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br/>');
}

export type StatementSummary = {
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  transactionCount: number;
};

export function computeStatementSummary(
  transactions: Transaction[],
  openingBalanceCents: number,
): StatementSummary {
  let totalCredits = 0;
  let totalDebits = 0;

  for (const t of transactions) {
    if (t.type === 'income') {
      totalCredits += t.amount;
    } else if (t.type === 'expense') {
      totalDebits += t.amount;
    }
  }

  const closingBalance = openingBalanceCents + totalCredits - totalDebits;

  return {
    openingBalance: openingBalanceCents,
    closingBalance,
    totalCredits,
    totalDebits,
    transactionCount: transactions.length,
  };
}

type CategoryTotal = {name: string; amount: number; percentage: number};

export function computeCategoryBreakdown(
  transactions: Transaction[],
  type: 'income' | 'expense',
  categoryMap: Record<string, string>,
): CategoryTotal[] {
  const grouped = new Map<string, number>();

  for (const t of transactions) {
    if (t.type !== type) { continue; }
    const name = categoryMap[t.categoryId] ?? t.categoryId;
    grouped.set(name, (grouped.get(name) ?? 0) + t.amount);
  }

  const total = Array.from(grouped.values()).reduce((s, v) => s + v, 0);
  if (total === 0) { return []; }

  return Array.from(grouped.entries())
    .map(([name, amount]) => ({name, amount, percentage: (amount / total) * 100}))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
}

const LOGO_SVG = `<svg width="48" height="48" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
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

export function generateStatementHtml(input: StatementInput): string {
  const {user, wallet, transactions, categoryMap, dateRange, openingBalanceCents} = input;
  const summary = computeStatementSummary(transactions, openingBalanceCents);
  const expenseBreakdown = computeCategoryBreakdown(transactions, 'expense', categoryMap);
  const incomeBreakdown = computeCategoryBreakdown(transactions, 'income', categoryMap);
  const generatedAt = fmtDate(Date.now());
  const periodStart = fmtDate(dateRange.startMs);
  const periodEnd = fmtDate(dateRange.endMs);
  const cur = wallet.currency;

  let runningBalance = openingBalanceCents;
  const ledgerRows = transactions.map((t) => {
    const isCredit = t.type === 'income';
    if (isCredit) {
      runningBalance += t.amount;
    } else {
      runningBalance -= t.amount;
    }
    const desc = [t.description, t.merchant].filter(Boolean).join(' — ');
    const ref = t.id.length > 8 ? t.id.slice(-8).toUpperCase() : t.id.toUpperCase();
    const catName = categoryMap[t.categoryId] ?? t.categoryId;

    return `<tr>
      <td>${escapeHtml(fmtDate(t.transactionDate))}</td>
      <td>${escapeHtml(desc || '—')}</td>
      <td class="mono">${escapeHtml(ref)}</td>
      <td>${escapeHtml(catName)}</td>
      <td class="credit">${isCredit ? escapeHtml(fmtMoney(t.amount, cur)) : ''}</td>
      <td class="debit">${!isCredit ? escapeHtml(fmtMoney(t.amount, cur)) : ''}</td>
      <td class="balance">${escapeHtml(fmtMoney(runningBalance, cur))}</td>
    </tr>`;
  }).join('');

  const addressHtml = user.address ? `<br/>${nl2br(user.address)}` : '';

  function breakdownTable(items: CategoryTotal[], label: string): string {
    if (items.length === 0) {
      return `<div class="breakdown-col">
        <h4>${escapeHtml(label)}</h4>
        <p class="empty-breakdown">No ${label.toLowerCase()} in this period</p>
      </div>`;
    }
    const rows = items.map((c) =>
      `<tr><td>${escapeHtml(c.name)}</td><td class="right">${escapeHtml(fmtMoney(c.amount, cur))}</td><td class="right">${c.percentage.toFixed(1)}%</td></tr>`,
    ).join('');
    return `<div class="breakdown-col">
      <h4>${escapeHtml(label)}</h4>
      <table class="breakdown-table">
        <thead><tr><th>Category</th><th class="right">Amount</th><th class="right">%</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>WalletPulse Account Statement</title>
<style>
  @page { margin: 20mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10px;
    line-height: 1.45;
    color: #1a1a1a;
    background: #fff;
    padding: 24px;
  }

  /* Header */
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #6C5CE7; padding-bottom: 16px; margin-bottom: 20px; }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .header-left svg { flex-shrink: 0; }
  .brand { font-size: 22px; font-weight: 700; color: #111; letter-spacing: -0.3px; }
  .brand .accent { color: #6C5CE7; }
  .stmt-title { font-size: 10px; font-weight: 600; color: #6C5CE7; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px; }
  .header-right { text-align: right; font-size: 10px; color: #555; line-height: 1.6; }

  /* Account holder + statement info */
  .info-grid { display: flex; gap: 24px; margin-bottom: 20px; }
  .info-box { flex: 1; padding: 14px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fafafa; }
  .info-box h3 { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6C5CE7; margin-bottom: 8px; }
  .info-box p { font-size: 11px; line-height: 1.6; color: #333; }
  .info-box .label { color: #777; font-size: 9px; font-weight: 600; text-transform: uppercase; }

  /* Account summary */
  .summary { display: flex; gap: 0; margin-bottom: 24px; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
  .summary-item { flex: 1; padding: 14px; text-align: center; border-right: 1px solid #e0e0e0; }
  .summary-item:last-child { border-right: none; }
  .summary-item .label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #777; margin-bottom: 4px; }
  .summary-item .value { font-size: 14px; font-weight: 700; color: #111; }
  .summary-item .value.credit { color: #27ae60; }
  .summary-item .value.debit { color: #e74c3c; }

  /* Ledger */
  .ledger-title { font-size: 12px; font-weight: 700; color: #111; margin-bottom: 8px; }
  table.ledger { width: 100%; border-collapse: collapse; background: #fff; margin-bottom: 24px; }
  table.ledger th { text-align: left; background: #6C5CE7; color: #fff; font-weight: 600; padding: 8px 6px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  table.ledger td { padding: 7px 6px; border-bottom: 1px solid #eee; font-size: 9px; vertical-align: top; }
  table.ledger tr:nth-child(even) td { background: #f9fafb; }
  table.ledger tr:last-child td { border-bottom: none; }
  table.ledger .mono { font-family: "SF Mono", "Menlo", monospace; font-size: 8px; color: #888; }
  table.ledger .credit { color: #27ae60; font-weight: 600; }
  table.ledger .debit { color: #e74c3c; font-weight: 600; }
  table.ledger .balance { font-weight: 600; color: #333; text-align: right; }
  table.ledger th:last-child, table.ledger td:last-child { text-align: right; }

  /* Breakdown */
  .breakdown { display: flex; gap: 24px; margin-bottom: 24px; }
  .breakdown-col { flex: 1; }
  .breakdown-col h4 { font-size: 11px; font-weight: 700; color: #111; margin-bottom: 6px; }
  table.breakdown-table { width: 100%; border-collapse: collapse; }
  table.breakdown-table th { text-align: left; font-size: 8px; font-weight: 600; color: #777; text-transform: uppercase; padding: 4px 6px; border-bottom: 2px solid #eee; }
  table.breakdown-table td { padding: 5px 6px; font-size: 9px; border-bottom: 1px solid #f0f0f0; }
  .right { text-align: right !important; }
  .empty-breakdown { font-size: 10px; color: #999; font-style: italic; }

  /* Footer */
  .footer { border-top: 1px solid #ddd; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #888; }
  .footer .confidential { font-style: italic; max-width: 60%; }
</style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${LOGO_SVG}
      <div>
        <div class="brand">Wallet<span class="accent">Pulse</span></div>
        <div class="stmt-title">Account Statement</div>
      </div>
    </div>
    <div class="header-right">
      Generated: ${escapeHtml(generatedAt)}<br/>
      Statement Reference: WP-${Date.now().toString(36).toUpperCase()}
    </div>
  </div>

  <!-- Account holder + Statement info -->
  <div class="info-grid">
    <div class="info-box">
      <h3>Account Holder</h3>
      <p>
        <strong>${escapeHtml(user.fullName)}</strong><br/>
        ${escapeHtml(user.email)}${addressHtml}
      </p>
    </div>
    <div class="info-box">
      <h3>Statement Details</h3>
      <p>
        <span class="label">Wallet:</span> ${escapeHtml(wallet.name)}<br/>
        <span class="label">Currency:</span> ${escapeHtml(wallet.currency)}<br/>
        <span class="label">Period:</span> ${escapeHtml(periodStart)} — ${escapeHtml(periodEnd)}<br/>
        <span class="label">Transactions:</span> ${summary.transactionCount}
      </p>
    </div>
  </div>

  <!-- Account Summary -->
  <div class="summary">
    <div class="summary-item">
      <div class="label">Opening Balance</div>
      <div class="value">${escapeHtml(fmtMoney(summary.openingBalance, cur))}</div>
    </div>
    <div class="summary-item">
      <div class="label">Total Credits</div>
      <div class="value credit">${escapeHtml(fmtMoney(summary.totalCredits, cur))}</div>
    </div>
    <div class="summary-item">
      <div class="label">Total Debits</div>
      <div class="value debit">${escapeHtml(fmtMoney(summary.totalDebits, cur))}</div>
    </div>
    <div class="summary-item">
      <div class="label">Closing Balance</div>
      <div class="value">${escapeHtml(fmtMoney(summary.closingBalance, cur))}</div>
    </div>
  </div>

  <!-- Transaction Ledger -->
  <div class="ledger-title">Transaction Ledger</div>
  ${summary.transactionCount === 0
    ? '<p style="color:#999;font-style:italic;margin-bottom:24px;">No transactions in this period.</p>'
    : `<table class="ledger">
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Reference</th>
        <th>Category</th>
        <th>Credit</th>
        <th>Debit</th>
        <th>Balance</th>
      </tr>
    </thead>
    <tbody>${ledgerRows}</tbody>
  </table>`}

  <!-- Category Breakdown -->
  <div class="breakdown">
    ${breakdownTable(expenseBreakdown, 'Top Expenses')}
    ${breakdownTable(incomeBreakdown, 'Top Income')}
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="confidential">This statement is confidential and intended solely for the account holder named above.</div>
    <div>WalletPulse</div>
  </div>

</body>
</html>`;
}
