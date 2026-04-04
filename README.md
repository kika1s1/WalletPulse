# WalletPulse

An Android-only, offline-first, multi-currency expense tracker built with React Native. Automatically detects financial transactions from push notifications, parses transaction details through regex, and logs expenses into a local database with real-time currency conversion. Designed to compete with top expense trackers through speed, functionality, and enterprise-grade UI.

## Core Features

- **Automatic Tracking**: Captures notifications from Payoneer, Grey, Dukascopy and parses transactions automatically
- **Multi-Currency**: Supports 160+ currencies with daily FX rate updates and on-the-fly conversion
- **Offline-First**: WatermelonDB with SQLite, zero server dependency, complete data privacy
- **Multi-Wallet**: One wallet per currency with independent balance tracking
- **Smart Dashboard**: Real-time balance overview, spending insights, quick actions, and mini charts
- **Budget Planning**: Set spending limits per category with visual progress tracking and alerts
- **Advanced Analytics**: Interactive pie, bar, and line charts with drill-down and comparisons
- **Smart Search**: Full-text search with filters by date, amount, currency, category, and tags
- **Manual Entry**: Fast transaction form with templates, favorites, and voice input
- **Financial Goals**: Track savings goals with progress rings and projected completion dates
- **Subscription Tracking**: Monitor recurring costs with renewal reminders
- **Bill Reminders**: Never miss a payment with calendar view and push notifications
- **Custom Categories**: Predefined and user-created categories with icons and colors
- **Tags and Notes**: Rich metadata for better organization and filtering
- **Receipt Capture**: Attach photos to transactions with zoom and gallery
- **Export and Reports**: CSV, Excel, and PDF reports with custom date ranges
- **Backup and Restore**: Local file backup with optional Google Drive sync
- **Security**: PIN, biometric lock, and optional SQLite encryption
- **Dark Mode**: System-controlled light and dark themes
- **Onboarding**: Guided setup for new users
- **Developer Tools**: Notification log viewer, regex debug panel, database inspector

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.76+ (bare workflow) |
| Language | TypeScript (strict mode) |
| Architecture | Clean Architecture (Domain, Data, Presentation, Infrastructure) |
| Database | WatermelonDB + SQLite (JSI) |
| State | Zustand (UI) + WatermelonDB observables (data) |
| Navigation | React Navigation 7 |
| Charts | react-native-gifted-charts |
| Animations | react-native-reanimated 3 |
| Testing | Jest + @testing-library/react-native (TDD) |

## Development Methodology

- **Test-Driven Development**: Tests written before production code (red-green-refactor)
- **Clean Architecture**: Strict layer separation with dependency inversion
- **Enterprise UI**: Human-centered design with micro-interactions and accessibility

## Prerequisites

- Node.js 18+
- Java 17 (Android)
- Android Studio with SDK 34
- Android device or emulator (API 26+)

## Getting Started

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Environment Setup

Copy the example env file and add your API key:

```bash
cp .env.example .env
```

Get a free API key from [ExchangeRate-API](https://www.exchangerate-api.com/).

## Project Structure (Clean Architecture)

```
src/
├── domain/          # Business entities, use cases, repository interfaces
├── data/            # WatermelonDB models, repositories, mappers
├── presentation/    # Screens, components, navigation, stores, hooks
├── infrastructure/  # Notification parsers, FX API, export, backup
├── shared/          # Theme, types, utils, constants
└── app/             # App entry and providers
```

## Documentation

- [Product Requirements (26 features)](docs/PRD.md)
- [Clean Architecture](docs/ARCHITECTURE.md)
- [Database Schema (13 tables)](docs/DATABASE_SCHEMA.md)
- [Notification Parsing](docs/NOTIFICATION_PARSING.md)
- [API Reference](docs/API_REFERENCE.md)
- [Tech Stack](docs/TECH_STACK.md)
- [Development Guide (TDD phases)](docs/DEVELOPMENT_GUIDE.md)

## Android Permissions

- `BIND_NOTIFICATION_LISTENER_SERVICE`: Capture financial notifications
- `INTERNET`: Fetch exchange rates
- `RECEIVE_BOOT_COMPLETED`: Restart notification listener after reboot
- `FOREGROUND_SERVICE`: Keep notification listener running
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`: Backup and export
- `USE_BIOMETRIC`: App lock (Phase 2)
- `CAMERA`: Receipt photo capture (Phase 2)

## License

Private. All rights reserved.
