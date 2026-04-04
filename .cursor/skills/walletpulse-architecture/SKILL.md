---
name: walletpulse-architecture
description: WalletPulse Clean Architecture reference including layer boundaries, data flow, module structure, database schema, and screen map. Use when building new features, adding screens, modifying data flow, or asking about how the app is structured.
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
│  DB Models, Mappers  Export, Native Bridges   │
└─────────────────────────────────────────────┘
```

## Dependency Flow

Domain has zero external imports. Data and Infrastructure depend inward on Domain. Presentation depends on Domain and receives data through hooks and stores.

## Module Map

### Domain (`src/domain/`)
- `entities/` - Transaction, Wallet, Category, Budget, Goal, Subscription, BillReminder
- `usecases/` - CreateTransaction, ConvertCurrency, CalculateBudget, GenerateInsight
- `repositories/` - ITransactionRepository, IWalletRepository, ICategoryRepository, IFxRateRepository
- `value-objects/` - Money, Currency, DateRange, TransactionHash, Percentage

### Data (`src/data/`)
- `database/schema.ts` - WatermelonDB appSchema
- `database/migrations.ts` - Schema migration steps
- `database/models/` - WatermelonDB Model classes (one per table)
- `repositories/` - Repository implementations using WatermelonDB queries
- `datasources/` - LocalDataSource (SQLite), RemoteDataSource (FX API)
- `mappers/` - Entity to/from DB model converters

### Presentation (`src/presentation/`)
- `screens/` - One file per screen
- `components/common/` - Button, Card, Input, Modal, Picker, Badge
- `components/charts/` - PieChart, BarChart, LineChart wrappers
- `components/feedback/` - Skeleton, EmptyState, ErrorState, Toast
- `components/layout/` - Header, Container, Section, Divider
- `navigation/` - Tab navigator, stack navigators, route types
- `stores/` - Zustand stores for UI-only state
- `hooks/` - Hooks bridging DB observables to components

### Infrastructure (`src/infrastructure/`)
- `notification/listener.ts` - Native module bridge
- `notification/parser-registry.ts` - Maps packages to parsers
- `notification/parsers/` - Payoneer, Grey, Dukascopy parsers
- `notification/dedup.ts` - Deduplication logic
- `currency/fx-api.ts` - Exchange rate API client
- `currency/converter.ts` - Pure conversion functions
- `currency/cache.ts` - Rate caching with WatermelonDB
- `currency/scheduler.ts` - Background refresh task
- `export/` - CSV, Excel, PDF generators
- `backup/` - Local file and Google Drive backup

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
| GoalsScreen | Stack push | Financial goal tracking |
| SettingsScreen | Settings tab | Preferences, parsing, backup, security |
| NotificationLogScreen | Dev mode | Raw notification debug viewer |
| OnboardingScreen | First launch | Welcome flow with currency/app setup |

## Data Flow: Notification to Transaction

```
1. NotificationListenerService (Kotlin) captures notification
2. Native module sends {packageName, title, body, timestamp} to JS
3. Parser registry matches packageName to parser
4. Parser returns ParsedTransaction or null
5. Dedup service checks hash against recent hashes
6. Use case CreateTransaction validates and writes to DB
7. WatermelonDB observable fires, UI updates automatically
```

## State Management

- **WatermelonDB observables** for all persistent data
- **Zustand stores** for ephemeral UI state only (filters, modal visibility, form drafts)
- Never duplicate DB data in Zustand; subscribe to WatermelonDB directly
- Use domain use cases for all write operations; never write to DB from presentation layer

## For detailed schema, see `docs/DATABASE_SCHEMA.md`
## For full feature list, see `docs/PRD.md`
