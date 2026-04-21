import type {NotificationParser, ParsedNotification} from './types';
import {parsePayoneer} from './parsers/payoneer';
import {parseGrey} from './parsers/grey';
import {parseDukascopy} from './parsers/dukascopy';

const REGISTRY: Record<string, NotificationParser> = {
  'com.payoneer.android': parsePayoneer,
  'com.grey.android': parseGrey,
  'com.dukascopy.bank': parseDukascopy,
};

export function getParserForPackage(
  packageName: string,
): NotificationParser | null {
  return REGISTRY[packageName] ?? null;
}

export async function applyCustomRules(
  packageName: string,
  title: string,
  body: string,
): Promise<ParsedNotification | null> {
  try {
    const {getSupabaseDataSource} = await import('@data/datasources/SupabaseDataSource');
    const ds = getSupabaseDataSource();
    const rules = await ds.parsingRules.findByPackageName(packageName);
    if (rules.length === 0) {
      return null;
    }

    const fullText = `${title} ${body}`;
    for (const rule of rules) {
      try {
        const regex = new RegExp(rule.pattern);
        const match = regex.exec(fullText);
        if (!match) {
          continue;
        }

        const groups = match.groups ?? {};
        const amountStr = groups.amount ?? '';
        const amountRaw = parseFloat(amountStr.replace(/,/g, ''));
        if (isNaN(amountRaw) || amountRaw <= 0) {
          continue;
        }

        const amountCents = Math.round(amountRaw * 100);
        const currencyRaw = (groups.currency ?? '').trim().toUpperCase();
        const currency = currencyRaw.length > 0 ? currencyRaw : 'USD';

        return {
          amountCents,
          currency,
          type: rule.transactionType,
          merchant: groups.merchant?.trim() ?? '',
          source: 'manual',
          confidence: 0.75,
          description: groups.description?.trim() ?? body.slice(0, 100),
        };
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}
