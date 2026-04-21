module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    'react/react-in-jsx-scope': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {argsIgnorePattern: '^_', varsIgnorePattern: '^_'},
    ],
    // Disabled: the entire UI is themed, so most styles combine dynamic theme
    // values (colors, spacing) that can't live in StyleSheet.create.
    'react-native/no-inline-styles': 'off',
    // Disabled: `void someAsyncFn()` is the idiomatic TS pattern for
    // intentional fire-and-forget promises.
    'no-void': 'off',
    curly: ['error', 'all'],
    eqeqeq: ['error', 'always'],
    'no-console': ['warn', {allow: ['warn', 'error']}],
  },
};
