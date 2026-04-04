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
    'react-native/no-inline-styles': 'warn',
    curly: ['error', 'all'],
    eqeqeq: ['error', 'always'],
    'no-console': ['warn', {allow: ['warn', 'error']}],
  },
};
