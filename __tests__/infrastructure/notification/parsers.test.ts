import type {RawNotification} from '@infrastructure/notification/types';
import {parsePayoneer} from '@infrastructure/notification/parsers/payoneer';
import {parseGrey} from '@infrastructure/notification/parsers/grey';
import {parseDukascopy} from '@infrastructure/notification/parsers/dukascopy';
import {getParserForPackage} from '@infrastructure/notification/parser-registry';
import {categorizeByMerchant} from '@infrastructure/notification/auto-categorize';

import payoneerFixtures from '../../fixtures/notifications/payoneer.json';
import greyFixtures from '../../fixtures/notifications/grey.json';
import dukascopyFixtures from '../../fixtures/notifications/dukascopy.json';

type Fixture = {
  id: string;
  packageName: string;
  title: string;
  body: string;
  expected: {amount: number; currency: string; type: string; merchant: string; confidence: number} | null;
};

function toRaw(f: Fixture): RawNotification {
  return {packageName: f.packageName, title: f.title, body: f.body, receivedAt: Date.now()};
}

describe('Payoneer parser', () => {
  const fixtures = payoneerFixtures as Fixture[];
  for (const f of fixtures) {
    if (f.expected) {
      it(`parses ${f.id}: ${f.title}`, () => {
        const r = parsePayoneer(toRaw(f));
        expect(r).not.toBeNull();
        expect(r!.amountCents).toBe(f.expected!.amount);
        expect(r!.currency).toBe(f.expected!.currency);
        expect(r!.type).toBe(f.expected!.type);
        expect(r!.merchant).toBe(f.expected!.merchant);
        expect(r!.confidence).toBeGreaterThanOrEqual(f.expected!.confidence - 0.05);
      });
    } else {
      it(`returns null for non-financial: ${f.id}`, () => {
        expect(parsePayoneer(toRaw(f))).toBeNull();
      });
    }
  }
});

describe('Grey parser', () => {
  const fixtures = greyFixtures as Fixture[];
  for (const f of fixtures) {
    if (f.expected) {
      it(`parses ${f.id}: ${f.title}`, () => {
        const r = parseGrey(toRaw(f));
        expect(r).not.toBeNull();
        expect(r!.amountCents).toBe(f.expected!.amount);
        expect(r!.currency).toBe(f.expected!.currency);
        expect(r!.type).toBe(f.expected!.type);
        expect(r!.merchant).toBe(f.expected!.merchant);
        expect(r!.confidence).toBeGreaterThanOrEqual(f.expected!.confidence - 0.05);
      });
    } else {
      it(`returns null for non-financial: ${f.id}`, () => {
        expect(parseGrey(toRaw(f))).toBeNull();
      });
    }
  }
});

describe('Dukascopy parser', () => {
  const fixtures = dukascopyFixtures as Fixture[];
  for (const f of fixtures) {
    if (f.expected) {
      it(`parses ${f.id}: ${f.title}`, () => {
        const r = parseDukascopy(toRaw(f));
        expect(r).not.toBeNull();
        expect(r!.amountCents).toBe(f.expected!.amount);
        expect(r!.currency).toBe(f.expected!.currency);
        expect(r!.type).toBe(f.expected!.type);
        expect(r!.merchant).toBe(f.expected!.merchant);
        expect(r!.confidence).toBeGreaterThanOrEqual(f.expected!.confidence - 0.05);
      });
    } else {
      it(`returns null for non-financial: ${f.id}`, () => {
        expect(parseDukascopy(toRaw(f))).toBeNull();
      });
    }
  }
});

describe('Parser registry', () => {
  it('returns parser for all supported packages', () => {
    expect(getParserForPackage('com.payoneer.android')).toBeDefined();
    expect(getParserForPackage('com.grey.android')).toBeDefined();
    expect(getParserForPackage('com.dukascopy.bank')).toBeDefined();
  });

  it('returns null for unknown packages', () => {
    expect(getParserForPackage('com.unknown.app')).toBeNull();
  });

  it('registry parser produces correct results', () => {
    const parser = getParserForPackage('com.payoneer.android')!;
    const r = parser({packageName: 'com.payoneer.android', title: 'Payment Received', body: 'You received 100.00 USD from Test', receivedAt: Date.now()});
    expect(r).not.toBeNull();
    expect(r!.amountCents).toBe(10000);
    expect(r!.currency).toBe('USD');
  });
});

describe('Auto-categorization', () => {
  const cases: [string, string][] = [
    ['Uber Technologies', 'Transportation'],
    ['Amazon.com', 'Shopping'],
    ['Netflix Subscription', 'Entertainment'],
    ['The Italian Restaurant', 'Food and Dining'],
    ['Shoprite Supermarket', 'Groceries'],
    ['CVS Pharmacy', 'Health and Medical'],
    ['Electric Company', 'Utilities'],
    ['Airbnb Dublin', 'Travel'],
    ['Planet Gym Fitness', 'Personal Care'],
    ['Spotify Premium', 'Entertainment'],
    ['Some Random XYZ', 'Other'],
    ['UBER TECHNOLOGIES', 'Transportation'],
  ];

  for (const [merchant, expected] of cases) {
    it(`categorizes "${merchant}" as ${expected}`, () => {
      expect(categorizeByMerchant(merchant)).toBe(expected);
    });
  }
});
