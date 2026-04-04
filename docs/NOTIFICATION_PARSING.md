# WalletPulse: Notification Parsing Reference

## Overview

WalletPulse uses Android's NotificationListenerService to capture push notifications from financial apps. Each app has dedicated regex-based parsers that extract transaction details. All parsers are built using TDD with fixture-driven tests.

## Supported Apps

### Payoneer (`com.payoneer.android`)

**Notification Patterns:**

| Type | Title Pattern | Body Pattern |
|------|--------------|-------------|
| Payment received | "Payment Received" | "You received {amount} {currency} from {sender}" |
| Payment sent | "Payment Sent" | "You sent {amount} {currency} to {recipient}" |
| Withdrawal | "Withdrawal" | "Withdrawal of {amount} {currency} processed" |
| Fee charged | "Fee" | "Fee of {amount} {currency} charged" |

**Regex Patterns:**

```
Payment Received: /received\s+\$?(?<amount>[\d,]+\.?\d*)\s*(?<currency>[A-Z]{3})/i
Payment Sent:     /sent\s+\$?(?<amount>[\d,]+\.?\d*)\s*(?<currency>[A-Z]{3})/i
Withdrawal:       /withdrawal\s+of\s+\$?(?<amount>[\d,]+\.?\d*)\s*(?<currency>[A-Z]{3})/i
Fee:              /fee\s+of\s+\$?(?<amount>[\d,]+\.?\d*)\s*(?<currency>[A-Z]{3})/i
```

### Grey (`com.grey.android`)

**Notification Patterns:**

| Type | Title Pattern | Body Pattern |
|------|--------------|-------------|
| Deposit | "Deposit Successful" | "{amount} {currency} has been deposited" |
| Transfer | "Transfer Complete" | "You transferred {amount} {currency} to {recipient}" |
| Card payment | "Card Transaction" | "Card payment of {amount} {currency} at {merchant}" |
| Conversion | "Conversion" | "Converted {amount1} {currency1} to {amount2} {currency2}" |

**Regex Patterns:**

```
Deposit:     /(?<amount>[\d,]+\.?\d*)\s*(?<currency>[A-Z]{3})\s*(?:has been|was)\s*deposited/i
Transfer:    /transferred\s+(?<amount>[\d,]+\.?\d*)\s*(?<currency>[A-Z]{3})/i
Card:        /payment\s+of\s+(?<amount>[\d,]+\.?\d*)\s*(?<currency>[A-Z]{3})\s+at\s+(?<merchant>.+)/i
Conversion:  /converted\s+(?<amount1>[\d,]+\.?\d*)\s*(?<currency1>[A-Z]{3})\s+to\s+(?<amount2>[\d,]+\.?\d*)\s*(?<currency2>[A-Z]{3})/i
```

### Dukascopy Bank (`com.dukascopy.bank`)

**Notification Patterns:**

| Type | Title Pattern | Body Pattern |
|------|--------------|-------------|
| Incoming transfer | "Transfer Received" | "Incoming transfer: {amount} {currency}" |
| Outgoing transfer | "Transfer Sent" | "Outgoing transfer: {amount} {currency}" |
| Card charge | "Card Payment" | "Card charged: {amount} {currency} - {merchant}" |

**Regex Patterns:**

```
Incoming: /incoming\s+transfer:\s*(?<amount>[\d,]+\.?\d*)\s*(?<currency>[A-Z]{3})/i
Outgoing: /outgoing\s+transfer:\s*(?<amount>[\d,]+\.?\d*)\s*(?<currency>[A-Z]{3})/i
Card:     /card\s+charged:\s*(?<amount>[\d,]+\.?\d*)\s*(?<currency>[A-Z]{3})\s*-\s*(?<merchant>.+)/i
```

## Amount Parsing Rules

1. Remove commas: `"1,234.56"` becomes `"1234.56"`
2. Parse to float: `parseFloat("1234.56")` becomes `1234.56`
3. Convert to cents: `Math.round(1234.56 * 100)` becomes `123456`
4. Always use `Math.round()` to avoid float precision issues

## Merchant Extraction

Attempt to extract merchant from notification body after amount and currency. If not found, use the app name as the merchant (e.g., "Payoneer", "Grey").

## Deduplication Algorithm

```
hash = sha256(
  amount_cents + "|" +
  currency + "|" +
  Math.floor(timestamp / 60000) + "|" +
  source_app
)
```

- Keep an in-memory Set of last 1000 hashes for fast lookup
- Also check `transactions.source_hash` column for persistence across app restarts
- If hash exists, skip and log as duplicate in notification_logs

## Auto-Categorization

Match merchant keywords to categories:

| Keywords | Category |
|----------|----------|
| uber, lyft, taxi, transit, bus, metro | Transportation |
| restaurant, cafe, food, eat, pizza, sushi, burger | Food and Dining |
| grocery, supermarket, market, mart | Groceries |
| amazon, store, shop, mall, ebay | Shopping |
| rent, mortgage, housing, lease | Rent and Housing |
| netflix, spotify, cinema, movie, game | Entertainment |
| pharmacy, hospital, doctor, clinic, dental | Health and Medical |
| electric, water, gas, internet, phone | Utilities |
| uber eats, doordash, grubhub, deliveroo | Food and Dining |
| airbnb, hotel, flight, booking | Travel |
| gym, fitness, spa, salon | Personal Care |

If no keyword match, assign "Other" category.

## TDD Workflow for Adding a New Financial App

1. Identify the Android package name
2. Collect 10+ real notification samples (varied types)
3. Store fixtures in `__tests__/fixtures/notifications/{app}.json`
4. Write failing tests covering all notification patterns
5. Implement parser, making tests pass one by one
6. Refactor regex patterns for clarity
7. Register parser in `parser-registry.ts`
8. Add entry to `parsing_rules` table for user configurability
