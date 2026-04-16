module.exports = {
  preset: 'react-native',
  setupFiles: ['react-native-get-random-values'],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@data/(.*)$': '<rootDir>/src/data/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@notifee/react-native$': '<rootDir>/__mocks__/@notifee/react-native.js',
    '^react-native-keychain$': '<rootDir>/__mocks__/react-native-keychain.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@shopify|@gorhom|@notifee|@revenuecat|@dr\\.pogodin|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-vector-icons|react-native-svg|react-native-haptic-feedback|react-native-gifted-charts|react-native-config|react-native-worklets|react-native-share|react-native-linear-gradient|react-native-image-picker|react-native-html-to-pdf|@react-native-async-storage|@react-native-community|react-native-keychain|react-native-get-random-values|react-native-url-polyfill|@supabase|uuid)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
};
