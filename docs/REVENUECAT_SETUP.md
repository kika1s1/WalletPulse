# RevenueCat Setup For WalletPulse

This project now includes a working RevenueCat foundation for Android with:

- `react-native-purchases`
- `react-native-purchases-ui`
- Walletpulse Pro entitlement checks
- Monthly, yearly, and lifetime plan handling
- RevenueCat paywall support
- RevenueCat Customer Center support
- Customer info sync on app launch

## 1. Install the SDK with npm

```bash
npm install --save react-native-purchases react-native-purchases-ui
```

The UI package is required for RevenueCat Paywalls and Customer Center.

## 2. RevenueCat dashboard configuration

Create the following RevenueCat objects before testing purchases:

### Entitlement

- Entitlement identifier: `Walletpulse Pro`

### Products

Create these store products in Google Play Console first, then import them into RevenueCat:

- Monthly product ID: `monthly`
- Yearly product ID: `yearly`
- Lifetime product ID: `lifetime`

Attach all three products to the `Walletpulse Pro` entitlement.

### Offering

Create a current offering in RevenueCat:

- Offering identifier: `default`

Add these packages to the offering:

- Monthly package -> product `monthly`
- Annual package -> product `yearly`
- Lifetime package -> product `lifetime`

Using the built-in RevenueCat package types is recommended:

- Monthly -> monthly package
- Yearly -> annual package
- Lifetime -> lifetime package

## 3. App configuration

The Android SDK key is configured in:

- `src/shared/constants/purchase-constants.ts`

Current values:

- RevenueCat SDK key: `test_yurqyLRptPXXbpWFuWdrMvTVLLU`
- Entitlement ID: `Walletpulse Pro`
- Product IDs: `monthly`, `yearly`, `lifetime`
- Default offering: `default`

## 4. Android requirement

RevenueCat recommends `standard` or `singleTop` activity launch mode for Android purchase flows.

This project now uses:

- `android:launchMode="singleTop"`

in:

- `android/app/src/main/AndroidManifest.xml`

## 5. Runtime initialization

RevenueCat is initialized automatically when the app starts.

Key files:

- `src/infrastructure/purchases/revenue-cat-client.ts`
- `src/presentation/stores/useEntitlementStore.ts`
- `src/presentation/hooks/usePurchaseInitialization.ts`
- `src/app/App.tsx`

The app now:

1. Configures RevenueCat on startup
2. Fetches customer info
3. Loads the current offering
4. Subscribes to `CustomerInfo` updates
5. Keeps Walletpulse Pro entitlement state in sync

## 6. Entitlement and plan mapping

WalletPulse uses RevenueCat `CustomerInfo` to determine:

- Whether `Walletpulse Pro` is active
- Which plan is active, monthly, yearly, or lifetime
- Whether the user is on trial
- When access expires

Key mapping logic lives in:

- `src/infrastructure/purchases/entitlement-map.ts`

## 7. In-app subscription management screen

A built-in management screen is available in:

- `Settings > Walletpulse Pro`

Screen file:

- `src/presentation/screens/ManageSubscriptionScreen.tsx`

This screen lets the user:

- View current plan and entitlement status
- Purchase monthly, yearly, or lifetime directly
- Open the native RevenueCat paywall
- Restore purchases
- Open RevenueCat Customer Center
- Open the platform subscription management link when available

## 8. Present the RevenueCat paywall

The project supports native RevenueCat paywalls.

Use the store action:

```ts
import {useEntitlementStore} from '@presentation/stores/useEntitlementStore';

const presentPaywall = useEntitlementStore.getState().presentPaywall;
await presentPaywall();
```

To only show a paywall when `Walletpulse Pro` is not already active:

```ts
import {useEntitlementStore} from '@presentation/stores/useEntitlementStore';

const presentPaywallIfNeeded =
  useEntitlementStore.getState().presentPaywallIfNeeded;

await presentPaywallIfNeeded();
```

Internally, this uses RevenueCat UI with:

- `requiredEntitlementIdentifier: "Walletpulse Pro"`

## 9. Open Customer Center

Customer Center is supported through `react-native-purchases-ui`.

Use:

```ts
import {useEntitlementStore} from '@presentation/stores/useEntitlementStore';

const openCustomerCenter =
  useEntitlementStore.getState().openCustomerCenter;

await openCustomerCenter();
```

Important:

- Customer Center must be enabled and configured in RevenueCat
- It is available on supported RevenueCat plans
- If it is not configured, the app will show a safe fallback message

## 10. Customer info retrieval

To access live subscription data in UI code:

```ts
import {useEntitlement} from '@presentation/hooks/useEntitlement';

const {
  hasWalletPulsePro,
  currentPlanId,
  currentPlanLabel,
  isTrialing,
  expiresAt,
  customerInfo,
} = useEntitlement();
```

Useful values exposed by the hook:

- `tier`
- `hasWalletPulsePro`
- `currentPlanId`
- `currentPlanLabel`
- `isTrialing`
- `expiresAt`
- `managementUrl`
- `availablePackages`
- `canAccess(feature)`

## 11. Direct purchase flow

To purchase a specific WalletPulse plan programmatically:

```ts
import {useEntitlementStore} from '@presentation/stores/useEntitlementStore';

await useEntitlementStore.getState().purchasePlan('monthly');
await useEntitlementStore.getState().purchasePlan('yearly');
await useEntitlementStore.getState().purchasePlan('lifetime');
```

The purchase flow:

1. Loads the current RevenueCat offering
2. Finds the matching RevenueCat package
3. Calls `Purchases.purchasePackage(...)`
4. Refreshes customer info
5. Updates the entitlement store automatically

## 12. Restore purchases

```ts
import {useEntitlementStore} from '@presentation/stores/useEntitlementStore';

await useEntitlementStore.getState().restorePurchases();
```

This calls RevenueCat restore, refreshes customer info, and updates Walletpulse Pro status in the store.

## 13. Best practices used in this integration

- Use RevenueCat offerings and packages instead of hard-coding store product fetch logic
- Gate premium access by entitlement, not by product ID
- Keep raw `CustomerInfo` available for diagnostics and future feature gating
- Refresh state after purchase, restore, paywall completion, and Customer Center use
- Use `presentPaywallIfNeeded()` for upgrade prompts attached to premium features
- Keep the Android activity launch mode compatible with purchase verification flows
- Keep lifetime access separate from recurring monthly and yearly plans

## 14. Optional identity hookup

If WalletPulse later adds auth, connect RevenueCat identities like this:

```ts
import {
  logInToPurchases,
  setPurchasesAttributes,
} from '@infrastructure/purchases/revenue-cat-client';

await logInToPurchases(user.id);
await setPurchasesAttributes({
  email: user.email,
  display_name: user.name,
});
```

This keeps subscriptions tied to a stable app user ID across reinstalls and devices.

## 15. Verification checklist

Before release, verify all of the following:

1. RevenueCat current offering is `default`
2. `Walletpulse Pro` entitlement exists
3. `monthly`, `yearly`, and `lifetime` products are attached correctly
4. Google Play test users can purchase all three plans
5. Restore purchases works on a fresh install
6. Paywall opens successfully
7. Customer Center opens successfully, if enabled in RevenueCat
8. `Settings > Walletpulse Pro` shows the correct active plan after purchase
