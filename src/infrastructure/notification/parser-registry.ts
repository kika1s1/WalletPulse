import type {NotificationParser} from './types';
import type {TransactionSource} from '@domain/entities/Transaction';
import {parsePayoneer} from './parsers/payoneer';
import {parseGrey} from './parsers/grey';
import {parseDukascopy} from './parsers/dukascopy';

const REGISTRY: Record<string, NotificationParser> = {
  'com.payoneer.android': parsePayoneer,
  'com.grey.android': parseGrey,
  'com.dukascopy.bank': parseDukascopy,
};

const SOURCE_MAP: Record<string, TransactionSource> = {
  'com.payoneer.android': 'payoneer',
  'com.grey.android': 'grey',
  'com.dukascopy.bank': 'dukascopy',
};

export function getParserForPackage(
  packageName: string,
): NotificationParser | null {
  return REGISTRY[packageName] ?? null;
}

export function getSupportedPackages(): string[] {
  return Object.keys(REGISTRY);
}

export function getSourceForPackage(
  packageName: string,
): TransactionSource {
  return SOURCE_MAP[packageName] ?? 'manual';
}
