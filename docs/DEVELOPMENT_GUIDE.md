# WalletPulse: Development Guide

## Build Order (TDD, Phased Approach)

Every phase follows the TDD cycle: write failing test, implement, refactor. Each phase builds on the previous one.

### Phase 1: Project Foundation

1. Initialize React Native project with TypeScript template
2. Configure path aliases (tsconfig + babel module-resolver)
3. Install and configure WatermelonDB with SQLiteAdapter
4. Define complete schema (all 13 tables) and seed data
5. Set up React Navigation (bottom tabs + stacks)
6. Create shared theme system (colors, typography, spacing, shadows)
7. Build core feedback components (Skeleton, EmptyState, ErrorState)
8. Build layout components (ScreenContainer, SectionHeader)
9. Build basic screen shells for all routes
10. Configure Jest with WatermelonDB test adapter

```bash
npx @react-native-community/cli init WalletPulse --template react-native-template-typescript
```

### Phase 2: Domain Layer (TDD)

1. Write tests for domain entities (Transaction, Wallet, Category, Budget)
2. Implement domain entities as pure TypeScript types
3. Write tests for value objects (Money, Currency, DateRange)
4. Implement value objects with conversion and formatting logic
5. Define repository interfaces (ports)
6. Write tests for use cases (CreateTransaction, ConvertCurrency, CalculateBudget)
7. Implement use cases using repository interfaces

### Phase 3: Data Layer (TDD)

1. Write tests for mappers (entity to/from DB model)
2. Implement WatermelonDB models with decorators
3. Implement mappers
4. Write tests for repository implementations (using WatermelonDB test adapter)
5. Implement repositories with WatermelonDB queries
6. Create seed script for default categories
7. Verify all domain tests still pass (integration)

### Phase 4: Manual Transaction Entry

1. Build common components: Button, Card, Input, AmountInput
2. Build CurrencyPicker (searchable bottom sheet with flags)
3. Build CategoryPicker (icon grid)
4. Build AddTransactionScreen with form validation
5. Test CreateTransaction use case end-to-end
6. Build TransactionsScreen with FlashList and swipe actions
7. Add edit and delete functionality with undo toast

### Phase 5: Smart Dashboard

1. Build BalanceHeader component (animated number display)
2. Build income/expense summary pills
3. Build quick action FAB with action menu
4. Build MiniBarChart for 7-day spending overview
5. Build TransactionCard component with press animation
6. Build InsightCard component with smart messages
7. Wire up WatermelonDB observables for real-time updates
8. Add skeleton loading and pull-to-refresh

### Phase 6: Multi-Currency and FX Rates (TDD)

1. Write tests for Money value object conversion
2. Write tests for FX API client (mock fetch)
3. Implement FX API client (fx-api.ts)
4. Build rate caching logic (WatermelonDB fx_rates table)
5. Write tests for converter functions
6. Implement converter.ts
7. Add background fetch for daily rate updates
8. Integrate conversion into dashboard and transaction display
9. Build CurrencyConverterScreen

### Phase 7: Notification Listener (TDD, Android Native)

1. Collect real notification samples from Payoneer, Grey, Dukascopy
2. Write failing tests for each parser (fixture-driven)
3. Implement parsers until tests pass
4. Write tests for deduplication logic
5. Implement dedup service
6. Create Kotlin NotificationListenerService
7. Build React Native native module bridge
8. Implement notification event emitter (JS side)
9. Build parser registry
10. Wire up full flow: notification to parsed transaction to DB write to UI update

### Phase 8: Wallets and Budgets

1. Build WalletsScreen (grid layout with wallet cards)
2. Build WalletDetailScreen (history + balance chart)
3. Implement wallet balance auto-calculation
4. Build BudgetsScreen with progress bars
5. Build BudgetDetailScreen with spending breakdown
6. Add budget alert notifications

### Phase 9: Search, Tags, and Analytics

1. Build SearchScreen with real-time filtering
2. Implement tag system (add, filter, auto-complete)
3. Build AnalyticsScreen with interactive charts
4. Build drill-down from chart to transaction list
5. Add comparison mode (this vs last period)

### Phase 10: Settings, Onboarding, and Polish

1. Build SettingsScreen with all preferences
2. Build OnboardingScreen (welcome carousel + setup)
3. Implement dark mode with system preference
4. Add haptic feedback to all interactive elements
5. Add entry/exit animations to all screens
6. Polish empty states with illustrations
7. Performance profiling and optimization

### Phase 11: Phase 2 Features

- Financial goals tracking
- Subscription monitoring
- Bill reminders with notifications
- Receipt capture and management
- Transaction templates
- App lock (PIN and biometrics)
- Export (CSV, Excel, PDF)
- Backup and restore
- Developer tools

### Phase 12: Phase 3 Features

- Android home screen widget
- Spending predictions and forecasts
- Split expenses

## Development Commands

```bash
# Start Metro bundler
npm start

# Run on Android device/emulator
npm run android

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests for specific file
npm test -- --testPathPattern=create-transaction

# Type check
npx tsc --noEmit

# Lint
npx eslint src/ --ext .ts,.tsx

# Lint and fix
npx eslint src/ --ext .ts,.tsx --fix

# Format
npx prettier --write src/

# Run all quality checks
npm run check
```

## Testing Strategy

| Layer | Tool | Focus | TDD? |
|-------|------|-------|------|
| Domain entities | Jest | Validation, business rules | Always |
| Value objects | Jest | Conversion, formatting, equality | Always |
| Use cases | Jest | Business logic with mocked repos | Always |
| Notification parsers | Jest + fixtures | Regex matching against real data | Always |
| Currency converter | Jest | Math accuracy | Always |
| Repository impls | Jest + WatermelonDB adapter | CRUD operations | Always |
| Mappers | Jest | Entity/model conversion | Always |
| Components | @testing-library/react-native | Render + interaction | For complex components |
| Screens | @testing-library/react-native | State handling | For critical flows |
| Integration | Manual + device testing | Full notification flow | Manual |

## Code Quality Pipeline

```
Pre-commit hook (husky + lint-staged):
  1. TypeScript type check (tsc --noEmit)
  2. ESLint on staged files
  3. Prettier on staged files
  4. Jest on related test files
```

## Debugging Tips

- Use Flipper for React Native debugging and WatermelonDB inspection
- Check `notification_logs` table for raw notification data
- Use developer mode regex panel to test patterns
- `adb logcat | rg WalletPulse` for native module logs
- React DevTools for component hierarchy inspection
- Reanimated worklet debugging via console.log in worklets
