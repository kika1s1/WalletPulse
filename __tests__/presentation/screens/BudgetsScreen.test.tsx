import React from 'react';
import {act, render} from '@testing-library/react-native';

import BudgetsScreen from '@presentation/screens/BudgetsScreen';
import {ThemeProvider} from '@shared/theme';

const mockNavigate = jest.fn();
const mockBudgetRefetch = jest.fn();
const mockProgressRefetch = jest.fn();

let mockFocusEffectCallback: (() => void) | undefined;

type MockBudget = {
  id: string;
  amount: number;
  currency: string;
  period: 'weekly' | 'monthly';
  rollover: boolean;
  isActive: boolean;
};

type MockBudgetProgressItem = {
  budget: MockBudget;
  categoryName: string;
  categoryColor: string;
  spent: number;
  remaining: number;
  percentage: {value: number};
  status: 'under' | 'warning' | 'danger' | 'exceeded';
};

const mockUseBudgets = jest.fn();
const mockUseBudgetProgress = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useFocusEffect: (callback: () => void) => {
    mockFocusEffectCallback = callback;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('@presentation/hooks/useBudgets', () => ({
  useBudgets: () => mockUseBudgets(),
}));

jest.mock('@presentation/hooks/useBudgetProgress', () => ({
  useBudgetProgress: (budgets: MockBudget[]) => mockUseBudgetProgress(budgets),
}));

jest.mock('@presentation/stores/useSettingsStore', () => ({
  useSettingsStore: (selector: (state: {hideAmounts: boolean}) => boolean) =>
    selector({hideAmounts: false}),
}));

jest.mock('@presentation/components/common', () => {
  const {Pressable, Text: MockText} = require('react-native');
  return {
    BackButton: () => (
      <Pressable accessibilityLabel="Back" accessibilityRole="button">
        <MockText>Back</MockText>
      </Pressable>
    ),
  };
});

jest.mock('@presentation/components/common/AppIcon', () => {
  const {Text: MockText} = require('react-native');
  return {
    AppIcon: ({name}: {name: string}) => <MockText>{name}</MockText>,
  };
});

jest.mock('@presentation/components/common/ProgressBar', () => {
  const {Text: MockText} = require('react-native');
  return {
    ProgressBar: () => <MockText>ProgressBar</MockText>,
  };
});

jest.mock('@presentation/components/BudgetCard', () => {
  const {Text: MockText} = require('react-native');
  return {
    BudgetCard: ({categoryName}: {categoryName: string}) => <MockText>{categoryName}</MockText>,
  };
});

function renderScreen() {
  return render(
    <ThemeProvider>
      <BudgetsScreen />
    </ThemeProvider>,
  );
}

function makeOverallBudget(): MockBudget {
  return {
    id: 'budget-overall',
    amount: 50_000,
    currency: 'USD',
    period: 'monthly',
    rollover: false,
    isActive: true,
  };
}

function makeOverallProgressItem(): MockBudgetProgressItem {
  return {
    budget: makeOverallBudget(),
    categoryName: 'Overall',
    categoryColor: '#6C5CE7',
    spent: 12_500,
    remaining: 37_500,
    percentage: {value: 25},
    status: 'under',
  };
}

describe('BudgetsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockBudgetRefetch.mockReset();
    mockProgressRefetch.mockReset();
    mockFocusEffectCallback = undefined;

    mockUseBudgets.mockReturnValue({
      activeBudgets: [],
      isLoading: false,
      error: null,
      refetch: mockBudgetRefetch,
    });

    mockUseBudgetProgress.mockReturnValue({
      items: [],
      overallItem: null,
      isLoading: false,
      error: null,
      refetch: mockProgressRefetch,
      totalBudget: 0,
      totalSpent: 0,
    });
  });

  it('refreshes budgets and progress when the screen regains focus', () => {
    renderScreen();

    expect(mockFocusEffectCallback).toBeDefined();

    act(() => {
      mockFocusEffectCallback?.();
    });

    expect(mockBudgetRefetch).toHaveBeenCalledTimes(1);
    expect(mockProgressRefetch).toHaveBeenCalledTimes(1);
  });

  it('shows an overall budget instead of the empty state when overallItem exists', () => {
    const overallBudget = makeOverallBudget();
    const overallItem = makeOverallProgressItem();

    mockUseBudgets.mockReturnValue({
      activeBudgets: [overallBudget],
      isLoading: false,
      error: null,
      refetch: mockBudgetRefetch,
    });

    mockUseBudgetProgress.mockReturnValue({
      items: [],
      overallItem,
      isLoading: false,
      error: null,
      refetch: mockProgressRefetch,
      totalBudget: 0,
      totalSpent: 0,
    });

    const screen = renderScreen();

    expect(screen.queryByText('No budgets yet')).toBeNull();
    expect(screen.getByText('Overall')).toBeTruthy();
    expect(screen.getByText('1 active budget')).toBeTruthy();
  });
});
