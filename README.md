# WalletPulse

**Smart, offline-first expense tracker for Android.**

WalletPulse automatically detects financial transactions from push notifications (Payoneer, Grey, Dukascopy Bank), parses transaction details via regex, and logs everything to a local database with real-time multi-currency conversion. Built with React Native and Clean Architecture, tested with TDD (546 tests across 62 suites).

---

## Highlights

- **Auto-detect transactions** from bank push notifications with zero manual input
- **160+ currencies** with daily FX rate updates and instant conversion
- **Completely offline** with on-device WatermelonDB/SQLite storage and full data privacy
- **23 screens** covering dashboards, analytics, budgets, goals, subscriptions, and more
- **546 passing tests** with test-driven development from day one
- **Clean Architecture** with strict layer separation and dependency inversion

---

## Features

### Transaction Management
- Automatic notification parsing for Payoneer, Grey, and Dukascopy
- Manual entry with amount input, category picker, and quick templates
- Search with filters by date, amount range, currency, category, and tags
- Edit, delete, and swipe actions on transaction cards

### Multi-Currency
- Multi-wallet system with one wallet per currency
- Live exchange rates from ExchangeRate-API with local caching
- Built-in currency converter with 160+ supported currencies
- All amounts stored as integer cents to avoid floating-point errors

### Financial Planning
- **Budgets**: Set spending limits per category with visual progress bars and alerts
- **Savings Goals**: Track targets with progress rings and projected completion dates
- **Subscriptions**: Monitor recurring costs with renewal reminders
- **Bill Reminders**: Calendar view with push notification alerts

### Analytics and Insights
- Interactive pie, bar, and line charts with drill-down
- Weekly spending trends on the dashboard
- AI-style insight cards for spending anomalies and low balances
- Month-over-month comparison with percentage change indicators

### Organization
- 17 predefined categories plus custom category creation with icons and colors
- Tags and notes for richer transaction metadata
- Notification log viewer for debugging parsed transactions

### Data and Privacy
- CSV and JSON export with custom date ranges
- All data stored locally, never sent to any server
- Optional SQLite encryption via SQLCipher
- PIN and biometric lock support

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.76+ (bare workflow, no Expo) |
| Language | TypeScript (strict mode) |
| Architecture | Clean Architecture (Domain / Data / Presentation / Infrastructure) |
| Database | WatermelonDB with SQLiteAdapter (JSI enabled) |
| State | Zustand (UI state) + WatermelonDB observables (data) |
| Navigation | React Navigation 7 (bottom tabs + native stacks) |
| Charts | react-native-gifted-charts |
| Icons | react-native-vector-icons (MaterialCommunityIcons) |
| Animations | react-native-reanimated 3 |
| Styling | React Native StyleSheet + design token system |
| Notifications | Android NotificationListenerService (native Kotlin module) |
| FX Rates | ExchangeRate-API (free tier) with local caching |
| Security | react-native-keychain, optional SQLCipher encryption |
| Testing | Jest + @testing-library/react-native (TDD) |

---

## Architecture

```
src/
├── domain/          # Entities, use cases, repository interfaces (zero external imports)
├── data/            # WatermelonDB models, repository implementations, mappers
├── presentation/    # 23 screens, 30+ components, navigation, Zustand stores, hooks
├── infrastructure/  # Notification parsers, FX API client, export, backup
├── shared/          # Theme tokens, types, utilities, constants
└── app/             # App entry point and providers
```

**Dependency rule**: Domain imports nothing from other layers. Data and Infrastructure depend only on Domain. Presentation depends on Domain and receives data through hooks and stores.

```
Presentation  -->  Domain  <--  Data
                     ^
                     |
               Infrastructure
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Java 17
- Android Studio with SDK 34
- Android device or emulator (API 26+)

### Installation

```bash
git clone https://github.com/kika1s1/WalletPulse.git
cd WalletPulse
npm install
```

### Environment

```bash
cp .env.example .env
```

Add your free API key from [ExchangeRate-API](https://www.exchangerate-api.com/).

### Run

```bash
npm start          # Start Metro bundler
npm run android    # Build and run on Android
npm test           # Run all 546 tests
npm run test:watch # Watch mode
```

---

## Android Permissions

| Permission | Purpose |
|---|---|
| `BIND_NOTIFICATION_LISTENER_SERVICE` | Capture financial push notifications |
| `INTERNET` | Fetch daily exchange rates |
| `FOREGROUND_SERVICE` | Keep notification listener active |
| `READ/WRITE_EXTERNAL_STORAGE` | Backup and export |
| `USE_BIOMETRIC` | App lock (Phase 2) |
| `CAMERA` | Receipt photo capture (Phase 2) |

---

## Documentation

| Document | Description |
|---|---|
| [Product Requirements](docs/PRD.md) | 26-feature PRD with acceptance criteria |
| [Architecture](docs/ARCHITECTURE.md) | Clean Architecture layers and data flow |
| [Database Schema](docs/DATABASE_SCHEMA.md) | 13 tables with column definitions |
| [Notification Parsing](docs/NOTIFICATION_PARSING.md) | Regex patterns and parser design |
| [API Reference](docs/API_REFERENCE.md) | Use cases, repositories, hooks |
| [Tech Stack](docs/TECH_STACK.md) | Full dependency list with rationale |
| [Development Guide](docs/DEVELOPMENT_GUIDE.md) | TDD workflow and build phases |

---

## Development

This project follows strict **Test-Driven Development**. Every module starts with a failing test, then implementation, then refactoring. The codebase maintains 62 test suites with 546 tests covering domain logic, data mappers, notification parsers, and UI components.

**Conventions:**
- All monetary values are stored as integer cents
- Dates are Unix timestamps in milliseconds
- Currency codes follow ISO 4217
- Notification parsers are pure functions: `(notification) => ParsedTransaction | null`
- Components use named exports, screens use default exports
- File naming: `kebab-case.ts` for logic, `PascalCase.tsx` for components

---

## License

Private. All rights reserved.
