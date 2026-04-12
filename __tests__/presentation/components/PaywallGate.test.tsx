import React from 'react';
import {Text, View} from 'react-native';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {PaywallGate} from '@presentation/components/common/PaywallGate';

const mockCanAccess = jest.fn().mockReturnValue(false);
const mockPresentPaywall = jest.fn();

jest.mock('@presentation/hooks/useFeatureGate', () => ({
  useFeatureGate: () => ({
    available: mockCanAccess(),
    tier: 'free',
    showPaywall: mockPresentPaywall,
  }),
}));

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
    FadeInUp: {duration: () => ({springify: () => undefined})},
    ...mockAnimated,
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const RN = jest.requireActual('react-native');
  const MockReact = jest.requireActual('react');
  return (props: any) =>
    MockReact.createElement(RN.Text, {testID: props.testID}, props.name);
});

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {impactLight: 'impactLight'},
}));

describe('PaywallGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when feature is available', () => {
    mockCanAccess.mockReturnValue(true);

    render(
      <PaywallGate feature="export">
        <Text>Premium Content</Text>
      </PaywallGate>,
    );

    expect(screen.getByText('Premium Content')).toBeTruthy();
  });

  it('renders default locked fallback when feature is not available', () => {
    mockCanAccess.mockReturnValue(false);

    render(
      <PaywallGate feature="export">
        <Text>Premium Content</Text>
      </PaywallGate>,
    );

    expect(screen.queryByText('Premium Content')).toBeNull();
    expect(screen.getByText(/Upgrade to Pro/)).toBeTruthy();
  });

  it('renders custom fallback when feature is not available', () => {
    mockCanAccess.mockReturnValue(false);

    render(
      <PaywallGate
        feature="export"
        fallback={<Text>Custom Fallback</Text>}>
        <Text>Premium Content</Text>
      </PaywallGate>,
    );

    expect(screen.queryByText('Premium Content')).toBeNull();
    expect(screen.getByText('Custom Fallback')).toBeTruthy();
  });

  it('calls showPaywall when upgrade button is pressed', () => {
    mockCanAccess.mockReturnValue(false);

    render(
      <PaywallGate feature="export">
        <Text>Premium Content</Text>
      </PaywallGate>,
    );

    const upgradeBtn = screen.getByTestId('paywall-gate-upgrade-btn');
    fireEvent.press(upgradeBtn);
    expect(mockPresentPaywall).toHaveBeenCalledTimes(1);
  });

  it('shows feature label text when provided', () => {
    mockCanAccess.mockReturnValue(false);

    render(
      <PaywallGate feature="export" featureLabel="Data Export">
        <Text>Premium Content</Text>
      </PaywallGate>,
    );

    expect(screen.getByText('Data Export')).toBeTruthy();
  });
});
