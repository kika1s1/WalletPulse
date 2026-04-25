import React from 'react';
import {render} from '@testing-library/react-native';

import {BalanceHeader} from '@presentation/components/BalanceHeader';
import {ThemeProvider} from '@shared/theme';

jest.mock('@presentation/stores/useSettingsStore', () => ({
  useSettingsStore: (
    selector: (s: {hideAmounts: boolean; toggleHideAmounts: () => void}) => unknown,
  ) => selector({hideAmounts: false, toggleHideAmounts: () => {}}),
}));

jest.mock('react-native-reanimated', () => {
  const RealRN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View: RealRN.View,
      Text: RealRN.Text,
      createAnimatedComponent: (c: unknown) => c,
    },
    useSharedValue: (v: unknown) => ({value: v}),
    useAnimatedReaction: () => undefined,
    useReducedMotion: () => true,
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    withTiming: (v: unknown) => v,
  };
});

jest.mock('@presentation/components/common/AppIcon', () => {
  const {Text: MockText} = require('react-native');
  return {AppIcon: ({name}: {name: string}) => <MockText>{name}</MockText>};
});

const renderHeader = (percentChange: number) =>
  render(
    <ThemeProvider>
      <BalanceHeader
        totalBalance={123456}
        currency="USD"
        percentChange={percentChange}
      />
    </ThemeProvider>,
  );

describe('BalanceHeader percent pill', () => {
  it('labels a positive change as Spending vs last month', () => {
    const screen = renderHeader(12.5);
    expect(screen.getByText(/Spending vs last month/i)).toBeTruthy();
    expect(screen.getByText(/12\.5/)).toBeTruthy();
  });

  it('labels a negative change as Spending vs last month', () => {
    const screen = renderHeader(-7);
    expect(screen.getByText(/Spending vs last month/i)).toBeTruthy();
    expect(screen.getByText(/7/)).toBeTruthy();
  });

  it('labels no change as Spending unchanged vs last month', () => {
    const screen = renderHeader(0);
    expect(screen.getByText(/Spending unchanged vs last month/i)).toBeTruthy();
  });
});
