# WalletPulse: Technology Stack and Dependencies

## Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| react-native | ^0.76 | Mobile app framework |
| react | ^18.3 | UI library |
| typescript | ^5.5 | Type-safe JavaScript |

## Navigation

| Package | Purpose |
|---------|---------|
| @react-navigation/native | Navigation core |
| @react-navigation/native-stack | Stack navigator |
| @react-navigation/bottom-tabs | Bottom tab navigator |
| react-native-screens | Native screen containers |
| react-native-safe-area-context | Safe area handling |

## Database

| Package | Purpose |
|---------|---------|
| @nozbe/watermelondb | Reactive offline-first database |
| @nozbe/with-observables | HOC for reactive components |

## State Management

| Package | Purpose |
|---------|---------|
| zustand | Lightweight state management for UI state |

## UI and Styling

| Package | Purpose |
|---------|---------|
| react-native-vector-icons | Icon library |
| react-native-gifted-charts | Charts (pie, bar, line) |
| @shopify/flash-list | High-performance list rendering |
| react-native-reanimated | 60fps animations and micro-interactions |
| react-native-gesture-handler | Touch gesture handling (swipe, pan) |
| react-native-haptic-feedback | Haptic feedback on interactions |
| react-native-linear-gradient | Gradient backgrounds |
| react-native-svg | SVG rendering for custom graphics |
| @gorhom/bottom-sheet | Native bottom sheet component |
| react-native-fast-image | Optimized image loading for receipts |

## Utilities

| Package | Purpose |
|---------|---------|
| react-native-config | Environment variable management (.env) |
| react-native-background-fetch | Background FX rate updates |
| react-native-fs | File system access (exports, backup) |
| react-native-share | Share exported files |
| react-native-image-picker | Receipt photo capture |
| react-native-keychain | Secure storage (PIN, biometrics) |
| date-fns | Date formatting and manipulation |
| uuid | Unique ID generation |
| react-native-splash-screen | Splash screen management |
| react-native-localize | Locale detection |
| react-native-device-info | Device info for debug |

## Testing

| Package | Purpose |
|---------|---------|
| jest | Testing framework (TDD) |
| @testing-library/react-native | Component testing |
| @testing-library/jest-native | Extended matchers |
| jest-watermelondb | WatermelonDB test adapter |

## Code Quality

| Package | Purpose |
|---------|---------|
| eslint | Linting |
| @typescript-eslint/eslint-plugin | TypeScript linting rules |
| prettier | Code formatting |
| husky | Git hooks (pre-commit) |
| lint-staged | Run linters on staged files |

## Native Modules (Custom)

| Module | Language | Purpose |
|--------|----------|---------|
| NotificationListenerModule | Kotlin | Android NotificationListenerService bridge |

## Build and Config Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript compiler options (strict mode) |
| `babel.config.js` | Babel with WatermelonDB decorator plugin |
| `metro.config.js` | Metro bundler configuration |
| `.env` | Environment variables (API keys) |
| `.env.example` | Template for environment variables |
| `jest.config.js` | Jest testing configuration |
| `.eslintrc.js` | ESLint rules |
| `.prettierrc` | Prettier formatting rules |

## Path Aliases (tsconfig)

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@domain/*": ["domain/*"],
      "@data/*": ["data/*"],
      "@presentation/*": ["presentation/*"],
      "@infrastructure/*": ["infrastructure/*"],
      "@shared/*": ["shared/*"],
      "@app/*": ["app/*"]
    }
  }
}
```

## Babel Config Notes

WatermelonDB requires decorator support. Path aliases need babel-plugin-module-resolver:

```js
// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@domain': './src/domain',
        '@data': './src/data',
        '@presentation': './src/presentation',
        '@infrastructure': './src/infrastructure',
        '@shared': './src/shared',
        '@app': './src/app',
      },
    }],
    'react-native-reanimated/plugin',
  ],
};
```
