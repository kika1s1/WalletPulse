# WalletPulse: Monetization Implementation Chunks

Each chunk below is a self-contained, small task you can copy-paste as a Cursor prompt. They are ordered by dependency: complete them top to bottom. Each chunk produces working, testable code before moving to the next.

---

## PHASE A: Entitlement Domain Layer (Foundation)

Everything starts here. This defines WHAT features exist and WHO can access them. Pure TypeScript, no libraries, no UI.

---

### Chunk A1: Entitlement Entity and Tier Types [IMPLEMENTED]

**Status:** DONE (17 tests passing)

**Files created:**
- `src/domain/entities/Entitlement.ts` - Tier, FeatureLimits, Entitlement types + createEntitlement, isTrialActive, isExpired functions
- `__tests__/domain/entities/Entitlement.test.ts` - 17 tests covering creation, validation, trial status, expiry, and type completeness

---

### Chunk A2: Tier Configuration Constants [IMPLEMENTED]

**Status:** DONE (16 tests passing)

**Files created:**
- `src/domain/entities/tier-config.ts` - TIER_LIMITS constant (free/pro/business/lifetime) + getTierLimits() helper returning a safe copy
- `__tests__/domain/entities/tier-config.test.ts` - 16 tests covering all tier limits, feature flags, business superset, lifetime=pro equality, and mutation safety

---

### Chunk A3: Entitlement Repository Interface [IMPLEMENTED]

**Status:** DONE

**Files created:**
- `src/domain/repositories/IEntitlementRepository.ts` - Interface with getCurrentTier, getFeatureLimits, getEntitlement, isFeatureAvailable, getFeatureLimit methods

---

### Chunk A4: Check Entitlement Use Case [IMPLEMENTED]

**Status:** DONE (28 tests passing)

**Files created:**
- `src/domain/usecases/check-entitlement.ts` - makeCheckEntitlement factory returning canAccess, getLimit, getCurrentTier, isTrialing, getTrialDaysRemaining. Uses project factory function convention.
- `__tests__/domain/usecases/check-entitlement.test.ts` - 28 tests with mocked repos for free/pro/business/trial users, covering feature access, numeric limits, tier detection, trial days (ceil rounding), and full integration with tier-config constants

---

### Chunk A5: Feature Gate Use Case [IMPLEMENTED]

**Status:** DONE (11 tests passing)

**Files created:**
- `src/domain/usecases/check-feature-limit.ts` - makeCheckFeatureLimit factory with canAdd() method. Takes entitlementRepo, countProvider, and limitKey. Uses Promise.all for parallel fetching. Exports FeatureLimitResult type.
- `__tests__/domain/usecases/check-feature-limit.test.ts` - 11 tests covering maxWallets (0/1/2 vs limit 2, 100 vs Infinity), maxBudgets (0/1 vs limit 1, 20 vs Infinity), maxParserApps (0/1 vs limit 1), and countProvider call verification

---

## PHASE B: Purchase Infrastructure (RevenueCat SDK)

Connects the domain entitlement system to real Google Play purchases via RevenueCat.

---

### Chunk B1: Install RevenueCat SDK [IMPLEMENTED]

**Status:** DONE

**Changes:**
- Installed `react-native-purchases` via npm
- Created `src/shared/constants/purchase-constants.ts` with REVENUECAT_API_KEY (placeholder), PRODUCT_IDS (5 products), ENTITLEMENT_IDS (pro, business)
- Added `com.android.vending.BILLING` permission to AndroidManifest.xml
- Added `react-native-purchases` to jest transformIgnorePatterns

---

### Chunk B2: RevenueCat Client Initialization [IMPLEMENTED]

**Status:** DONE

**Files created:**
- `src/infrastructure/purchases/revenue-cat-client.ts` - initializePurchases, getCustomerInfo, getOfferings, restorePurchases, isInitialized. All error-safe with try-catch returning null.
- `src/infrastructure/purchases/purchase-types.ts` - PurchaseProduct, PurchasePackage, PurchaseOffering, PurchaseResult types

---

### Chunk B3: Entitlement Repository Implementation [IMPLEMENTED]

**Status:** DONE (17 tests passing)

**Files created:**
- `src/data/repositories/EntitlementRepository.ts` - Implements IEntitlementRepository using RevenueCat CustomerInfo. Maps active entitlements to tiers (business > lifetime > pro > free). Detects trials from periodType. Extracts expiry/purchase dates.
- `__tests__/data/repositories/EntitlementRepository.test.ts` - 17 tests mocking revenue-cat-client. Covers free/pro/business/lifetime detection, business-over-pro priority, null CustomerInfo fallback, feature availability, numeric limits, trial detection, and lifetime null expiry.

---

### Chunk B4: Purchase Use Cases [IMPLEMENTED]

**Prompt for Cursor:**
> Create purchase-related use cases for buying subscriptions and restoring purchases. Follow TDD.
>
> Create:
> - `src/domain/usecases/purchase-subscription.ts` - Export `PurchaseSubscription` class. Method `execute(productId: string): Promise<{success: boolean; tier: Tier; error?: string}>`. Uses a `IPurchaseService` interface (define it in `src/domain/repositories/IPurchaseService.ts`) with methods `purchaseProduct(productId: string): Promise<PurchaseResult>`, `getAvailableProducts(): Promise<PurchaseProduct[]>`, `restorePurchases(): Promise<Tier>`.
> - `src/domain/usecases/restore-purchases.ts` - Export `RestorePurchases` class. Method `execute(): Promise<{tier: Tier; restored: boolean}>`.
> - `src/__tests__/domain/usecases/purchase-subscription.test.ts` - Mock IPurchaseService. Test successful purchase returns new tier, failed purchase returns error, restore finds existing subscription.
>
> Named exports. No em dashes.

**Files created:** 4
**Estimated time:** 20 min

---

### Chunk B5: Purchase Service Implementation [IMPLEMENTED]

**Prompt for Cursor:**
> Create the PurchaseService that implements IPurchaseService using RevenueCat. Infrastructure layer.
>
> Create:
> - `src/infrastructure/purchases/PurchaseService.ts` - Implements IPurchaseService. `purchaseProduct()` calls RevenueCat `Purchases.purchasePackage()` or `Purchases.purchaseProduct()`. Maps result to PurchaseResult. `getAvailableProducts()` fetches offerings and maps packages to PurchaseProduct[]. `restorePurchases()` calls RevenueCat restore and returns resulting tier.
> - `src/infrastructure/purchases/entitlement-map.ts` - Export `mapCustomerInfoToTier(customerInfo)` function that extracts tier from RevenueCat CustomerInfo. Reusable by both EntitlementRepository and PurchaseService.
>
> Handle all Google Play billing errors gracefully. Named exports. No em dashes.

**Files created:** 2
**Estimated time:** 20 min

---

## PHASE C: Entitlement Presentation Layer (Hooks + Gate Components)

Bridges the domain/data layer to the UI. After this phase, any screen can check entitlements and show paywalls.

---

### Chunk C1: Entitlement Zustand Store [IMPLEMENTED]

**Prompt for Cursor:**
> Create a Zustand store for caching the current entitlement state in the presentation layer.
>
> Create:
> - `src/presentation/stores/useEntitlementStore.ts` - Zustand store with state: `tier: Tier` (default 'free'), `featureLimits: FeatureLimits` (default FREE limits), `isTrialing: boolean`, `trialEndsAt: number | null`, `isLoading: boolean`, `error: string | null`. Actions: `loadEntitlement()` (calls EntitlementRepository, updates state), `setTier(tier)`, `reset()`. Subscribe to RevenueCat listener for real-time updates when subscription changes.
> - `src/__tests__/presentation/stores/useEntitlementStore.test.ts` - Test initial state is free, loadEntitlement updates tier, setTier changes limits.
>
> Named export. No em dashes.

**Files created:** 2
**Estimated time:** 15 min

---

### Chunk C2: useEntitlement Hook [IMPLEMENTED]

**Prompt for Cursor:**
> Create the useEntitlement hook that screens and components use to check feature access.
>
> Create:
> - `src/presentation/hooks/useEntitlement.ts` - Export `useEntitlement()` hook that returns `{tier, isTrialing, trialDaysRemaining, canAccess: (feature) => boolean, getLimit: (feature) => number|boolean|string, isPro, isBusiness, isFree}`. Reads from useEntitlementStore. `canAccess` checks the featureLimits. `trialDaysRemaining` calculates from trialEndsAt. `isPro` is true for pro, business, or lifetime.
> - `src/presentation/hooks/useFeatureGate.ts` - Export `useFeatureGate(feature: keyof FeatureLimits)` hook. Returns `{available: boolean, tier: Tier, showPaywall: () => void}`. The `showPaywall` opens navigation to PaywallScreen (use React Navigation).
> - `src/__tests__/presentation/hooks/useEntitlement.test.ts` - Test canAccess returns true for pro features when pro, false when free.
>
> Named exports. No em dashes.

**Files created:** 3
**Estimated time:** 20 min

---

### Chunk C3: PaywallGate Component [IMPLEMENTED]

**Prompt for Cursor:**
> Create the PaywallGate wrapper component that gates premium content and shows an upgrade prompt.
>
> Create:
> - `src/presentation/components/common/PaywallGate.tsx` - Named export. Props: `feature: keyof FeatureLimits`, `children: ReactNode`, `fallback?: ReactNode`. If the feature is available (useEntitlement), render children. Otherwise render the fallback, or a default locked state card with: lock icon, feature name, "Upgrade to {requiredTier} to unlock" text, and "Upgrade" button that navigates to PaywallScreen. Use the app's design system (Card component, theme colors, typography).
> - `src/presentation/components/common/ProBadge.tsx` - Named export. Small badge component showing "PRO" or "BUSINESS" next to premium features in settings/menus. Props: `tier: 'pro' | 'business'`, `size?: 'small' | 'medium'`. Uses theme colors (accent color background, white text, rounded).
> - `src/__tests__/presentation/components/PaywallGate.test.ts` - Test: renders children when entitled, renders fallback when not entitled.
>
> Named exports. Accessible. No em dashes.

**Files created:** 3
**Estimated time:** 20 min

---

### Chunk C4: Upgrade Prompt Component [IMPLEMENTED]

**Prompt for Cursor:**
> Create a reusable UpgradePrompt component for inline upgrade nudges within existing screens.
>
> Create:
> - `src/presentation/components/common/UpgradePrompt.tsx` - Named export. Props: `title: string`, `description: string`, `tier: 'pro' | 'business'`, `onUpgrade: () => void`, `style?: ViewStyle`. Renders a visually appealing card with: gradient or accent background, title text, description, ProBadge, and a "See Plans" button. Uses Reanimated for a subtle entrance animation (FadeInUp). Accessible with proper labels.
>
> This component is used inside screens at paywall trigger points (e.g., when user tries to create 3rd wallet, tries dark mode, etc). No em dashes.

**Files created:** 1
**Estimated time:** 15 min

---

## PHASE D: Paywall Screen

The main screen where users compare tiers and subscribe.

---

### Chunk D1: PaywallScreen Layout and Design [IMPLEMENTED]

**Prompt for Cursor:**
> Create the PaywallScreen for WalletPulse. This is the main subscription screen where users choose a plan.
>
> Create:
> - `src/presentation/screens/PaywallScreen.tsx` - Default export. Full-screen modal. Layout from top to bottom:
>   1. Close button (top right X)
>   2. Hero section: WalletPulse logo, "Unlock Your Financial Power" heading, "Track every currency. Automate every transaction." subtitle
>   3. Feature highlights: 4-5 key features with check icons (Unlimited wallets, All bank parsers, Advanced analytics, Export reports, Financial Health Score)
>   4. Plan toggle: Monthly / Annual switch (annual shows "Save 33%")
>   5. Plan cards: Free (current), Pro (recommended, highlighted), Business. Each shows price, key features, CTA button
>   6. "Start 14-Day Free Trial" primary CTA button
>   7. Trust footer: "No data leaves your device", "Cancel anytime", "Restore purchases" link
>
> Use the design system (theme colors, typography, spacing). Smooth scroll. Animated card selection. Pass tier/period to purchase handler. Navigation param: `{source: string}` to track which screen triggered the paywall. No em dashes.

**Files created:** 1
**Estimated time:** 30 min

---

### Chunk D2: PlanCard Component [IMPLEMENTED]

**Prompt for Cursor:**
> Create the PlanCard component used inside PaywallScreen to display each subscription tier.
>
> Create:
> - `src/presentation/components/common/PlanCard.tsx` - Named export. Props: `tier: Tier`, `price: string`, `period: 'monthly' | 'annual'`, `features: string[]`, `isRecommended: boolean`, `isCurrentPlan: boolean`, `onSelect: () => void`. Renders a card with: tier name, price with period label, feature list with check/x icons, "Recommended" badge if applicable, "Current Plan" label if applicable, select/upgrade button. Recommended plan has accent border and slightly larger scale. Uses press animation (Reanimated scale spring). Accessible. No em dashes.
> - `src/__tests__/presentation/components/PlanCard.test.tsx` - Test: renders tier name, shows recommended badge, calls onSelect on press.

**Files created:** 2
**Estimated time:** 20 min

---

### Chunk D3: PaywallScreen Purchase Logic [IMPLEMENTED]

**Prompt for Cursor:**
> Wire up the PaywallScreen to actually process purchases via RevenueCat.
>
> Modify `src/presentation/screens/PaywallScreen.tsx`:
> 1. Add a `usePurchase()` custom hook in `src/presentation/hooks/usePurchase.ts` that exposes: `products` (available products from RevenueCat), `isLoading`, `purchase(productId: string)`, `restore()`, `error`. It calls PurchaseService methods.
> 2. On mount, fetch available products/offerings and display real prices from Google Play
> 3. On plan select + CTA press, call `purchase(productId)` with the correct product ID from PRODUCT_IDS constant
> 4. Show loading overlay during purchase
> 5. On success: update EntitlementStore, show success toast, navigate back
> 6. On failure: show error message
> 7. "Restore purchases" link calls `restore()`, updates store, shows result
>
> Create `src/presentation/hooks/usePurchase.ts`. No em dashes.

**Files created:** 1, **Files modified:** 1
**Estimated time:** 25 min

---

### Chunk D4: Add Paywall to Navigation [IMPLEMENTED]

**Prompt for Cursor:**
> Add PaywallScreen to the app navigation and create navigation helpers.
>
> Modify the navigation setup:
> 1. Add `PaywallScreen` as a modal screen in the root stack navigator
> 2. Add `ManageSubscriptionScreen` as a regular stack screen under Settings
> 3. Add navigation type: `PaywallScreenParams = {source: string; feature?: string}` to the navigation types
> 4. Create `src/presentation/navigation/paywall-navigation.ts` - Export `navigateToPaywall(navigation, source, feature?)` helper function. Export `navigateToManageSubscription(navigation)`.
> 5. Update the useFeatureGate hook's `showPaywall` to use `navigateToPaywall`.
>
> No em dashes.

**Files modified:** 2-3
**Estimated time:** 15 min

---

### Chunk D5: Manage Subscription Screen [IMPLEMENTED]

**Prompt for Cursor:**
> Create the ManageSubscriptionScreen accessible from Settings for existing subscribers.
>
> Create:
> - `src/presentation/screens/ManageSubscriptionScreen.tsx` - Default export. Shows: current plan name and tier badge, subscription status (active, trialing, expired), next billing date, price, "Manage on Google Play" button (deep links to Play Store subscription management), "Restore Purchases" button, "Change Plan" button (navigates to PaywallScreen). For free users, shows "You are on the Free plan" with upgrade CTA. Uses useEntitlement hook for current state.
>
> Clean, simple screen. No em dashes.

**Files created:** 1
**Estimated time:** 20 min

---

## PHASE E: Feature Gating Integration

Wire up entitlement checks to existing screens so free tier limits actually work.

---

### Chunk E1: Gate Wallet Creation [IMPLEMENTED]

**Prompt for Cursor:**
> Add entitlement gating to wallet creation. Free users can only have 2 wallets.
>
> Modify the wallet creation flow:
> 1. Before creating a new wallet, use `CheckFeatureLimit` use case with `maxWallets` and current wallet count
> 2. If limit reached, show UpgradePrompt instead of the create form: "You have reached the 2-wallet limit on the Free plan. Upgrade to Pro for unlimited wallets."
> 3. In the WalletsScreen, add a ProBadge next to the "Add Wallet" button if user is on free tier and has < max wallets (to hint that the limit exists)
> 4. If user is on free tier and at limit, the "Add Wallet" button navigates to PaywallScreen instead
>
> Use useEntitlement and useFeatureGate hooks. No em dashes.

**Files modified:** 2-3
**Estimated time:** 20 min

---

### Chunk E2: Gate Notification Parser Selection [IMPLEMENTED]

**Prompt for Cursor:**
> Add entitlement gating to notification parser app selection. Free users can only pick 1 financial app.
>
> Modify the notification settings / parser selection screen:
> 1. Free users see all banking apps listed but only 1 can be enabled
> 2. When trying to enable a 2nd app, show UpgradePrompt: "Free plan supports 1 banking app. Upgrade to Pro to track all your financial apps automatically."
> 3. Pro/Business users can enable all supported apps
> 4. Show a ProBadge next to locked apps
> 5. Show the total count "1/1 apps active" for free, "3/unlimited apps active" for pro
>
> Use useEntitlement hook. No em dashes.

**Files modified:** 1-2
**Estimated time:** 20 min

---

### Chunk E3: Gate Analytics History [IMPLEMENTED]

**Prompt for Cursor:**
> Add entitlement gating to analytics history. Free users see current month only.
>
> Modify the AnalyticsScreen:
> 1. Free users: date range picker only allows current month selection. Past months are visually greyed out.
> 2. When tapping a past month, show UpgradePrompt: "See your complete financial history with Pro."
> 3. Pro/Business users: full date range, all history accessible
> 4. Add a subtle "Upgrade for full history" banner at the bottom of the analytics screen for free users
>
> Use useEntitlement hook. Check `historyMonths` limit. No em dashes.

**Files modified:** 1-2
**Estimated time:** 15 min

---

### Chunk E4: Gate Budget Creation [IMPLEMENTED]

**Prompt for Cursor:**
> Add entitlement gating to budget creation. Free users can only have 1 budget.
>
> Modify the budget creation flow:
> 1. Use CheckFeatureLimit with `maxBudgets` and current budget count
> 2. If free user already has 1 budget and tries to create another, show UpgradePrompt: "Unlock unlimited budgets with Pro to track spending across all categories."
> 3. In the BudgetsScreen, if at limit, the "Add Budget" button shows paywall
> 4. Pro/Business have no limit
>
> Use useEntitlement and useFeatureGate. No em dashes.

**Files modified:** 2-3
**Estimated time:** 15 min

---

### Chunk E5: Gate Export, Dark Mode, and Security Features [IMPLEMENTED]

**Prompt for Cursor:**
> Add entitlement gating to export, dark mode toggle, and biometric lock. These are simple boolean gates.
>
> Modifications:
> 1. **Export screen**: Wrap entire export UI in PaywallGate with `feature="export"`. Free users see a locked state with feature preview and upgrade button.
> 2. **Settings > Theme**: Dark mode and system theme options show ProBadge and are disabled for free users. Tapping them shows paywall.
> 3. **Settings > Security**: Biometric unlock option shows ProBadge and is disabled for free users. PIN lock remains available for free. SQLCipher encryption toggle is gated behind Pro.
> 4. **Settings > Backup**: Backup section wrapped in PaywallGate with `feature="backup"`.
>
> Use PaywallGate, ProBadge, useEntitlement. No em dashes.

**Files modified:** 3-4
**Estimated time:** 20 min

---

### Chunk E6: Gate Custom Categories, Tags, and Templates [IMPLEMENTED]

**Prompt for Cursor:**
> Add entitlement gating to custom category creation, tags, and transaction templates.
>
> Modifications:
> 1. **Categories**: Free users see default categories and can use them, but the "Create Category" button shows ProBadge and navigates to paywall. Edit/delete on default categories is disabled for free.
> 2. **Tags**: Tag input field in transaction form is wrapped in PaywallGate with `feature="tags"`. Free users see "Tags available with Pro" placeholder.
> 3. **Templates**: "Save as Template" option in transaction detail is gated. Template list screen is wrapped in PaywallGate with `feature="templates"`.
> 4. **Saved Filters**: "Save Filter" button in search is gated behind `savedFilters`.
>
> Use PaywallGate, ProBadge. No em dashes.

**Files modified:** 4-5
**Estimated time:** 20 min

---

### Chunk E7: Gate Phase 2 Features (Goals, Subscriptions, Bills, Receipts) [IMPLEMENTED]

**Prompt for Cursor:**
> Add entitlement gating to Phase 2 features: goals, subscription tracking, bill reminders, and receipts.
>
> Modifications:
> 1. **GoalsScreen**: Entire screen wrapped in PaywallGate with `feature="goals"`. Free users see a preview of the goals feature with upgrade prompt.
> 2. **Subscription tracking**: Entire section/screen wrapped in PaywallGate with `feature="subscriptionTracking"`.
> 3. **Bill reminders**: Entire section/screen wrapped in PaywallGate with `feature="billReminders"`.
> 4. **Receipt attachment**: Camera/gallery buttons in transaction form gated behind `feature="receipts"`. Show ProBadge next to receipt attachment option.
>
> Free users can see these features exist in navigation/settings (creates desire) but cannot use them. Use PaywallGate. No em dashes.

**Files modified:** 4-5
**Estimated time:** 20 min

---

## PHASE F: Smart Paywall Triggers

Contextual upgrade prompts that appear at the exact right moment.

---

### Chunk F1: Paywall Trigger Service [IMPLEMENTED]

**Prompt for Cursor:**
> Create a PaywallTriggerService that decides when and where to show upgrade prompts. Follow TDD.
>
> Create:
> - `src/domain/usecases/check-paywall-trigger.ts` - Export `PaywallTrigger` type: `{id: string; type: 'soft' | 'hard'; title: string; description: string; targetTier: Tier; screen: string; feature: string}`. Export `CheckPaywallTrigger` class. Method `shouldTrigger(event: string, context: Record<string, any>): PaywallTrigger | null`. Events: 'wallet_limit_reached', 'parser_limit_reached', 'budget_limit_reached', 'history_limit_reached', 'export_attempted', 'dark_mode_attempted', 'custom_category_attempted', 'month_end'. Each returns the appropriate PaywallTrigger with user-friendly title and description. 'hard' triggers block the action. 'soft' triggers show a dismissible prompt.
> - `src/__tests__/domain/usecases/check-paywall-trigger.test.ts` - Test each event returns correct trigger type, title, and targetTier.
>
> Named exports. No em dashes.

**Files created:** 2
**Estimated time:** 20 min

---

### Chunk F2: Onboarding Paywall [IMPLEMENTED]

**Prompt for Cursor:**
> Add a paywall step at the end of the onboarding flow (after user has set up currency and connected first bank app).
>
> Modify the OnboardingScreen:
> 1. After the final setup step (bank app selection), add a new screen in the carousel: "You are all set! Start your 14-day free trial of WalletPulse Pro."
> 2. Show 3-4 key Pro features with icons
> 3. Primary CTA: "Start Free Trial" (triggers RevenueCat trial purchase)
> 4. Secondary: "Continue with Free" (dismisses and goes to dashboard)
> 5. This is a 'soft' trigger: user can always skip
> 6. Track whether user saw this screen (for analytics)
>
> This is the highest-conversion paywall placement (89.4% of trial starts happen on install day). No em dashes.

**Files modified:** 1
**Estimated time:** 20 min

---

### Chunk F3: Dashboard Insight Upgrade Cards [IMPLEMENTED]

**Prompt for Cursor:**
> Add monetization-related insight cards to the dashboard that naturally promote premium features.
>
> Create:
> - `src/presentation/components/common/UpgradeInsightCard.tsx` - Named export. Similar to existing InsightCard but with upgrade CTA. Props: `title`, `description`, `ctaText`, `onPress`, `tier`. Styled differently from regular insights (subtle accent background, ProBadge).
>
> Modify DashboardScreen to include upgrade insight cards for free users:
> 1. If free user has transactions from 2+ months ago: "Your October spending report is ready. Upgrade to see it."
> 2. If free user has high spending in a category: "Pro users get a Spending Autopsy with savings tips every month."
> 3. If free user has multi-currency transactions: "Track unlimited currencies and see your total balance with Pro."
> 4. Show max 1 upgrade insight per dashboard visit (rotate). Do not show to Pro/Business users.
>
> No em dashes.

**Files created:** 1, **Files modified:** 1
**Estimated time:** 20 min

---

## PHASE G: Premium Revenue Features

The unique features that justify the subscription price.

---

### Chunk G1: Financial Health Score - Domain Logic [IMPLEMENTED]

**Prompt for Cursor:**
> Create the Financial Health Score calculation as a domain use case. Follow TDD.
>
> Create:
> - `src/domain/usecases/calculate-health-score.ts` - Export `CalculateHealthScore` class. Method `execute(params: HealthScoreParams): HealthScoreResult`. Params include: totalIncome (cents), totalExpenses (cents), budgetAdherencePercent (0-100), billsOnTimePercent (0-100), activeSubscriptionCount, usedSubscriptionCount, emergencyFundProgress (0-100), previousPeriodExpenses (cents). Result: `{score: number (0-100), grade: 'A'|'B'|'C'|'D'|'F', factors: {name: string, score: number, weight: number, tip: string}[], trend: 'improving'|'stable'|'declining'}`.
> - Weights: savingsRate 30%, budgetAdherence 20%, billConsistency 15%, emergencyFund 15%, subscriptionEfficiency 10%, spendingTrend 10%.
> - `src/__tests__/domain/usecases/calculate-health-score.test.ts` - Test: perfect scores give 100/A, zero savings gives low score, all factors contribute correctly, edge cases (zero income).
>
> Pure function, no dependencies. Named exports. No em dashes.

**Files created:** 2
**Estimated time:** 25 min

---

### Chunk G2: Financial Health Score - UI Component [IMPLEMENTED]

**Prompt for Cursor:**
> Create the Financial Health Score display component for the dashboard.
>
> Create:
> - `src/presentation/components/charts/HealthScoreGauge.tsx` - Named export. Circular gauge/ring showing the 0-100 score with color coding (red < 40, yellow 40-69, green 70+). Shows letter grade in center. Animated fill on mount using Reanimated. Props: `score`, `grade`, `trend`, `size?`.
> - `src/presentation/components/common/HealthScoreCard.tsx` - Named export. Dashboard card wrapping HealthScoreGauge with: score, grade, trend arrow, "View Details" link. Tapping opens a detail bottom sheet showing all factor breakdowns with individual scores and tips.
> - Gated behind Pro (wrap in PaywallGate with `feature="financialHealthScore"`). Free users see a blurred/locked preview.
>
> Accessible, animated. No em dashes.

**Files created:** 2
**Estimated time:** 25 min

---

### Chunk G3: Payday Planner - Domain Logic [IMPLEMENTED]

**Prompt for Cursor:**
> Create the Payday Planner domain logic. Follow TDD.
>
> Create:
> - `src/domain/usecases/calculate-payday-plan.ts` - Export `CalculatePaydayPlan` class. Method `execute(params: PaydayPlanParams): PaydayPlanResult`. Params: incomeAmount (cents), incomeCurrency, upcomingBills (array of {name, amount, currency, dueDate}), activeBudgets (array of {name, remaining, currency}), currentWalletBalance (cents). Result: `{availableToSpend: number (cents), currency: string, upcomingBillsTotal: number, budgetCommitmentsTotal: number, nextBillName: string, nextBillDate: number, nextBillAmount: number, safeDaily: number (available / days until next payday)}`.
> - `src/__tests__/domain/usecases/calculate-payday-plan.test.ts` - Test: correct available amount after bills and budgets, handles zero bills, handles multi-currency with conversion.
>
> Pure logic. Named exports. No em dashes.

**Files created:** 2
**Estimated time:** 20 min

---

### Chunk G4: Payday Planner - Notification Trigger and UI [IMPLEMENTED]

**Prompt for Cursor:**
> Create the Payday Planner UI that appears when income is detected.
>
> Create:
> - `src/presentation/components/common/PaydayPlannerSheet.tsx` - Named export. Bottom sheet modal that appears when income transaction is detected. Shows: "You received {amount}!" header, breakdown (upcoming bills, budget commitments, available to spend), daily safe spending amount, "Got it" dismiss button. Uses Reanimated for slide-up animation. Gated behind Pro (PaywallGate with `feature="paydayPlanner"`).
>
> Modify the transaction creation flow (use case or listener):
> 1. After an income transaction is created (manual or auto-parsed), check if user is Pro
> 2. If Pro, trigger PaydayPlannerSheet with calculated plan
> 3. If free, optionally show a teaser: "Pro users see an instant spending plan when income arrives"
>
> No em dashes.

**Files created:** 1, **Files modified:** 1
**Estimated time:** 25 min

---

### Chunk G5: Spending Autopsy - Domain Logic [IMPLEMENTED]

**Prompt for Cursor:**
> Create the Spending Autopsy monthly analysis as a domain use case. Follow TDD.
>
> Create:
> - `src/domain/usecases/generate-spending-autopsy.ts` - Export `GenerateSpendingAutopsy` class. Method `execute(params: AutopsyParams): AutopsyResult`. Params: transactions for current and previous period, categories. Result: `{insights: AutopsyInsight[], totalSpent: number, topCategory: string, biggestChange: string, periodComparison: {current: number, previous: number, changePercent: number}}`. Each `AutopsyInsight` has: `{type: 'overspend'|'savings_opportunity'|'trend'|'subscription_waste'|'positive', title: string, description: string, savingsEstimate: number, category?: string, severity: 'info'|'warning'|'critical'}`.
> - Logic: compare spending by category vs previous period, identify top 3 overspends, find unused subscriptions, detect day-of-week patterns, estimate potential savings.
> - `src/__tests__/domain/usecases/generate-spending-autopsy.test.ts` - Test: detects category overspend, finds savings opportunity, handles empty transactions.
>
> Pure logic. Named exports. No em dashes.

**Files created:** 2
**Estimated time:** 25 min

---

### Chunk G6: Spending Autopsy - UI Screen [IMPLEMENTED]

**Prompt for Cursor:**
> Create the Spending Autopsy monthly report screen.
>
> Create:
> - `src/presentation/screens/SpendingAutopsyScreen.tsx` - Default export. Shows monthly spending analysis with: month header, total spent with comparison to last month, list of AutopsyInsight cards (each with icon by type, title, description, estimated savings in green), category breakdown chart (pie/donut), top overspend categories with percentage change. Scrollable. Has "Share Report" button (screenshot share). Gated behind Pro. Shows a preview with 1-2 blurred insights for free users with upgrade CTA.
> - Add navigation route for SpendingAutopsyScreen
> - Add entry point from DashboardScreen (monthly insight card: "Your March Spending Autopsy is ready")
>
> No em dashes.

**Files created:** 1, **Files modified:** 1-2
**Estimated time:** 25 min

---

### Chunk G7: Money Lost Tracker - Domain Logic [IMPLEMENTED]

**Prompt for Cursor:**
> Create the Money Lost Tracker that calculates FX fee losses. Follow TDD.
>
> Create:
> - `src/domain/usecases/calculate-money-lost.ts` - Export `CalculateMoneyLost` class. Method `execute(params: MoneyLostParams): MoneyLostResult`. For each transaction that involved currency conversion (source like Payoneer, Grey), compare the FX rate at transaction time (from fx_rates cache nearest to transaction date) with the mid-market rate. The difference is "money lost." Result: `{totalLost: number (cents), currency: string, transactionCount: number, averageLossPerTransaction: number, worstTransaction: {date, amount, lostAmount, source}, bySource: {source: string, totalLost: number, count: number}[], byMonth: {month: string, totalLost: number}[], savingsTip: string}`.
> - `src/__tests__/domain/usecases/calculate-money-lost.test.ts` - Test: calculates loss from rate difference, handles zero loss, aggregates by source correctly.
>
> Gated behind Business tier. Named exports. No em dashes.

**Files created:** 2
**Estimated time:** 25 min

---

### Chunk G8: Currency Timing Advisor - Domain Logic [IMPLEMENTED]

**Prompt for Cursor:**
> Create the Currency Timing Advisor that alerts users when FX rates are favorable. Follow TDD.
>
> Create:
> - `src/domain/usecases/analyze-currency-timing.ts` - Export `AnalyzeCurrencyTiming` class. Method `execute(params: CurrencyTimingParams): CurrencyTimingResult`. Params: currencyPair (from/to), historicalRates (array of {rate, date} for last 30-90 days). Result: `{currentRate: number, average30Day: number, average90Day: number, isAboveAverage: boolean, percentAboveAverage: number, recommendation: 'buy_now'|'wait'|'neutral', confidence: 'high'|'medium'|'low', bestRateInPeriod: {rate, date}, worstRateInPeriod: {rate, date}, trend: 'rising'|'falling'|'stable'}`.
> - `src/__tests__/domain/usecases/analyze-currency-timing.test.ts` - Test: rate above 30-day average recommends buy_now, rate at average is neutral, declining trend warns to wait.
>
> Gated behind Business. Named exports. No em dashes.

**Files created:** 2
**Estimated time:** 20 min

---

## PHASE H: In-App Purchase Add-ons

One-time purchases for parser packs, themes, and reports.

---

### Chunk H1: IAP Product Registry [IMPLEMENTED]

**Prompt for Cursor:**
> Create the in-app purchase product registry for non-subscription purchases (parser packs, themes, reports).
>
> Create:
> - `src/shared/constants/iap-products.ts` - Export `IAP_PRODUCTS` constant mapping product IDs to metadata. Categories: `PARSER_PACKS` (international, african, european, middleeast, asian, latam, us, crypto, allbanks), `REPORT_TEMPLATES` (annual_summary, tax_prep, invoice_tracker, networth, subscription_audit, currency_impact, report_bundle), `THEME_PACKS` (midnight_oled, ocean_depth, forest, sunset, minimal_ink, neon_finance, all_themes), `ICON_PACKS` (minimal_line, filled_color, emoji, hand_drawn, corporate). Each entry has: `id: string`, `name: string`, `description: string`, `price: string`, `category: string`, `googlePlayId: string`.
> - `src/domain/repositories/IIAPRepository.ts` - Interface with: `getPurchasedProducts(): Promise<string[]>`, `purchaseProduct(productId: string): Promise<boolean>`, `isProductOwned(productId: string): Promise<boolean>`.
>
> Named exports. No em dashes.

**Files created:** 2
**Estimated time:** 15 min

---

### Chunk H2: IAP Repository Implementation [IMPLEMENTED]

**Prompt for Cursor:**
> Create the IAP repository implementation using RevenueCat for non-subscription purchases.
>
> Create:
> - `src/data/repositories/IAPRepository.ts` - Implements IIAPRepository. Uses RevenueCat to check non-subscription entitlements and process one-time purchases. `getPurchasedProducts()` reads owned products from CustomerInfo. `purchaseProduct()` calls RevenueCat purchase for one-time products. `isProductOwned()` checks if product is in owned list. Also checks: if user has Pro/Business subscription, all parser packs and themes are considered "owned" (subscription includes them).
> - `src/__tests__/data/repositories/IAPRepository.test.ts` - Test: non-purchased product returns false, purchased returns true, Pro subscriber owns all parser packs.
>
> Named exports. No em dashes.

**Files created:** 2
**Estimated time:** 20 min

---

### Chunk H3: Parser Pack Store Screen [IMPLEMENTED]

**Prompt for Cursor:**
> Create a store screen where users can browse and buy parser packs.
>
> Create:
> - `src/presentation/screens/ParserPackStoreScreen.tsx` - Default export. Grid/list of parser packs. Each pack card shows: region flag/icon, pack name, included banks (list), price, "Purchased" badge if owned, "Included with Pro" badge if user has Pro/Business. Buy button triggers IAP purchase. "All Banks Bundle" highlighted at top with savings percentage. Section at bottom: "Or upgrade to Pro for all parsers + more".
> - Add navigation route
>
> Accessible entry points: Settings > Notification Parsers, or when user tries to enable a parser from an unowned pack. No em dashes.

**Files created:** 1, **Files modified:** 1
**Estimated time:** 25 min

---

### Chunk H4: Theme Store Screen [IMPLEMENTED]

**Prompt for Cursor:**
> Create a store screen for premium theme packs.
>
> Create:
> - `src/presentation/screens/ThemeStoreScreen.tsx` - Default export. Shows all available themes with a live preview card for each (mini screenshot or color swatches). Each shows: theme name, description, price, "Purchased"/"Included with Pro" badge, "Preview" button (temporarily applies theme), "Buy" button. "All Themes Bundle" at top with savings. Current active theme highlighted.
> - Add navigation route from Settings > Appearance
>
> No em dashes.

**Files created:** 1, **Files modified:** 1
**Estimated time:** 20 min

---

## PHASE I: Affiliate System

Contextual partner recommendations that generate referral revenue.

---

### Chunk I1: Affiliate Link Registry and Service [IMPLEMENTED]

**Prompt for Cursor:**
> Create the affiliate link management system. Follow TDD.
>
> Create:
> - `src/shared/constants/affiliate-links.ts` - Export `AFFILIATE_PARTNERS` constant: array of `{id, name, description, referralUrl, icon, category: 'banking'|'accounting'|'crypto', contextTrigger: string}`. Include: Wise, Revolut, Grey, Payoneer, Binance, QuickBooks, Wave, FreshBooks.
> - `src/domain/usecases/get-affiliate-recommendation.ts` - Export `GetAffiliateRecommendation` class. Method `execute(context: {totalFxFees?: number, currencies?: string[], source?: string}): AffiliateRecommendation | null`. Logic: if user has high FX fees and no Wise transactions, recommend Wise. If user has no Grey but is in Africa, recommend Grey. Returns null if no relevant recommendation. Never spammy: max 1 recommendation per week per partner.
> - `src/__tests__/domain/usecases/get-affiliate-recommendation.test.ts` - Test: high FX fees recommends Wise, no recommendation if already using Wise, respects weekly cooldown.
>
> Named exports. No em dashes.

**Files created:** 3
**Estimated time:** 20 min

---

### Chunk I2: Affiliate Recommendation Card UI [IMPLEMENTED]

**Prompt for Cursor:**
> Create the affiliate recommendation card that appears contextually in the app.
>
> Create:
> - `src/presentation/components/common/AffiliateCard.tsx` - Named export. Props: `partner: AffiliatePartner`, `context: string` (e.g., "You paid $47 in conversion fees this month"), `onDismiss`, `onLearnMore`. Card with: partner logo/icon, contextual message, "Learn More" button (opens referral URL in browser), dismiss X button. Subtle styling that looks helpful, not like an ad. Dismissing records a "dismissed" timestamp for cooldown. Labeled "Partner suggestion" for transparency.
>
> Placement points:
> 1. Dashboard insight cards area (for free and paid users)
> 2. After viewing Money Lost Tracker results
> 3. Wallet creation screen (when adding a currency wallet)
>
> Accessible, dismissible, respectful. No em dashes.

**Files created:** 1
**Estimated time:** 15 min

---

## PHASE J: Trial System and Retention

The trial experience and anti-churn mechanics.

---

### Chunk J1: Trial Status Tracking [IMPLEMENTED]

**Prompt for Cursor:**
> Create the trial status tracking system. Follow TDD.
>
> Create:
> - `src/domain/usecases/check-trial-status.ts` - Export `CheckTrialStatus` class. Method `execute(): TrialStatus`. Returns: `{isActive: boolean, daysRemaining: number | null, startedAt: number | null, endsAt: number | null, isExpired: boolean, isInGracePeriod: boolean}`. Grace period = 3 days after trial ends where transactions are still captured but insights are locked.
> - `src/__tests__/domain/usecases/check-trial-status.test.ts` - Test: active trial returns correct days remaining, expired trial with grace period, no trial returns null values.
>
> Create:
> - `src/presentation/components/common/TrialBanner.tsx` - Named export. Persistent banner shown at top of screens during trial. Shows "X days left in your Pro trial" with progress bar. On last 3 days, turns amber. On last day, turns red. Tapping opens PaywallScreen. Dismissible but reappears next session.
>
> Named exports. No em dashes.

**Files created:** 3
**Estimated time:** 20 min

---

### Chunk J2: Trial Reminder Notifications [IMPLEMENTED]

**Prompt for Cursor:**
> Create scheduled local notifications for trial reminders.
>
> Create:
> - `src/infrastructure/notifications/trial-reminders.ts` - Export `scheduleTrialReminders(trialEndsAt: number)` function. Schedules Android local notifications at: Day 1 ("Your Pro trial has started! Here is what you can do."), Day 7 ("You have tracked X transactions this week with Pro"), Day 12 ("Your trial ends in 2 days. Keep your Pro features."), Day 14 ("Your Pro trial ends today. Subscribe to keep unlimited access."). Export `cancelTrialReminders()` for when user subscribes. Use react-native local notification library.
> - `src/infrastructure/notifications/retention-notifications.ts` - Export `scheduleRetentionNotification(type, data)`. Types: 'inactive_user' (5 days no open: "Your wallet tracked X transactions. Take a look."), 'monthly_report' ("Your March Spending Autopsy is ready"), 'budget_update' ("You have $X left in your Food budget").
>
> Named exports. No em dashes.

**Files created:** 2
**Estimated time:** 20 min

---

### Chunk J3: Win-Back and Churn Recovery [IMPLEMENTED]

**Prompt for Cursor:**
> Create the win-back offer system for churned users.
>
> Create:
> - `src/domain/usecases/check-winback-eligibility.ts` - Export `CheckWinbackEligibility` class. Method `execute(): WinbackOffer | null`. Logic: if user was previously Pro/Business and downgraded/cancelled within last 60 days, return an offer. Offer types: 7 days after cancel = 50% off first month, 30 days = 40% off 3 months, 60 days = special annual deal. Returns null if not eligible or already shown.
> - `src/presentation/components/common/WinbackOfferSheet.tsx` - Named export. Bottom sheet shown to eligible users on app open. Shows: "We miss you!" message, what they are missing (transaction count since leaving, features they lost), special offer with discounted price, "Resubscribe" CTA, "No thanks" dismiss. Animated entrance.
> - `src/__tests__/domain/usecases/check-winback-eligibility.test.ts` - Test: recently cancelled user gets 50% offer, user cancelled 40 days ago gets 40% offer, never-subscribed user gets null.
>
> Named exports. No em dashes.

**Files created:** 3
**Estimated time:** 25 min

---

## PHASE K: Analytics and Revenue Tracking

Track what is working and optimize.

---

### Chunk K1: Monetization Event Tracking [IMPLEMENTED]

**Prompt for Cursor:**
> Create a monetization analytics service to track conversion funnel events.
>
> Create:
> - `src/infrastructure/analytics/monetization-events.ts` - Export `MonetizationAnalytics` class with methods: `trackPaywallViewed(source: string, tier: Tier)`, `trackPaywallDismissed(source: string, duration: number)`, `trackTrialStarted(tier: Tier)`, `trackPurchaseCompleted(productId: string, price: number, tier: Tier)`, `trackPurchaseFailed(productId: string, error: string)`, `trackFeatureGateHit(feature: string, currentTier: Tier)`, `trackUpgradePromptShown(trigger: string, screen: string)`, `trackUpgradePromptDismissed(trigger: string)`, `trackAffiliateClicked(partnerId: string)`, `trackWinbackShown(offerId: string)`, `trackWinbackAccepted(offerId: string)`, `trackTrialReminderSent(day: number)`.
> - Store events locally in an `analytics_events` table or async storage for now. Can be swapped to Firebase Analytics later.
> - `src/infrastructure/analytics/analytics-types.ts` - Export all event types.
>
> Named exports. No em dashes.

**Files created:** 2
**Estimated time:** 20 min

---

### Chunk K2: Revenue Dashboard (Developer Tools) [IMPLEMENTED]

**Prompt for Cursor:**
> Add a monetization debug screen to the developer tools for testing purchases and entitlements.
>
> Create:
> - `src/presentation/screens/MonetizationDebugScreen.tsx` - Default export. Only visible in dev mode. Shows: current tier and entitlement details, list of all features with their current access status (green check / red x), buttons to simulate tier changes (for testing UI without real purchases), RevenueCat CustomerInfo raw dump, list of all IAP products with purchase status, paywall trigger test buttons, analytics event log. Useful for testing all monetization flows without real payments.
> - Add to developer tools navigation
>
> No em dashes.

**Files created:** 1, **Files modified:** 1
**Estimated time:** 20 min

---

## PHASE L: RevenueCat App Initialization

Wire everything together at app startup.

---

### Chunk L1: App Startup Purchase Initialization [IMPLEMENTED]

**Prompt for Cursor:**
> Wire RevenueCat initialization into the app startup flow.
>
> Modify `App.tsx` or the root component:
> 1. Call `initializePurchases()` from revenue-cat-client.ts on app mount
> 2. Load initial entitlement state into useEntitlementStore
> 3. Set up RevenueCat customer info listener for real-time subscription changes
> 4. Check trial status and schedule/cancel trial reminders accordingly
> 5. Check winback eligibility and show offer if applicable
> 6. All of this should happen in a `useEffect` on mount, after database is ready
>
> Create:
> - `src/presentation/hooks/usePurchaseInitialization.ts` - Hook that handles all the above. Called once in root component. Returns `{isReady: boolean}`.
>
> No em dashes.

**Files created:** 1, **Files modified:** 1
**Estimated time:** 20 min

---

## Implementation Order Summary

```
PHASE A: Domain Layer (5 chunks, ~55 min)
  A1 -> A2 -> A3 -> A4 -> A5

PHASE B: Purchase Infrastructure (5 chunks, ~85 min)
  B1 -> B2 -> B3 -> B4 -> B5

PHASE C: Presentation Hooks + Gate (4 chunks, ~70 min)
  C1 -> C2 -> C3 -> C4

PHASE D: Paywall Screen (5 chunks, ~110 min)
  D1 -> D2 -> D3 -> D4 -> D5

PHASE E: Feature Gating (7 chunks, ~130 min)
  E1 through E7 (any order, all independent)

PHASE F: Smart Triggers (3 chunks, ~60 min)
  F1 -> F2 -> F3

PHASE G: Premium Features (8 chunks, ~165 min)
  G1 -> G2 (Health Score)
  G3 -> G4 (Payday Planner)
  G5 -> G6 (Spending Autopsy)
  G7 (Money Lost)
  G8 (Currency Timing)
  (These 4 groups can run in parallel)

PHASE H: IAP Add-ons (4 chunks, ~80 min)
  H1 -> H2 -> H3, H4 (H3 and H4 are independent)

PHASE I: Affiliates (2 chunks, ~35 min)
  I1 -> I2

PHASE J: Trial + Retention (3 chunks, ~65 min)
  J1 -> J2 -> J3

PHASE K: Analytics (2 chunks, ~40 min)
  K1 -> K2

PHASE L: App Init (1 chunk, ~20 min)
  L1 (depends on all above)
```

**Total: 49 chunks, ~915 min (~15 hours of focused work)**

Each chunk is a single Cursor session. Copy the prompt, let Cursor build it, review, test, commit. Move to the next chunk.
