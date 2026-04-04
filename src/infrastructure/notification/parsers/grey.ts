import type {RawNotification, ParsedNotification} from '../types';

const RE_DEPOSIT = /([\d,]+\.?\d*)\s*([A-Z]{3})\s*(?:has been|was)\s*deposited/i;
const RE_TRANSFER = /transferred\s+([\d,]+\.?\d*)\s*([A-Z]{3})/i;
const RE_CARD = /payment\s+of\s+([\d,]+\.?\d*)\s*([A-Z]{3})\s+at\s+(.+)/i;
const RE_CONVERSION = /converted\s+([\d,]+\.?\d*)\s*([A-Z]{3})\s+to\s+([\d,]+\.?\d*)\s*([A-Z]{3})/i;
const RE_TO = /to\s+(.+)$/i;

function toCents(raw: string): number {
  return Math.round(parseFloat(raw.replace(/,/g, '')) * 100);
}

export function parseGrey(n: RawNotification): ParsedNotification | null {
  const body = n.body;

  const deposit = RE_DEPOSIT.exec(body);
  if (deposit) {
    return {
      amountCents: toCents(deposit[1]),
      currency: deposit[2].toUpperCase(),
      type: 'income',
      merchant: 'Grey',
      source: 'grey',
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
      source: 'grey',
      confidence: 0.95,
      description: n.title,
    };
  }

  const transfer = RE_TRANSFER.exec(body);
  if (transfer) {
    const toMatch = RE_TO.exec(body);
    return {
      amountCents: toCents(transfer[1]),
      currency: transfer[2].toUpperCase(),
      type: 'expense',
      merchant: toMatch ? toMatch[1].trim() : 'Grey',
      source: 'grey',
      confidence: 0.95,
      description: n.title,
    };
  }

  const conversion = RE_CONVERSION.exec(body);
  if (conversion) {
    return {
      amountCents: toCents(conversion[1]),
      currency: conversion[2].toUpperCase(),
      type: 'transfer',
      merchant: 'Grey',
      source: 'grey',
      confidence: 0.85,
      description: n.title,
    };
  }

  return null;
}
