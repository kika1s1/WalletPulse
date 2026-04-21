---
name: walletpulse-architecture
description: WalletPulse Clean Architecture reference including layer boundaries, data flow, module structure, and screen map. Use when building new features, adding screens, modifying data flow, or asking about how the app is structured.
---

# WalletPulse Clean Architecture

## Layer Diagram

```
┌─────────────────────────────────────────────┐
│           Presentation Layer                 │
│  Screens, Components, Stores, Hooks          │
├─────────────────────────────────────────────┤
│           Domain Layer (core)                │
│  Entities, Use Cases, Repository Interfaces  │
├─────────────────────────────────────────────┤
│    Data Layer          Infrastructure Layer   │
│  Repositories,       Notification, Currency,  │
│  DataSources         Recurring, Backup, PIN   │
└─────────────────────────────────────────────┘
```

## Dependency Flow

Domain has zero external imports. Data and Infrastructure depend inward on Domain. Presentation depends on Domain and receives data through hooks and stores.

## Module Map

### Domain (`src/domain/`)
- `entities/` — Transaction, Wallet, Category, Budget, Goal, Subscription, BillReminder, TransactionTemplate, User, Session, Tag, ParsingRule, NotificationLog, FxRate
- `usecases/` — Factory-function use cases (`make*`) plus pure helpers (`applyTemplate`, `validateTemplate`, ...)
- `repositories/` — Port interfaces (`ITransactionRepository`, `IWalletRepository`, ...)
- `value-objects/` — Money, Currency, DateRange, TransactionHash, Percentage, WalletTransferNotes

### Data (`src/data/`)
- `datasources/SupabaseDataSource.ts` — singleton factory that returns all repositories scoped to a `userId`
- `datasources/RemoteDataSource.ts` — FX API client
- `datasources/supabase-client.ts` — shared `@supabase/supabase-js` client
- `repositories/` — Supabase-backed implementations converting rows to domain entities inline
- `seed/categories.ts`, `seed/currencies.ts` — first-run seeding helpers
- `sync/settings-sync.ts` — pull/push user preferences

There is no local SQLite, no WatermelonDB, and no mapper layer. Do not reintroduce any of these.

### Presentation (`src/presentation/`)
- `screens/` — One file per screen
- `components/common/` — Button, Card, Input, Modal, Picker, Badge, Chip, ProgressBar, SwipeableRow, ...
- `components/charts/` — PieChart, BarChart, LineChart wrappers
- `components/feedback/` — Skeleton, EmptyState, ErrorState, Toast
- `components/layout/` — ScreenContainer, SectionHeader, Spacer
- `navigation/` — Tab navigator, stack navigators, route types
- `stores/` — Zustand stores for UI-only state
- `hooks/` — Data-fetching hooks that read from `getSupabaseDataSource()` and expose `{data, isLoading, error, refetch}`

### Infrastructure (`src/infrastructure/`)
- `notification/notification-handler.ts` — Starts/stops the native notification subscription
- `notification/orchestrator.ts` — Parse → dedup → create-transaction pipeline
- `notification/parser-registry.ts` — Maps package names to parsers + custom-rule fallback
- `notification/parsers/` — Payoneer, Grey, Dukascopy
- `notification/dedup-service.ts` — In-memory + DB-backed dedup
- `notification/auto-categorize.ts` — Merchant-name → category heuristic
- `notification/bill-reminder-notifications.ts`, `subscription-notifications.ts` — Outgoing Notifee reminders
- `notification/notification-event-handler.ts` — Notifee tap handling (deep-links to SettingsTab screens)
- `currency/fx-service.ts` — Fetch-and-cache + conversion helpers
- `recurring/recurring-scheduler.ts` + `recurring-scheduler-core.ts` — Auto-create transactions for due subscriptions/bills
- `backup/backup-service.ts` — Local backup file
- `security/pin-service.ts`, `biometric-service.ts`
- `native/NotificationBridge.ts`, `SecurityBridge.ts` — Native-module JS bridges

## Screen Map

| Screen | Location | Description |
|--------|----------|-------------|
| DashboardScreen | Home tab | Balance overview, insights, recent activity |
| TransactionsScreen | Transactions tab | Full list with search, filters, swipe actions |
| AddTransactionScreen | Modal | Manual entry form with currency/category pickers |
| WalletsScreen | Wallets tab | Currency wallet grid with balances |
| WalletDetailScreen | Stack push | Single wallet history and stats |
| AnalyticsScreen | Analytics tab | Charts, breakdowns, comparisons |
| BudgetsScreen | Stack push | Budget list with progress bars |
| GoalsListScreen / GoalDetailScreen | Stack push | Financial goal tracking |
| SettingsScreen | Settings tab | Preferences, parsing, backup, security |
| NotificationLogScreen | Dev mode | Raw notification debug viewer |
| OnboardingScreen | First launch | Welcome flow with currency/app setup |

## Data Flow: Notification to Transaction

```
1. NotificationListenerService (Kotlin) captures notification
2. Native module sends {packageName, title, body, timestamp} to JS
3. Parser registry matches packageName to parser (or falls back to custom rules)
4. Parser returns ParsedTransaction or null
5. Dedup service hashes {amount, currency, receivedAt, source} and checks against recent transactions
6. Use case CreateTransaction validates and writes to Supabase via TransactionRepository
7. Next time a presentation hook refetches (screen focus / refetch key), UI reflects the new transaction
```

## State Management

- **Zustand stores** for ephemeral UI state only (filters, modal visibility, form drafts, PIN state, theme preference)
- **Supabase via hooks** for persistent data. Hooks own a small `useState` cache plus a `refetchKey` to re-run queries; they do not subscribe to real-time changes today.
- Use domain use cases for all write operations; never call `supabase.from(...)` or `repo.save()` directly from a component.

## For detailed feature list, see `docs/PRD.md`
