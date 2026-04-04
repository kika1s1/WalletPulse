import type {RawNotification, ParsedNotification} from '../types';

const RE_INCOMING = /incoming\s+transfer:\s*([\d,]+\.?\d*)\s*([A-Z]{3})/i;
const RE_OUTGOING = /outgoing\s+transfer:\s*([\d,]+\.?\d*)\s*([A-Z]{3})/i;
const RE_CARD = /card\s+charged:\s*([\d,]+\.?\d*)\s*([A-Z]{3})\s*-\s*(.+)/i;

function toCents(raw: string): number {
  return Math.round(parseFloat(raw.replace(/,/g, '')) * 100);
}

export function parseDukascopy(n: RawNotification): ParsedNotification | null {
  const body = n.body;

  const incoming = RE_INCOMING.exec(body);
  if (incoming) {
    return {
      amountCents: toCents(incoming[1]),
      currency: incoming[2].toUpperCase(),
      type: 'income',
      merchant: 'Dukascopy',
      source: 'dukascopy',
      confidence: 0.9,
      description: n.title,
    };
  }

  const outgoing = RE_OUTGOING.exec(body);
  if (outgoing) {
    return {
      amountCents: toCents(outgoing[1]),
      currency: outgoing[2].toUpperCase(),
      type: 'expense',
      merchant: 'Dukascopy',
      source: 'dukascopy',
      confidence: 0.9,
      description: n.title,
    };
  }

  const card = RE_CARD.exec(body);
  if (card) {
    return {
      amountCents: toCents(card[1]),
      currency: card[2].toUpperCase(),
      type: 'expense',
      merchant: card[3].trim(),
      source: 'dukascopy',
      confidence: 0.95,
      description: n.title,
    };
  }

  return null;
}
