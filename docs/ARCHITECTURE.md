# WalletPulse: Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                        │
│  Screens, Components, Navigation, Stores, Hooks              │
├─────────────────────────────────────────────────────────────┤
│                       Domain Layer                            │
│  Entities, Value Objects, Use Cases, Repository Interfaces   │
├──────────────────────────────┬──────────────────────────────┤
│       Data Layer             │    Infrastructure Layer        │
│  Supabase Repositories,      │  Notification, Currency,       │
│  DataSources, Seed, Sync     │  Recurring, Backup, Security   │
├──────────────────────────────┴──────────────────────────────┤
│                     Shared Layer                              │
│  Theme, Types, Utils, Constants                              │
└─────────────────────────────────────────────────────────────┘
```

## Dependency Rule

```
Presentation ──> Domain <── Data
                   ^
                   │
             Infrastructure
```

Domain has zero imports from any other layer. Data and Infrastructure depend inward on Domain. Presentation depends on Domain and accesses data through hooks and stores. Shared is accessible from all layers.

## Persistence Model

All persistent data lives in Supabase Postgres. There is no local SQLite and no WatermelonDB. Every repository implementation in `src/data/repositories/` wraps `@supabase/supabase-js` queries and scopes rows by `user_id`.

- A single `SupabaseDataSource` (see `src/data/datasources/SupabaseDataSource.ts`) exposes typed repositories for the currently signed-in user.
- Presentation hooks call repositories inside `useEffect` and expose `{data, isLoading, error, refetch}`. There are no real-time subscriptions today.
- `src/data/sync/settings-sync.ts` handles user-preference pull/push, debounced on Zustand state changes.

## Source Tree (condensed)

```
src/
├── app/                          # Entry + Providers
├── domain/
│   ├── entities/                 # Transaction, Wallet, Category, Budget, Goal,
│   │                             # Subscription, BillReminder, TransactionTemplate,
│   │                             # User, Session, Tag, ParsingRule, FxRate, NotificationLog
│   ├── repositories/             # I*Repository port interfaces
│   ├── usecases/                 # make* factories + pure helpers
│   └── value-objects/            # Money, Currency, DateRange, TransactionHash,
│                                 # Percentage, WalletTransferNotes
├── data/
│   ├── datasources/
│   │   ├── SupabaseDataSource.ts
│   │   ├── RemoteDataSource.ts   # FX API client
│   │   └── supabase-client.ts
│   ├── repositories/             # TransactionRepository, WalletRepository, ...
│   ├── seed/                     # categories.ts, currencies.ts
│   └── sync/settings-sync.ts
├── presentation/
│   ├── navigation/
│   ├── screens/
│   ├── components/               # common / charts / feedback / layout / feature
│   ├── stores/                   # Zustand stores
│   └── hooks/
├── infrastructure/
│   ├── notification/             # listener, orchestrator, parsers, dedup,
│   │                             # auto-categorize, Notifee reminders, tap handler
│   ├── currency/fx-service.ts
│   ├── recurring/                # recurring-scheduler + core
│   ├── backup/backup-service.ts
│   ├── security/                 # pin-service, biometric-service
│   └── native/                   # JS bridges to native modules
└── shared/
    ├── theme/
    ├── types/
    ├── utils/
    └── constants/
```

## Data Flows

### Notification → Transaction

```
1. Android NotificationListenerService (Kotlin) captures the notification
2. Native bridge sends {packageName, title, body, receivedAt} to JS
3. parser-registry.ts dispatches to a per-package parser, or falls back to user-defined regex rules
4. If parsing succeeds, dedup-service.ts hashes {amount, currency, receivedAt, source} and checks recent hashes
5. makeCreateTransaction writes the row through TransactionRepository
6. Notification log row is written regardless of outcome, for the debug viewer
```

### Currency Conversion

```
1. Presentation hook requests a rate via makeGetConversionRate({fxRateRepo})
2. Repository reads cached rates from Supabase fx_rates
3. On miss, hook/caller invokes makeFetchAndCacheRates, which writes the latest rates back through the same repo
4. convertAmountCents applies the rate (Math.round)
```

### Manual Transaction Creation

```
1. AddTransactionScreen collects form state in local component state
2. On submit: makeCreateTransaction validates input, writes transaction + updates wallet balance
3. Consumer screens refetch on focus (or via returned refetch()), and the new row appears
4. Toast confirms success; failures surface via error state
```

## Auth (Current State)

The app uses a custom Supabase-table-based auth (users/sessions rows + SHA-256 salted password) with tokens stored in `react-native-keychain`. This predates Supabase Auth and is a known migration target. Until migrated, do not add new features that depend on JWTs, RLS based on `auth.uid()`, or Supabase-managed password reset flows.

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Clean Architecture | Testable, maintainable, clear boundaries |
| Persistence | Supabase Postgres | Single source of truth; no local DB duplication |
| State | Zustand for UI + hooks over Supabase | Avoid duplicating DB data in Zustand |
| Amounts | Integer cents | Avoid floating-point rounding in financial calculations |
| Parsers | Pure functions | Fully testable, no side effects, easy to extend |
| FX rates | Daily cache in Supabase | Free API tier limit; rates stable intra-day |
| Navigation | React Navigation 7 | Industry standard, typed navigation, bottom tabs + stack |
| Testing | TDD with Jest | Write tests first; high reliability for financial data |
