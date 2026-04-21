---
name: notification-parser
description: TDD-driven guide for building and testing notification parsers that extract financial transactions from Android push notifications. Use when creating new parsers, debugging regex patterns, adding support for new financial apps, or working on notification-related code.
---

# Notification Parser Skill

## How Notification Capture Works

1. Android `NotificationListenerService` runs as a foreground background service
2. Native Kotlin module captures notification `title`, `body`, `packageName`, `timestamp`
3. Data is sent to JS via React Native bridge event emitter
4. `parser-registry.ts` looks up parser by `packageName`
5. Parser returns `ParsedTransaction | null`
6. If valid, dedup check runs, then the CreateTransaction use case writes to Supabase via TransactionRepository

## Creating a New Parser (TDD Approach)

### Step 1: Collect Notification Samples

Gather real notification texts. Store them in:
`__tests__/fixtures/notifications/{app-name}.json`

```json
[
  {
    "title": "Payment Received",
    "body": "You received $150.00 USD from Client Name",
    "packageName": "com.payoneer.android"
  },
  {
    "title": "Daily Update",
    "body": "Check your account summary",
    "packageName": "com.payoneer.android",
    "shouldParse": false
  }
]
```

### Step 2: Write Failing Tests First

```ts
// __tests__/infrastructure/notification/parsers/payoneer.test.ts
import { payoneerParser } from '@infrastructure/notification/parsers/payoneer';
import fixtures from '../../../fixtures/notifications/payoneer.json';

describe('PayoneerParser', () => {
  it('should parse payment received into income transaction', () => {
    const result = payoneerParser.parse('Payment Received', 'You received $150.00 USD from Client');
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(15000);
    expect(result!.currency).toBe('USD');
    expect(result!.type).toBe('income');
  });

  it('should return null for non-financial notifications', () => {
    const result = payoneerParser.parse('Daily Update', 'Check your account summary');
    expect(result).toBeNull();
  });

  it('should handle amounts with comma separators', () => {
    const result = payoneerParser.parse('Payment Received', 'You received $1,250.75 EUR from Client');
    expect(result!.amount).toBe(125075);
    expect(result!.currency).toBe('EUR');
  });
});
```

### Step 3: Implement the Parser

```ts
// src/infrastructure/notification/parsers/payoneer.ts
import type { NotificationParser, ParsedTransaction } from '../types';

const PAYMENT_RECEIVED = /received\s+\$?(?<amount>[\d,]+\.?\d*)\s*(?<currency>[A-Z]{3})/i;
const PAYMENT_SENT = /sent\s+\$?(?<amount>[\d,]+\.?\d*)\s*(?<currency>[A-Z]{3})/i;

function parseAmount(raw: string): number {
  return Math.round(parseFloat(raw.replace(/,/g, '')) * 100);
}

export const payoneerParser: NotificationParser = {
  appPackage: 'com.payoneer.android',

  parse(title: string, body: string): ParsedTransaction | null {
    const text = `${title} ${body}`;

    const received = text.match(PAYMENT_RECEIVED);
    if (received?.groups) {
      return {
        amount: parseAmount(received.groups.amount),
        currency: received.groups.currency.toUpperCase(),
        merchant: extractMerchant(text),
        type: 'income',
        sourceApp: 'payoneer',
        rawNotification: text,
        confidence: 0.9,
      };
    }

    const sent = text.match(PAYMENT_SENT);
    if (sent?.groups) {
      return {
        amount: parseAmount(sent.groups.amount),
        currency: sent.groups.currency.toUpperCase(),
        merchant: extractMerchant(text),
        type: 'expense',
        sourceApp: 'payoneer',
        rawNotification: text,
        confidence: 0.9,
      };
    }

    return null;
  },
};
```

### Step 4: Register and Refactor

Register in `src/infrastructure/notification/parser-registry.ts`, then refactor while keeping tests green.

## Deduplication

Hash: `sha256(amount + currency + timestamp_rounded_to_minute + sourceApp)`

Store hashes in a Set (memory) + `notification_logs` table. Check before writing.

## Debugging

- All raw notifications are logged to `notification_logs` table
- Developer mode shows a "Notification Log" screen with raw text + parse result
- Regex debug panel allows testing patterns against sample text
