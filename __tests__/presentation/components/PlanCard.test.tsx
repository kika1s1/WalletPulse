import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {PlanCard} from '@presentation/components/common/PlanCard';

jest.mock('@shared/theme', () => {
  const actual = jest.requireActual('@shared/theme');
  return {
    ...actual,
    useTheme: () => ({
      colors: actual.colors.light,
      typography: actual.typography,
      spacing: actual.spacing,
      radius: {xs: 6, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, full: 9999},
      shadows: {md: {}},
      isDark: false,
    }),
  };
});

jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  const mockAnimated = {
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    FlatList: RN.FlatList,
    createAnimatedComponent: (component: any) => component,
  };
  return {
    __esModule: true,
    default: mockAnimated,
    useSharedValue: jest.fn((init: any) => ({value: init})),
    useAnimatedStyle: jest.fn((fn: any) => fn()),
    withTiming: jest.fn((val: any) => val),
    withSpring: jest.fn((val: any) => val),
    ...mockAnimated,
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const RN = jest.requireActual('react-native');
  const MockReact = jest.requireActual('react');
  return (props: any) =>
    MockReact.createElement(RN.Text, {testID: props.testID}, props.name);
});

describe('PlanCard', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tier name and price', () => {
    render(
      <PlanCard
        tierLabel="Monthly"
        price="$4.99"
        periodLabel="/ month"
        features={['Feature A', 'Feature B']}
        onSelect={mockOnSelect}
      />,
    );

    expect(screen.getByText('Monthly')).toBeTruthy();
    expect(screen.getByText('$4.99')).toBeTruthy();
    expect(screen.getByText('/ month')).toBeTruthy();
  });

  it('renders features list', () => {
    render(
      <PlanCard
        tierLabel="Pro"
        price="$29.99"
        periodLabel="/ year"
        features={['Unlimited wallets', 'Advanced analytics']}
        onSelect={mockOnSelect}
      />,
    );

    expect(screen.getByText('Unlimited wallets')).toBeTruthy();
    expect(screen.getByText('Advanced analytics')).toBeTruthy();
  });

  it('shows RECOMMENDED badge when isRecommended', () => {
    render(
      <PlanCard
        tierLabel="Yearly"
        price="$29.99"
        periodLabel="/ year"
        features={['All Pro features']}
        isRecommended
        onSelect={mockOnSelect}
      />,
    );

    expect(screen.getByText('RECOMMENDED')).toBeTruthy();
  });

  it('shows Current Plan label when isCurrentPlan', () => {
    render(
      <PlanCard
        tierLabel="Monthly"
        price="$4.99"
        periodLabel="/ month"
        features={['All Pro features']}
        isCurrentPlan
        onSelect={mockOnSelect}
      />,
    );

    expect(screen.getByText('Current Plan')).toBeTruthy();
  });

  it('calls onSelect when pressed', () => {
    render(
      <PlanCard
        tierLabel="Yearly"
        price="$29.99"
        periodLabel="/ year"
        features={['Best value']}
        onSelect={mockOnSelect}
        testID="plan-card-yearly"
      />,
    );

    fireEvent.press(screen.getByTestId('plan-card-yearly'));
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it('shows savings label when provided', () => {
    render(
      <PlanCard
        tierLabel="Yearly"
        price="$29.99"
        periodLabel="/ year"
        features={['All Pro features']}
        onSelect={mockOnSelect}
        savingsLabel="Save 33%"
      />,
    );

    expect(screen.getByText('Save 33%')).toBeTruthy();
  });

  it('does not call onSelect when disabled', () => {
    render(
      <PlanCard
        tierLabel="Monthly"
        price="$4.99"
        periodLabel="/ month"
        features={['Feature']}
        onSelect={mockOnSelect}
        disabled
        testID="plan-card-monthly"
      />,
    );

    fireEvent.press(screen.getByTestId('plan-card-monthly'));
    expect(mockOnSelect).not.toHaveBeenCalled();
  });
});
