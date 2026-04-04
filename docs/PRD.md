# WalletPulse: Product Requirements Document

## Vision

WalletPulse is an Android-only, offline-first, multi-currency expense tracker that automatically detects financial transactions from push notifications, parses transaction details, and logs expenses into a local database with real-time currency conversion. It is designed to compete with and surpass top expense trackers (Mint, YNAB, Expensify, Money Lover, Wallet by BudgetBakers) through superior speed, comprehensive functionality, and a polished enterprise-grade UI.

## Target Users

- Freelancers and remote workers receiving payments in multiple currencies (Payoneer, Grey)
- Expats and international professionals managing multi-currency finances
- Budget-conscious users who want automatic expense tracking without manual effort
- Small business owners tracking business and personal finances separately
- Users who want total data privacy with no cloud dependency

## Platform

- Android only (NotificationListenerService is Android-specific)
- React Native bare workflow (no Expo)
- Minimum Android API: 26 (Android 8.0 Oreo)
- Target Android API: 34 (Android 14)

## Development Methodology

- Test-Driven Development (TDD): tests written before production code
- Clean Architecture: Domain, Data, Presentation, Infrastructure layers
- Enterprise UI: human-centered design with micro-interactions and accessibility

---

## Complete Feature Specification

### F1: Notification-Based Automatic Tracking

Capture push notifications from financial apps, extract transaction details through regex parsing, and automatically log them.

**Requirements:**
- Android NotificationListenerService running as a foreground service
- Native Kotlin module bridging notifications to React Native JS
- Parser registry mapping package names to parser functions
- Each parser extracts: amount, currency, merchant, transaction type, timestamp
- Deduplication using (amount + currency + timestamp + source) hash
- Auto-categorization based on merchant keywords
- User can toggle auto-logging ON/OFF per app
- All raw notifications logged for debugging
- Confidence scoring for each parsed transaction
- User confirmation mode: prompt before logging (optional setting)

**Acceptance Criteria:**
- Payoneer payment received/sent notifications parsed correctly
- Grey deposit/withdrawal/card notifications parsed correctly
- Dukascopy transfer/card notifications parsed correctly
- No duplicate transactions logged
- Works reliably when app is in background
- Handles notification format changes gracefully

### F2: Manual Expense and Income Entry

Users can manually add expenses or income in any currency with a fast, polished form.

**Requirements:**
- Form fields: amount (large numeric display), currency selector, category, description, date, type toggle
- Smart amount input with decimal handling and currency symbol
- Searchable currency picker with country flags
- Category picker as icon grid with colors
- Optional: tags (comma-separated), receipt image attachment, location
- Edit and delete existing entries with undo support
- Transaction templates: save and reuse frequent transactions
- Quick entry: long-press FAB for one-tap repeat of last transaction
- Voice input for hands-free entry (speech to amount + description)
- Batch entry mode for entering multiple transactions quickly

### F3: Full Multi-Currency Support

Support all 160+ global currencies with automatic conversion.

**Requirements:**
- User selects a base currency in settings (default: USD)
- FX rates fetched daily from ExchangeRate-API (free tier)
- Rates cached locally in WatermelonDB
- All amounts stored in original currency (never converted on write)
- Converted amounts calculated on the fly for display
- Fallback to cached rates when offline (never fail)
- Currency converter calculator tool (standalone utility screen)
- Historical rate comparison (show rate at transaction date vs current)
- Display format: symbol + amount + ISO code (e.g., "$1,234.56 USD")
- Support for cryptocurrency display (BTC, ETH) as custom currencies

### F4: Local Database (Offline-First)

All data stored locally using WatermelonDB with SQLite. Zero server dependency.

**Tables:**
- `wallets` - one per currency, balance tracking
- `transactions` - all income/expense/transfer records
- `categories` - predefined + user-created categories
- `fx_rates` - cached exchange rates
- `notification_logs` - raw notification debug data
- `parsing_rules` - regex patterns per source app
- `budgets` - monthly/weekly budget limits per category
- `goals` - financial savings goals
- `subscriptions` - recurring subscription tracking
- `bill_reminders` - upcoming bill due dates
- `transaction_templates` - saved transaction templates
- `tags` - user-defined tags for transactions
- `app_settings` - user preferences and configuration

### F5: Smart Dashboard

A real-time, glanceable dashboard showing the complete financial picture.

**Requirements:**
- Personalized greeting with current date
- Total balance in base currency (large, prominent display)
- Percentage change from last period (week/month)
- Income vs expense summary pills
- Quick action buttons: Add, Transfer, Scan Receipt, More
- Mini 7-day spending bar chart
- Recent transactions list (last 5, with "See All" link)
- Horizontal scrolling insight cards with smart observations
- Pull-to-refresh for FX rate update
- Skeleton loading state matching exact layout
- Animated number transitions on balance changes

**Smart Insights Engine:**
- "You spent 20% more on Food this week compared to last week"
- "Your USD wallet balance dropped below $500"
- "You have 3 bills due this week totaling $245"
- "Subscription costs increased by $12 this month"
- "Your savings goal 'Vacation' is 72% complete"
- "Unusual transaction detected: $500 at unknown merchant"

### F6: Advanced Analytics and Charts

Comprehensive visual analytics with interactive charts and drill-down.

**Requirements:**
- Pie chart: spending by category (donut style with center total)
- Bar chart: weekly/monthly spending comparison
- Line chart: income/expense flow over time
- Stacked bar: multi-currency breakdown per period
- Trend arrows and percentage changes
- Filters: date range, source app, currency, category, wallet, tags
- Comparison mode: this month vs last month, this year vs last year
- Top merchants list with spending totals
- Spending velocity: daily average spend rate
- Category-specific drill-down (tap category to see transactions)
- Export charts as images for sharing
- Animated chart draw-in on mount

### F7: Multi-Wallet System

Each currency is a wallet with independent balance tracking and full transaction history.

**Requirements:**
- Auto-create wallet when first transaction in a currency appears
- Wallet card shows: balance, transaction count, last activity date
- Real-time FX conversion to base currency
- Manual wallet creation for empty wallets
- Wallet color and icon customization
- Wallet hiding (archive without deleting)
- Wallet-to-wallet transfer (currency conversion)
- Wallet balance chart over time
- Sort wallets by: balance, activity, name, currency

### F8: Budget Planning and Alerts

Set spending limits per category with real-time tracking and notifications.

**Requirements:**
- Create monthly or weekly budgets per category
- Overall monthly budget across all categories
- Visual progress bar showing spending vs limit
- Color coding: green (under 50%), yellow (50-80%), red (over 80%), flashing (exceeded)
- Push notification when approaching or exceeding budget
- Budget history: track budget adherence over time
- Rollover option: carry unused budget to next period
- Budget suggestions based on past spending patterns

### F9: Financial Goals

Track savings goals with visual progress and projected completion dates.

**Requirements:**
- Create goals with: name, target amount, target currency, deadline, icon
- Visual progress ring showing percentage complete
- Projected completion date based on current saving rate
- Link specific transactions as goal contributions
- Goal categories: Emergency Fund, Vacation, Purchase, Investment, Custom
- Celebration animation when goal is reached
- Multiple concurrent goals

### F10: Subscription Tracking

Monitor recurring subscriptions and their cumulative cost.

**Requirements:**
- Auto-detect subscriptions from recurring transaction patterns
- Manual subscription entry: name, amount, currency, billing cycle, next due date
- Monthly/yearly cost summary
- Renewal reminders (1 day, 3 days, 7 days before)
- Subscription spending as percentage of income
- Cancel tracking: mark subscriptions as cancelled
- Category: streaming, software, memberships, utilities, other

### F11: Bill Reminders

Track upcoming bills and payment due dates.

**Requirements:**
- Add bills with: name, amount, due date, recurrence, category
- Calendar view showing upcoming bills
- Overdue bill highlighting
- Push notification reminders (configurable timing)
- Mark bills as paid (auto-create transaction)
- Bill history tracking

### F12: Custom Categories

Fully customizable transaction categorization system.

**Requirements:**
- Predefined categories: Food and Dining, Transportation, Shopping, Entertainment, Health and Medical, Rent and Housing, Utilities, Business, Travel, Education, Personal Care, Gifts and Donations, Insurance, Taxes, Salary, Freelance Income, Investment Returns, Transfer, Other
- User-created categories with custom name, icon, and color
- Subcategories (optional nesting: Food > Groceries, Food > Restaurants)
- Category merge: combine two categories into one
- Category usage statistics
- Category reordering
- Archive unused categories

### F13: Smart Search and Filtering

Find any transaction instantly with powerful search and filter capabilities.

**Requirements:**
- Full-text search across description, merchant, category, tags
- Real-time search results as user types
- Filter by: date range, amount range, currency, category, wallet, source, type, tags
- Save frequently used filter combinations
- Recent searches history
- Search result highlighting
- Sort results by: date, amount, relevance

### F14: Tags and Notes

Add rich metadata to transactions for better organization.

**Requirements:**
- Add multiple tags to any transaction
- Tag auto-complete from existing tags
- Filter transactions by tag
- Tag-based analytics
- Rich notes field with multi-line text

### F15: Receipt Management

Capture and attach receipt images to transactions.

**Requirements:**
- Camera capture for receipt photos
- Gallery image selection
- Multiple images per transaction
- Receipt image viewer with zoom and pan
- Receipt OCR: auto-extract amount and merchant from receipt image (post-MVP)
- Receipt thumbnail in transaction list

### F16: Transaction Templates and Favorites

Speed up entry by saving and reusing frequent transactions.

**Requirements:**
- Save any transaction as a template
- One-tap creation from template
- Template management screen (edit, delete, reorder)
- Suggested templates based on frequency
- Quick repeat: duplicate last transaction with one tap

### F17: Secure Data

Protect financial data with local encryption and biometric access.

**Requirements:**
- App lock with PIN (4 or 6 digit)
- Biometric unlock (fingerprint, face)
- Auto-lock after configurable timeout (1min, 5min, 15min, 30min)
- Optional SQLite encryption via SQLCipher
- Secure storage for API keys via react-native-keychain
- No data sent to any external server (complete privacy)
- Sensitive data hidden in app switcher (screenshot protection)

### F18: Export and Reports

Generate professional reports and export data in multiple formats.

**Requirements:**
- Export transactions to CSV with all fields
- Export transactions to Excel (.xlsx) with formatting
- Monthly PDF report with charts, totals, and category breakdown
- Custom date range exports
- Filter-aware exports (export only visible/filtered data)
- Share exported files via system share sheet
- Scheduled automatic exports (monthly summary)
- Email report to self

### F19: Backup and Restore

Protect data with local and cloud backup options.

**Requirements:**
- Full database backup to local file system
- Restore from backup file
- Backup encryption with user password
- Automatic daily local backup
- Optional Google Drive backup and restore
- Backup file size display
- Backup history with timestamps

### F20: Settings and Personalization

Comprehensive settings for customizing every aspect of the app.

**Requirements:**
- Light/Dark/System theme modes
- Change base currency
- Manage notification parsing (ON/OFF per app)
- Manage categories (create, edit, delete, reorder)
- Manage wallets (create, edit, hide, reorder)
- Date format preference (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- Number format preference (1,234.56 vs 1.234,56)
- First day of week (Monday/Sunday)
- Default transaction type (income/expense)
- Notification preferences for budgets, bills, and insights
- App language (English initially, expandable)
- About screen with version info
- Rate the app link
- Reset all data option with confirmation

### F21: Onboarding Flow

Guide new users through initial setup with a welcoming experience.

**Requirements:**
- 3-4 screen welcome carousel with app highlights
- Base currency selection
- Notification access permission request with explanation
- Select which financial apps to monitor
- Optional quick category setup
- Skip option for experienced users
- Progress dots indicator

### F22: Developer Tools

Built-in debugging tools for notification parsing and app diagnostics.

**Requirements:**
- Notification log viewer: all captured notifications with parse results
- Regex debug panel: test patterns against sample notification text
- Manual override for parsing rules
- Database inspector: table row counts and last update times
- Performance metrics: app launch time, query times
- Toggle developer mode in settings (hidden by default, activate with 7 taps on version)
- Export debug logs

### F23: Quick Actions and Shortcuts

Speed up common tasks with quick access patterns.

**Requirements:**
- Floating Action Button (FAB) on main screens for quick add
- Long-press FAB for action menu: Add Expense, Add Income, Transfer, Scan Receipt
- Android app shortcuts (long-press app icon): Add Expense, View Dashboard
- Swipe actions on transaction list: edit, delete, duplicate
- Pull-to-refresh on all data screens

### F24: Android Home Screen Widget

At-a-glance financial overview without opening the app.

**Requirements (post-MVP):**
- Small widget: total balance in base currency
- Medium widget: balance + income/expense today
- Large widget: balance + recent 3 transactions
- Widget theme matches app theme
- Tap widget to open app

### F25: Spending Predictions and Forecasts

AI-powered spending analysis and future projections.

**Requirements (post-MVP):**
- Projected end-of-month spending based on current velocity
- Predicted category spending based on historical patterns
- "At this rate, you will spend $X by end of month"
- Unusual spending detection and alerts
- Weekly spending forecast

### F26: Split Expenses

Split transaction costs between multiple people.

**Requirements (post-MVP):**
- Split a transaction equally or by custom amounts
- Track who owes what
- Mark splits as settled
- Split history per person

---

## MVP Scope Summary

| Feature | Phase |
|---------|-------|
| F1: Notification listener + parsing | MVP |
| F2: Manual transaction entry | MVP |
| F3: Multi-currency conversion | MVP |
| F4: Local SQLite database | MVP |
| F5: Smart dashboard | MVP |
| F6: Analytics and charts | MVP |
| F7: Multi-wallet system | MVP |
| F8: Budget planning | MVP |
| F12: Custom categories | MVP |
| F13: Smart search | MVP |
| F14: Tags and notes | MVP |
| F20: Settings | MVP |
| F21: Onboarding | MVP |
| F23: Quick actions | MVP |
| F9: Financial goals | Phase 2 |
| F10: Subscription tracking | Phase 2 |
| F11: Bill reminders | Phase 2 |
| F15: Receipt management | Phase 2 |
| F16: Transaction templates | Phase 2 |
| F17: Secure data (PIN/biometrics) | Phase 2 |
| F18: Export and reports | Phase 2 |
| F19: Backup and restore | Phase 2 |
| F22: Developer tools | Phase 2 |
| F24: Home screen widget | Phase 3 |
| F25: Spending predictions | Phase 3 |
| F26: Split expenses | Phase 3 |

---

## Competitive Advantages

| Advantage | vs Competitors |
|-----------|---------------|
| Automatic notification parsing | Most trackers require manual entry only |
| True offline-first (no account required) | Mint, YNAB require accounts and internet |
| Multi-currency with real-time conversion | Most support single currency or basic multi |
| Sub-second query performance (WatermelonDB) | Many apps lag with large datasets |
| Enterprise-grade UI with micro-interactions | Most budget apps have basic UI |
| Complete privacy (zero data leaves device) | Most apps sync to cloud servers |
| Configurable parser rules | No competitor offers this |
| TDD-built reliability | Higher stability than typical mobile apps |

## Technical Constraints

- No backend server: 100% local storage
- No internet required for core functionality (FX rates cached)
- Android only (NotificationListenerService)
- React Native bare workflow (not Expo)
- WatermelonDB for all persistent data
- Zustand for UI state only
- Clean Architecture with strict layer separation
- Tests written before production code (TDD)
