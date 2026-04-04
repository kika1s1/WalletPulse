# WalletPulse: Database Schema

## Overview

All data is stored locally using WatermelonDB with SQLiteAdapter. Schema version is tracked and migrated automatically. The schema supports all 26 features defined in the PRD.

## Tables

### wallets

One wallet per currency with balance tracking.

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| id | string | PK | WatermelonDB auto-generated |
| currency | string | YES | ISO 4217 currency code (e.g., "USD") |
| name | string | NO | Display name (e.g., "US Dollar Wallet") |
| balance | number | NO | Current balance in cents (auto-calculated) |
| is_active | boolean | NO | Whether wallet is visible |
| icon | string | NO | Emoji or icon name |
| color | string | NO | Hex color for wallet card |
| sort_order | number | NO | Display ordering |
| created_at | number | NO | Unix timestamp ms |
| updated_at | number | NO | Unix timestamp ms |

### transactions

All income, expense, and transfer records.

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| id | string | PK | WatermelonDB auto-generated |
| wallet_id | string | YES | FK to wallets |
| category_id | string | YES | FK to categories |
| amount | number | NO | Amount in cents (always positive) |
| currency | string | YES | ISO 4217 currency code |
| type | string | YES | "income", "expense", or "transfer" |
| description | string | NO | User-entered or auto-generated description |
| merchant | string | YES | Merchant name (from parser or manual) |
| source | string | YES | "manual", "payoneer", "grey", "dukascopy" |
| source_hash | string | YES | Dedup hash for auto-detected transactions |
| tags | string | NO | JSON-encoded array of tag strings |
| receipt_uri | string | NO | Local file path to receipt image |
| is_recurring | boolean | NO | Whether this is a recurring entry |
| recurrence_rule | string | NO | Cron-like rule for recurring |
| confidence | number | NO | Parser confidence score (0 to 1) |
| location_lat | number | NO | Latitude (optional) |
| location_lng | number | NO | Longitude (optional) |
| location_name | string | NO | Place name (optional) |
| notes | string | NO | Extended notes field |
| is_template | boolean | NO | Whether saved as template |
| template_name | string | NO | Template display name |
| transaction_date | number | YES | When the transaction occurred (ms) |
| created_at | number | NO | When the record was created (ms) |
| updated_at | number | NO | Last update timestamp (ms) |

### categories

Expense and income categories.

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| id | string | PK | WatermelonDB auto-generated |
| name | string | YES | Category display name |
| icon | string | NO | Emoji or icon name |
| color | string | NO | Hex color code |
| type | string | NO | "expense", "income", or "both" |
| parent_id | string | YES | FK to categories (for subcategories) |
| is_default | boolean | NO | Whether it is a predefined category |
| is_archived | boolean | NO | Whether category is archived |
| sort_order | number | NO | Display ordering |
| created_at | number | NO | Unix timestamp ms |
| updated_at | number | NO | Unix timestamp ms |

### budgets

Monthly and weekly budget limits per category.

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| id | string | PK | WatermelonDB auto-generated |
| category_id | string | YES | FK to categories (null for overall budget) |
| amount | number | NO | Budget limit in cents |
| currency | string | NO | Budget currency |
| period | string | NO | "weekly" or "monthly" |
| start_date | number | YES | Period start timestamp |
| end_date | number | YES | Period end timestamp |
| rollover | boolean | NO | Carry unused to next period |
| is_active | boolean | NO | Whether budget is active |
| created_at | number | NO | Unix timestamp ms |
| updated_at | number | NO | Unix timestamp ms |

### goals

Financial savings goals with tracking.

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| id | string | PK | WatermelonDB auto-generated |
| name | string | NO | Goal display name |
| target_amount | number | NO | Target amount in cents |
| current_amount | number | NO | Current saved amount in cents |
| currency | string | NO | Goal currency |
| deadline | number | NO | Target completion date (ms) |
| icon | string | NO | Goal icon |
| color | string | NO | Goal color |
| category | string | NO | "emergency", "vacation", "purchase", "investment", "custom" |
| is_completed | boolean | NO | Whether goal is achieved |
| completed_at | number | NO | When goal was reached (ms) |
| created_at | number | NO | Unix timestamp ms |
| updated_at | number | NO | Unix timestamp ms |

### subscriptions

Recurring subscription tracking.

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| id | string | PK | WatermelonDB auto-generated |
| name | string | YES | Subscription name |
| amount | number | NO | Amount in cents |
| currency | string | NO | Subscription currency |
| billing_cycle | string | NO | "weekly", "monthly", "quarterly", "yearly" |
| next_due_date | number | YES | Next billing date (ms) |
| category_id | string | YES | FK to categories |
| is_active | boolean | NO | Whether subscription is active |
| cancelled_at | number | NO | When cancelled (ms, null if active) |
| icon | string | NO | Subscription icon |
| color | string | NO | Subscription color |
| created_at | number | NO | Unix timestamp ms |
| updated_at | number | NO | Unix timestamp ms |

### bill_reminders

Upcoming bill due dates and payment tracking.

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| id | string | PK | WatermelonDB auto-generated |
| name | string | NO | Bill name |
| amount | number | NO | Bill amount in cents |
| currency | string | NO | Bill currency |
| due_date | number | YES | Due date (ms) |
| recurrence | string | NO | "once", "weekly", "monthly", "quarterly", "yearly" |
| category_id | string | YES | FK to categories |
| is_paid | boolean | NO | Whether bill is paid for current period |
| paid_transaction_id | string | NO | FK to transactions when paid |
| remind_days_before | number | NO | Days before due to send reminder |
| created_at | number | NO | Unix timestamp ms |
| updated_at | number | NO | Unix timestamp ms |

### fx_rates

Cached exchange rates.

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| id | string | PK | WatermelonDB auto-generated |
| base_currency | string | YES | Base currency code |
| target_currency | string | YES | Target currency code |
| rate | number | NO | Exchange rate (float, 6 decimal precision) |
| fetched_at | number | YES | When this rate was fetched (ms) |
| created_at | number | NO | Unix timestamp ms |
| updated_at | number | NO | Unix timestamp ms |

### notification_logs

Debug log of all captured notifications.

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| id | string | PK | WatermelonDB auto-generated |
| package_name | string | YES | Android app package name |
| title | string | NO | Notification title |
| body | string | NO | Notification body text |
| parsed_successfully | boolean | YES | Whether parsing succeeded |
| parse_result | string | NO | JSON-encoded ParsedTransaction or error |
| transaction_id | string | NO | FK to transactions (if created) |
| received_at | number | YES | When notification was received (ms) |
| created_at | number | NO | Unix timestamp ms |
| updated_at | number | NO | Unix timestamp ms |

### parsing_rules

Configurable regex patterns per source app.

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| id | string | PK | WatermelonDB auto-generated |
| source_app | string | YES | App identifier (e.g., "payoneer") |
| package_name | string | YES | Android package name |
| rule_name | string | NO | Human-readable rule name |
| pattern | string | NO | Regex pattern string |
| transaction_type | string | NO | "income" or "expense" |
| is_active | boolean | NO | Whether rule is enabled |
| priority | number | NO | Rule evaluation order |
| created_at | number | NO | Unix timestamp ms |
| updated_at | number | NO | Unix timestamp ms |

### tags

User-defined tags for transaction organization.

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| id | string | PK | WatermelonDB auto-generated |
| name | string | YES | Tag display name |
| color | string | NO | Tag color (optional) |
| usage_count | number | NO | Number of transactions using this tag |
| created_at | number | NO | Unix timestamp ms |
| updated_at | number | NO | Unix timestamp ms |

### app_settings

User preferences and configuration stored locally.

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| id | string | PK | WatermelonDB auto-generated |
| key | string | YES | Setting key name |
| value | string | NO | JSON-encoded setting value |
| created_at | number | NO | Unix timestamp ms |
| updated_at | number | NO | Unix timestamp ms |

## Relationships

```
wallets 1 to many transactions
categories 1 to many transactions
categories 1 to many budgets
categories 1 to many subscriptions
categories 1 to many bill_reminders
categories 1 to many categories (self-referencing for subcategories)
notification_logs 1 to 0..1 transactions (optional link)
bill_reminders 1 to 0..1 transactions (paid link)
```

## Default Categories (Seed Data)

| Name | Icon | Color | Type |
|------|------|-------|------|
| Food and Dining | fork-knife | #FF6B6B | expense |
| Groceries | shopping-cart | #E17055 | expense |
| Transportation | car | #4ECDC4 | expense |
| Shopping | bag | #45B7D1 | expense |
| Entertainment | film | #96CEB4 | expense |
| Health and Medical | heart-pulse | #FFEAA7 | expense |
| Rent and Housing | home | #DDA0DD | expense |
| Utilities | lightbulb | #98D8C8 | expense |
| Business | briefcase | #6C5CE7 | both |
| Travel | airplane | #FD79A8 | expense |
| Education | graduation-cap | #74B9FF | expense |
| Personal Care | sparkles | #FDA7DF | expense |
| Gifts and Donations | gift | #FF9FF3 | expense |
| Insurance | shield-check | #55EFC4 | expense |
| Taxes | receipt | #636E72 | expense |
| Salary | banknotes | #00B894 | income |
| Freelance Income | laptop | #0984E3 | income |
| Investment Returns | trending-up | #6C5CE7 | income |
| Transfer | arrows-right-left | #636E72 | both |
| Subscriptions | refresh | #E056A0 | expense |
| Other | ellipsis | #B2BEC3 | both |

## Migration Strategy

- Every schema change increments the version number
- Add migration step in `src/data/database/migrations.ts`
- Never rename or remove columns; add new ones and deprecate old
- Test migrations against WatermelonDB test adapter
- Write a migration test for each version increment
