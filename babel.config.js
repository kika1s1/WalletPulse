module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', {legacy: true}],
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@domain': './src/domain',
          '@data': './src/data',
          '@presentation': './src/presentation',
          '@infrastructure': './src/infrastructure',
          '@shared': './src/shared',
          '@app': './src/app',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
