import React from 'react';
import {render} from '@testing-library/react-native';

import {MiniBarChart} from '@presentation/components/charts/MiniBarChart';
import {ThemeProvider} from '@shared/theme';

jest.mock('@presentation/stores/useSettingsStore', () => ({
  useSettingsStore: (selector: (s: {hideAmounts: boolean}) => boolean) =>
    selector({hideAmounts: false}),
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
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => true,
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    withTiming: (v: unknown) => v,
    withSpring: (v: unknown) => v,
    withDelay: (_d: unknown, v: unknown) => v,
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withRepeat: (v: unknown) => v,
    Easing: {
      bezier: () => () => 0,
      inOut: () => () => 0,
      in: () => () => 0,
      out: () => () => 0,
      linear: () => 0,
    },
  };
});

const sampleWeek = [
  {label: 'Mon', incomeAmount: 0, expenseAmount: 0},
  {label: 'Tue', incomeAmount: 0, expenseAmount: 0},
  {label: 'Wed', incomeAmount: 0, expenseAmount: 0},
  {label: 'Thu', incomeAmount: 0, expenseAmount: 0},
  {label: 'Fri', incomeAmount: 0, expenseAmount: 0},
  {label: 'Sat', incomeAmount: 0, expenseAmount: 0},
  {label: 'Sun', incomeAmount: 0, expenseAmount: 0, isToday: true},
];

const renderChart = (data = sampleWeek) =>
  render(
    <ThemeProvider>
      <MiniBarChart data={data} currency="USD" />
    </ThemeProvider>,
  );

describe('MiniBarChart', () => {
  it('renders the empty-state copy when both income and expense are zero across the week', () => {
    const screen = renderChart();
    expect(screen.getByText(/No activity this week/i)).toBeTruthy();
  });

  it('renders weekly income and expense subtitles when data is present', () => {
    const data = [
      ...sampleWeek.slice(0, 6),
      {label: 'Sun', incomeAmount: 5000, expenseAmount: 1500, isToday: true},
    ];
    const screen = renderChart(data);
    expect(screen.getByText(/Income this week/i)).toBeTruthy();
    expect(screen.getByText(/Expenses this week/i)).toBeTruthy();
    expect(screen.queryByText(/No activity this week/i)).toBeNull();
  });

  it('renders one income bar and one expense bar per day', () => {
    const data = [
      ...sampleWeek.slice(0, 6),
      {label: 'Sun', incomeAmount: 5000, expenseAmount: 1500, isToday: true},
    ];
    const screen = renderChart(data);
    const incomeBars = screen.queryAllByTestId(/^bar-income-/);
    const expenseBars = screen.queryAllByTestId(/^bar-expense-/);
    expect(incomeBars).toHaveLength(7);
    expect(expenseBars).toHaveLength(7);
  });

  it('exposes a legend marking income and expense series', () => {
    const data = [
      ...sampleWeek.slice(0, 6),
      {label: 'Sun', incomeAmount: 5000, expenseAmount: 1500, isToday: true},
    ];
    const screen = renderChart(data);
    expect(screen.getByText('Income')).toBeTruthy();
    expect(screen.getByText('Expenses')).toBeTruthy();
  });
});
