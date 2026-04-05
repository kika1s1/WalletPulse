<p align="center">
  <img src="assets/logo.png" alt="WalletPulse Logo" width="120" height="120" />
</p>

<h1 align="center">WalletPulse</h1>

<p align="center">
  <strong>Smart, offline-first expense tracker for Android</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white" alt="Android" />
  <img src="https://img.shields.io/badge/react_native-0.76+-61DAFB?logo=react&logoColor=white" alt="React Native" />
  <img src="https://img.shields.io/badge/typescript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/tests-546_passed-22C55E?logo=jest&logoColor=white" alt="Tests" />
  <img src="https://img.shields.io/badge/architecture-clean-6C5CE7" alt="Clean Architecture" />
  <img src="https://img.shields.io/badge/TDD-red--green--refactor-E34F26" alt="TDD" />
  <img src="https://img.shields.io/badge/license-private-lightgrey" alt="License" />
</p>

<p align="center">
  Automatically detects transactions from bank push notifications, parses details via regex,<br/>
  and logs everything to a local database with real-time multi-currency conversion.
</p>

---

## Highlights

| | |
|---|---|
| **Auto-detect** | Captures Payoneer, Grey, Dukascopy notifications and parses transactions automatically |
| **160+ Currencies** | Daily FX rate updates with instant on-device conversion |
| **Fully Offline** | WatermelonDB/SQLite storage, zero server dependency, complete data privacy |
| **23 Screens** | Dashboard, analytics, budgets, goals, subscriptions, wallets, and more |
| **546 Tests** | Test-driven development from day one across 62 test suites |
| **Clean Architecture** | Strict layer separation with dependency inversion |

---

## Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Kotlin-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" alt="Kotlin" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white" alt="Jest" />
  <img src="https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android" />
</p>

| Layer | Technology |
|:---|:---|
| **Framework** | React Native 0.76+ (bare workflow, no Expo) |
| **Language** | TypeScript (strict mode) + Kotlin (native modules) |
| **Architecture** | Clean Architecture (Domain / Data / Presentation / Infrastructure) |
| **Database** | WatermelonDB with SQLiteAdapter (JSI enabled) |
| **State Management** | Zustand (UI state) + WatermelonDB observables (data) |
| **Navigation** | React Navigation 7 (bottom tabs + native stacks) |
| **Charts** | react-native-gifted-charts |
| **Icons** | react-native-vector-icons (MaterialCommunityIcons) |
| **Animations** | react-native-reanimated 3 |
| **Styling** | React Native StyleSheet + design token system |
| **Notifications** | Android NotificationListenerService (native Kotlin module) |
| **FX Rates** | ExchangeRate-API (free tier) with local caching |
| **Security** | react-native-keychain, optional SQLCipher encryption |
| **Testing** | Jest + @testing-library/react-native (TDD) |

---

## Features

<details>
<summary><strong>Transaction Management</strong></summary>

- Automatic notification parsing for Payoneer, Grey, and Dukascopy
- Manual entry with amount input, category picker, and quick templates
- Full-text search with filters by date, amount range, currency, category, and tags
- Edit, delete, and swipe actions on transaction cards

</details>

<details>
<summary><strong>Multi-Currency</strong></summary>

- Multi-wallet system with one wallet per currency
- Live exchange rates from ExchangeRate-API with local caching
- Built-in currency converter with 160+ supported currencies
- All amounts stored as integer cents to avoid floating-point errors

</details>

<details>
<summary><strong>Financial Planning</strong></summary>

- **Budgets**: Set spending limits per category with visual progress bars and alerts
- **Savings Goals**: Track targets with progress rings and projected completion dates
- **Subscriptions**: Monitor recurring costs with renewal reminders
- **Bill Reminders**: Calendar view with push notification alerts

</details>

<details>
<summary><strong>Analytics and Insights</strong></summary>

- Interactive pie, bar, and line charts with drill-down
- Weekly spending trends on the dashboard
- AI-style insight cards for spending anomalies and low balances
- Month-over-month comparison with percentage change indicators

</details>

<details>
<summary><strong>Organization</strong></summary>

- 17 predefined categories plus custom category creation with icons and colors
- Tags and notes for richer transaction metadata
- Notification log viewer for debugging parsed transactions

</details>

<details>
<summary><strong>Data and Privacy</strong></summary>

- CSV and JSON export with custom date ranges
- All data stored locally, never sent to any server
- Optional SQLite encryption via SQLCipher
- PIN and biometric lock support

</details>

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

**Dependency rule:** Domain imports nothing from other layers. Data and Infrastructure depend only on Domain. Presentation depends on Domain and receives data through hooks and stores.

```
Presentation  -->  Domain  <--  Data
                     ^
                     |
               Infrastructure
```

---

## Getting Started

### Prerequisites

| Tool | Version |
|:---|:---|
| Node.js | 18+ |
| Java | 17 |
| Android Studio | SDK 34 |
| Android device/emulator | API 26+ |

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

Get a free API key from [ExchangeRate-API](https://www.exchangerate-api.com/) and add it to `.env`.

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
|:---|:---|
| `BIND_NOTIFICATION_LISTENER_SERVICE` | Capture financial push notifications |
| `INTERNET` | Fetch daily exchange rates |
| `FOREGROUND_SERVICE` | Keep notification listener active |
| `READ/WRITE_EXTERNAL_STORAGE` | Backup and export |
| `USE_BIOMETRIC` | App lock (Phase 2) |
| `CAMERA` | Receipt photo capture (Phase 2) |

---

## Documentation

| Document | Description |
|:---|:---|
| [Product Requirements](docs/PRD.md) | 26-feature PRD with acceptance criteria |
| [Architecture](docs/ARCHITECTURE.md) | Clean Architecture layers and data flow |
| [Database Schema](docs/DATABASE_SCHEMA.md) | 13 tables with column definitions |
| [Notification Parsing](docs/NOTIFICATION_PARSING.md) | Regex patterns and parser design |
| [API Reference](docs/API_REFERENCE.md) | Use cases, repositories, hooks |
| [Tech Stack](docs/TECH_STACK.md) | Full dependency list with rationale |
| [Development Guide](docs/DEVELOPMENT_GUIDE.md) | TDD workflow and build phases |

---

## Development

This project follows strict **Test-Driven Development**. Every module starts with a failing test, then implementation, then refactoring.

**Conventions:**

- All monetary values stored as integer cents
- Dates are Unix timestamps in milliseconds
- Currency codes follow ISO 4217
- Notification parsers are pure functions: `(notification) => ParsedTransaction | null`
- Components use named exports, screens use default exports
- File naming: `kebab-case.ts` for logic, `PascalCase.tsx` for components

---

<p align="center">
  <sub>Built with React Native, tested with TDD, designed with care.</sub>
</p>
