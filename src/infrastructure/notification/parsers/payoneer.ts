import type {RawNotification, ParsedNotification} from '../types';

const RE_RECEIVED = /received\s+\$?([\d,]+\.?\d*)\s*([A-Z]{3})/i;
const RE_SENT = /sent\s+\$?([\d,]+\.?\d*)\s*([A-Z]{3})/i;
const RE_WITHDRAWAL = /withdrawal\s+of\s+\$?([\d,]+\.?\d*)\s*([A-Z]{3})/i;
const RE_FEE = /fee\s+of\s+\$?([\d,]+\.?\d*)\s*([A-Z]{3})/i;
const RE_FROM = /from\s+(.+)$/i;
const RE_TO = /to\s+(.+)$/i;

function toCents(raw: string): number {
  return Math.round(parseFloat(raw.replace(/,/g, '')) * 100);
}

export function parsePayoneer(n: RawNotification): ParsedNotification | null {
  const body = n.body;

  const received = RE_RECEIVED.exec(body);
  if (received) {
    const fromMatch = RE_FROM.exec(body);
    return {
      amountCents: toCents(received[1]),
      currency: received[2].toUpperCase(),
      type: 'income',
      merchant: fromMatch ? fromMatch[1].trim() : 'Payoneer',
      source: 'payoneer',
      confidence: 0.95,
      description: n.title,
    };
  }

  const sent = RE_SENT.exec(body);
  if (sent) {
    const toMatch = RE_TO.exec(body);
    return {
      amountCents: toCents(sent[1]),
      currency: sent[2].toUpperCase(),
      type: 'expense',
      merchant: toMatch ? toMatch[1].trim() : 'Payoneer',
      source: 'payoneer',
      confidence: 0.95,
      description: n.title,
    };
  }

  const withdrawal = RE_WITHDRAWAL.exec(body);
  if (withdrawal) {
    return {
      amountCents: toCents(withdrawal[1]),
      currency: withdrawal[2].toUpperCase(),
      type: 'expense',
      merchant: 'Payoneer',
      source: 'payoneer',
      confidence: 0.9,
      description: n.title,
    };
  }

  const fee = RE_FEE.exec(body);
  if (fee) {
    return {
      amountCents: toCents(fee[1]),
      currency: fee[2].toUpperCase(),
      type: 'expense',
      merchant: 'Payoneer',
      source: 'payoneer',
      confidence: 0.9,
      description: n.title,
    };
  }

  return null;
}
