import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';

import WalletsScreen from '@presentation/screens/WalletsScreen';
import {ThemeProvider} from '@shared/theme';

const mockNavigate = jest.fn();
const mockRefetch = jest.fn();

type MockWallet = {
  id: string;
  name: string;
  balance: number;
  currency: string;
  icon: string;
  color: string;
  isActive: boolean;
};

const mockUseWallets = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: {trigger: jest.fn()},
  HapticFeedbackTypes: {impactLight: 'impactLight'},
}));

jest.mock('react-native-reanimated', () => {
  const RealRN = jest.requireActual('react-native');
  const animation = {
    duration: () => animation,
    delay: () => animation,
    springify: () => animation,
    damping: () => animation,
    mass: () => animation,
    stiffness: () => animation,
    overshootClamping: () => animation,
    restDisplacementThreshold: () => animation,
    restSpeedThreshold: () => animation,
    easing: () => animation,
    withInitialValues: () => animation,
    build: () => undefined,
  };
  const entry = new Proxy(animation, {
    get: (target, prop) => {
      if (prop in target) {
        return (target as Record<string | symbol, unknown>)[prop];
      }
      return () => animation;
    },
  });
  return {
    __esModule: true,
    default: {
      View: RealRN.View,
      Text: RealRN.Text,
      ScrollView: RealRN.ScrollView,
      createAnimatedComponent: (c: unknown) => c,
    },
    useAnimatedStyle: () => ({}),
    useSharedValue: (v: unknown) => ({value: v}),
    useAnimatedScrollHandler: () => () => undefined,
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
    withDelay: (_d: unknown, v: unknown) => v,
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withRepeat: (v: unknown) => v,
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    Easing: {
      bezier: () => () => 0,
      inOut: () => () => 0,
      in: () => () => 0,
      out: () => () => 0,
      linear: () => 0,
    },
    FadeIn: entry,
    FadeInUp: entry,
    FadeInDown: entry,
    FadeOut: entry,
    SlideInDown: entry,
    SlideInUp: entry,
    SlideOutDown: entry,
    SlideOutUp: entry,
    ZoomIn: entry,
    ZoomOut: entry,
    Layout: entry,
  };
});

jest.mock('@presentation/hooks/useWallets', () => ({
  useWallets: () => mockUseWallets(),
}));

jest.mock('@presentation/stores/useSettingsStore', () => ({
  useSettingsStore: (
    selector: (state: {hideAmounts: boolean}) => boolean,
  ) => selector({hideAmounts: false}),
}));

jest.mock('@presentation/stores/useAppStore', () => ({
  useAppStore: (selector: (state: {baseCurrency: string}) => string) =>
    selector({baseCurrency: 'USD'}),
}));

jest.mock('@presentation/components/common/AppIcon', () => {
  const {Text: MockText} = require('react-native');
  return {AppIcon: ({name}: {name: string}) => <MockText>{name}</MockText>};
});

jest.mock('@presentation/components/WalletCard', () => {
  const {Pressable, Text: MockText} = require('react-native');
  return {
    WalletCard: ({
      id,
      name,
      currency,
      onPress,
    }: {
      id: string;
      name: string;
      currency: string;
      onPress?: (id: string) => void;
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open wallet ${name}`}
        onPress={() => onPress?.(id)}>
        <MockText>{name}</MockText>
        <MockText>{currency}</MockText>
      </Pressable>
    ),
  };
});

function makeWallet(overrides: Partial<MockWallet> = {}): MockWallet {
  return {
    id: overrides.id ?? 'w-1',
    name: overrides.name ?? 'Main',
    balance: overrides.balance ?? 1000,
    currency: overrides.currency ?? 'USD',
    icon: overrides.icon ?? 'wallet',
    color: overrides.color ?? '#6C5CE7',
    isActive: overrides.isActive ?? true,
  };
}

function renderScreen() {
  return render(
    <ThemeProvider>
      <WalletsScreen />
    </ThemeProvider>,
  );
}

describe('WalletsScreen search', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockRefetch.mockReset();
    mockUseWallets.mockReturnValue({
      wallets: [
        makeWallet({id: 'w-1', name: 'Main', currency: 'USD'}),
        makeWallet({id: 'w-2', name: 'Savings', currency: 'EUR'}),
        makeWallet({id: 'w-3', name: 'Travel', currency: 'GBP'}),
      ],
      isLoading: false,
      refetch: mockRefetch,
    });
  });

  it('renders all wallets when no query is entered', () => {
    const screen = renderScreen();
    expect(screen.getByText('Main')).toBeTruthy();
    expect(screen.getByText('Savings')).toBeTruthy();
    expect(screen.getByText('Travel')).toBeTruthy();
  });

  it('filters wallets by name as the user types', () => {
    const screen = renderScreen();
    const input = screen.getByPlaceholderText('Search wallets');
    act(() => {
      fireEvent.changeText(input, 'sav');
    });
    expect(screen.queryByText('Main')).toBeNull();
    expect(screen.getByText('Savings')).toBeTruthy();
    expect(screen.queryByText('Travel')).toBeNull();
  });

  it('also matches by currency code', () => {
    const screen = renderScreen();
    const input = screen.getByPlaceholderText('Search wallets');
    act(() => {
      fireEvent.changeText(input, 'gbp');
    });
    expect(screen.queryByText('Main')).toBeNull();
    expect(screen.queryByText('Savings')).toBeNull();
    expect(screen.getByText('Travel')).toBeTruthy();
  });

  it('shows an empty state when nothing matches the query', () => {
    const screen = renderScreen();
    const input = screen.getByPlaceholderText('Search wallets');
    act(() => {
      fireEvent.changeText(input, 'zzzzz');
    });
    expect(screen.getByText(/No wallets match/i)).toBeTruthy();
  });
});
