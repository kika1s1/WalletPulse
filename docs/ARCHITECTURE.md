# WalletPulse: Clean Architecture Document

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
│  DB Models, Repositories,    │  Notification, Currency API,  │
│  Mappers, Data Sources       │  Export, Backup, Native       │
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

**Domain has zero imports from any other layer.** Data and Infrastructure depend inward on Domain. Presentation depends on Domain and accesses data through hooks and stores. Shared is accessible from all layers.

## Complete Directory Structure

```
WalletPulse/
├── android/                           # Android native project
│   └── app/src/main/
│       ├── java/.../                  # Kotlin native modules
│       │   ├── NotificationListenerModule.kt
│       │   └── NotificationListenerPackage.kt
│       └── AndroidManifest.xml
├── src/
│   ├── domain/                        # DOMAIN LAYER (pure business logic)
│   │   ├── entities/
│   │   │   ├── Transaction.ts
│   │   │   ├── Wallet.ts
│   │   │   ├── Category.ts
│   │   │   ├── Budget.ts
│   │   │   ├── Goal.ts
│   │   │   ├── Subscription.ts
│   │   │   ├── BillReminder.ts
│   │   │   ├── FxRate.ts
│   │   │   └── NotificationLog.ts
│   │   ├── value-objects/
│   │   │   ├── Money.ts
│   │   │   ├── Currency.ts
│   │   │   ├── DateRange.ts
│   │   │   ├── TransactionHash.ts
│   │   │   └── Percentage.ts
│   │   ├── usecases/
│   │   │   ├── create-transaction.ts
│   │   │   ├── delete-transaction.ts
│   │   │   ├── update-transaction.ts
│   │   │   ├── get-transactions.ts
│   │   │   ├── create-wallet.ts
│   │   │   ├── calculate-wallet-balance.ts
│   │   │   ├── convert-currency.ts
│   │   │   ├── calculate-budget-progress.ts
│   │   │   ├── calculate-goal-progress.ts
│   │   │   ├── generate-insight.ts
│   │   │   ├── detect-duplicates.ts
│   │   │   ├── search-transactions.ts
│   │   │   └── calculate-analytics.ts
│   │   └── repositories/
│   │       ├── ITransactionRepository.ts
│   │       ├── IWalletRepository.ts
│   │       ├── ICategoryRepository.ts
│   │       ├── IBudgetRepository.ts
│   │       ├── IGoalRepository.ts
│   │       ├── IFxRateRepository.ts
│   │       ├── INotificationLogRepository.ts
│   │       └── ISettingsRepository.ts
│   │
│   ├── data/                          # DATA LAYER (DB implementations)
│   │   ├── database/
│   │   │   ├── index.ts              # Database singleton
│   │   │   ├── schema.ts            # appSchema definition
│   │   │   ├── migrations.ts        # schemaMigrations
│   │   │   └── models/
│   │   │       ├── TransactionModel.ts
│   │   │       ├── WalletModel.ts
│   │   │       ├── CategoryModel.ts
│   │   │       ├── BudgetModel.ts
│   │   │       ├── GoalModel.ts
│   │   │       ├── SubscriptionModel.ts
│   │   │       ├── BillReminderModel.ts
│   │   │       ├── FxRateModel.ts
│   │   │       ├── NotificationLogModel.ts
│   │   │       ├── ParsingRuleModel.ts
│   │   │       ├── TransactionTemplateModel.ts
│   │   │       ├── TagModel.ts
│   │   │       └── AppSettingsModel.ts
│   │   ├── repositories/
│   │   │   ├── TransactionRepository.ts
│   │   │   ├── WalletRepository.ts
│   │   │   ├── CategoryRepository.ts
│   │   │   ├── BudgetRepository.ts
│   │   │   ├── GoalRepository.ts
│   │   │   ├── FxRateRepository.ts
│   │   │   ├── NotificationLogRepository.ts
│   │   │   └── SettingsRepository.ts
│   │   ├── datasources/
│   │   │   ├── LocalDataSource.ts
│   │   │   └── RemoteDataSource.ts
│   │   ├── mappers/
│   │   │   ├── transaction-mapper.ts
│   │   │   ├── wallet-mapper.ts
│   │   │   ├── category-mapper.ts
│   │   │   ├── budget-mapper.ts
│   │   │   └── fx-rate-mapper.ts
│   │   └── seed/
│   │       ├── categories.ts         # Default category data
│   │       └── currencies.ts         # ISO 4217 currency list
│   │
│   ├── presentation/                  # PRESENTATION LAYER (UI)
│   │   ├── navigation/
│   │   │   ├── AppNavigator.tsx
│   │   │   ├── TabNavigator.tsx
│   │   │   ├── HomeStack.tsx
│   │   │   ├── TransactionsStack.tsx
│   │   │   ├── WalletsStack.tsx
│   │   │   ├── AnalyticsStack.tsx
│   │   │   ├── SettingsStack.tsx
│   │   │   └── types.ts             # Route param types
│   │   ├── screens/
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── TransactionsScreen.tsx
│   │   │   ├── AddTransactionScreen.tsx
│   │   │   ├── EditTransactionScreen.tsx
│   │   │   ├── TransactionDetailScreen.tsx
│   │   │   ├── WalletsScreen.tsx
│   │   │   ├── WalletDetailScreen.tsx
│   │   │   ├── AnalyticsScreen.tsx
│   │   │   ├── BudgetsScreen.tsx
│   │   │   ├── BudgetDetailScreen.tsx
│   │   │   ├── GoalsScreen.tsx
│   │   │   ├── GoalDetailScreen.tsx
│   │   │   ├── SearchScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   ├── CurrencyConverterScreen.tsx
│   │   │   ├── CategoryManagementScreen.tsx
│   │   │   ├── NotificationLogScreen.tsx
│   │   │   └── OnboardingScreen.tsx
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── BottomSheet.tsx
│   │   │   │   ├── AmountInput.tsx
│   │   │   │   ├── CurrencyPicker.tsx
│   │   │   │   ├── CategoryPicker.tsx
│   │   │   │   ├── DatePicker.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Chip.tsx
│   │   │   │   ├── Toggle.tsx
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   ├── ProgressRing.tsx
│   │   │   │   ├── FAB.tsx
│   │   │   │   └── SwipeableRow.tsx
│   │   │   ├── charts/
│   │   │   │   ├── SpendingPieChart.tsx
│   │   │   │   ├── SpendingBarChart.tsx
│   │   │   │   ├── FlowLineChart.tsx
│   │   │   │   └── MiniBarChart.tsx
│   │   │   ├── feedback/
│   │   │   │   ├── Skeleton.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── ErrorState.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── PullToRefresh.tsx
│   │   │   ├── layout/
│   │   │   │   ├── ScreenContainer.tsx
│   │   │   │   ├── SectionHeader.tsx
│   │   │   │   ├── Divider.tsx
│   │   │   │   └── Spacer.tsx
│   │   │   ├── TransactionCard.tsx
│   │   │   ├── WalletCard.tsx
│   │   │   ├── InsightCard.tsx
│   │   │   ├── BudgetCard.tsx
│   │   │   ├── GoalCard.tsx
│   │   │   └── BalanceHeader.tsx
│   │   ├── stores/
│   │   │   ├── useFilterStore.ts
│   │   │   ├── useSettingsStore.ts
│   │   │   ├── useAppStore.ts
│   │   │   ├── useOnboardingStore.ts
│   │   │   └── useSearchStore.ts
│   │   └── hooks/
│   │       ├── useWallets.ts
│   │       ├── useTransactions.ts
│   │       ├── useCategories.ts
│   │       ├── useFxRates.ts
│   │       ├── useBudgets.ts
│   │       ├── useGoals.ts
│   │       ├── useInsights.ts
│   │       ├── useSearch.ts
│   │       ├── useTheme.ts
│   │       └── useCurrencyFormat.ts
│   │
│   ├── infrastructure/                # INFRASTRUCTURE LAYER
│   │   ├── notification/
│   │   │   ├── listener.ts
│   │   │   ├── parser-registry.ts
│   │   │   ├── dedup.ts
│   │   │   ├── types.ts
│   │   │   └── parsers/
│   │   │       ├── payoneer.ts
│   │   │       ├── grey.ts
│   │   │       └── dukascopy.ts
│   │   ├── currency/
│   │   │   ├── fx-api.ts
│   │   │   ├── converter.ts
│   │   │   ├── cache.ts
│   │   │   └── scheduler.ts
│   │   ├── export/
│   │   │   ├── csv.ts
│   │   │   ├── excel.ts
│   │   │   └── pdf.ts
│   │   ├── backup/
│   │   │   ├── local.ts
│   │   │   └── google-drive.ts
│   │   └── native/
│   │       └── notification-listener.ts
│   │
│   ├── shared/                        # SHARED (cross-cutting)
│   │   ├── theme/
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   ├── spacing.ts
│   │   │   ├── shadows.ts
│   │   │   ├── radius.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── navigation.ts
│   │   │   ├── database.ts
│   │   │   └── common.ts
│   │   ├── utils/
│   │   │   ├── format-currency.ts
│   │   │   ├── date-helpers.ts
│   │   │   ├── hash.ts
│   │   │   └── validators.ts
│   │   └── constants/
│   │       ├── currencies.ts
│   │       ├── categories.ts
│   │       └── app.ts
│   │
│   └── app/                           # APP ENTRY
│       ├── App.tsx
│       └── Providers.tsx
│
├── __tests__/                         # TESTS (mirrors src/)
│   ├── domain/
│   │   ├── entities/
│   │   ├── usecases/
│   │   └── value-objects/
│   ├── data/
│   │   ├── repositories/
│   │   └── mappers/
│   ├── presentation/
│   │   ├── screens/
│   │   ├── components/
│   │   └── hooks/
│   ├── infrastructure/
│   │   ├── notification/parsers/
│   │   └── currency/
│   └── fixtures/
│       └── notifications/
│           ├── payoneer.json
│           ├── grey.json
│           └── dukascopy.json
│
├── docs/                              # Documentation
├── .cursor/                           # Cursor rules and skills
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
├── .env.example
├── .gitignore
└── README.md
```

## Data Flow Diagrams

### Notification to Transaction

```
1. NotificationListenerService (Kotlin) captures notification
2. Extract: packageName, title, body, timestamp
3. Send to JS via NativeEventEmitter
4. parser-registry.ts finds parser by packageName
5. Parser returns ParsedTransaction or null
6. If null: log to notification_logs, stop
7. If valid: generate dedup hash (value object)
8. Check hash against recent hashes (in-memory Set + DB)
9. If duplicate: log and stop
10. If new: CreateTransaction use case executes:
    a. Validate transaction data (domain entity)
    b. Map to DB model (mapper)
    c. Write to DB in batch (transaction record + wallet balance update)
    d. Log to notification_logs (success)
11. WatermelonDB observable fires, presentation layer updates
```

### Currency Conversion

```
1. Presentation hook requests converted amount
2. useFxRates() hook provides rates from DB observable
3. Convert use case: convert(Money, targetCurrency, rates)
4. If rates missing: show original currency with stale indicator
5. Background: scheduler checks rate freshness every 12 hours
6. If stale: fetch from API, update fx_rates table, observables fire
```

### User Creates Transaction (Manual)

```
1. User fills form in AddTransactionScreen
2. Store holds form draft state (Zustand)
3. On submit: CreateTransaction use case validates input
4. Use case calls ITransactionRepository.save()
5. Repository implementation maps entity to model and writes
6. WatermelonDB batch: create transaction + update wallet balance
7. Observable fires, DashboardScreen and TransactionsScreen update
8. Toast confirmation shown to user
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Clean Architecture | Testable, maintainable, clear boundaries |
| Database | WatermelonDB | Reactive, lazy-loading, offline-first, great RN integration |
| State | Zustand + DB observables | Zustand for UI; DB observables for data; no duplication |
| Amounts | Integer cents | Avoid floating-point rounding in financial calculations |
| Parsers | Pure functions | Fully testable, no side effects, easy to extend |
| FX rates | Daily cache | Free API tier limit; rates stable intra-day |
| Navigation | React Navigation 7 | Industry standard, typed navigation, bottom tabs + stack |
| Testing | TDD with Jest | Write tests first; high reliability for financial data |
| No backend | Local-only | Privacy-first, works offline, zero server costs |
| UI | Enterprise design system | Compete on UX quality with top expense trackers |
