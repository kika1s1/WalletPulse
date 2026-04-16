import React from 'react';

// Stub the PinPad with a minimal version so we don't need to initialize
// Reanimated/Worklets/LinearGradient/etc. in the jest environment. The
// stub exposes one Pressable per digit and a delete button, matching the
// real component's accessibility contract.
jest.mock('@presentation/components/PinPad', () => {
  const RN = require('react-native');
  const {Text, View, Pressable} = RN;
  return {
    PinPad: (props: {
      title: string;
      subtitle?: string;
      pin: string;
      onPinChange: (pin: string) => void;
      error?: string | null;
      length?: 4 | 6;
      footerSlot?: React.ReactNode;
    }) => {
      const length = props.length ?? 4;
      const press = (digit: string) => {
        if (digit === 'del') {
          props.onPinChange(props.pin.slice(0, -1));
          return;
        }
        if (props.pin.length >= length) {
          return;
        }
        props.onPinChange(props.pin + digit);
      };
      return (
        <View>
          <Text>{props.title}</Text>
          {props.subtitle ? <Text>{props.subtitle}</Text> : null}
          <Text testID="pin-display">{props.pin}</Text>
          {props.error ? <Text>{props.error}</Text> : null}
          {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={d}
              key={d}
              onPress={() => press(d)}>
              <Text>{d}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete"
            onPress={() => press('del')}>
            <Text>del</Text>
          </Pressable>
          {props.footerSlot}
        </View>
      );
    },
  };
});

jest.mock('@presentation/components/common', () => {
  const RN = require('react-native');
  const {Pressable, Text} = RN;
  return {
    BackButton: () => (
      <Pressable accessibilityLabel="Back">
        <Text>Back</Text>
      </Pressable>
    ),
  };
});

import {act, fireEvent, render, waitFor} from '@testing-library/react-native';

import SetPinScreen from '@presentation/screens/SetPinScreen';
import {usePinStore, IMMEDIATE_LOCK_MS} from '@presentation/stores/usePinStore';
import * as Keychain from 'react-native-keychain';
import {ThemeProvider} from '@shared/theme';

jest.mock('@infrastructure/native/SecurityBridge', () => ({
  setScreenshotProtection: jest.fn(),
  isScreenshotProtectionAvailable: jest.fn(() => true),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
}));

const keychainMock = Keychain as unknown as {
  __resetStore: () => void;
};

function resetPinStore() {
  usePinStore.setState({
    isHydrated: true,
    isPinEnabled: false,
    isLocked: false,
    biometricEnabled: false,
    autoLockTimeoutMs: IMMEDIATE_LOCK_MS,
    lastActiveAt: 0,
    screenshotProtectionEnabled: false,
  });
}

async function pressKey(screen: ReturnType<typeof render>, label: string) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label));
  });
}

describe('SetPinScreen setup-then-confirm flow', () => {
  beforeEach(() => {
    keychainMock.__resetStore();
    resetPinStore();
    mockGoBack.mockClear();
  });

  it('saves the PIN and navigates back when confirm matches first entry (4 digits)', async () => {
    const screen = render(
      <ThemeProvider>
        <SetPinScreen />
      </ThemeProvider>,
    );

    // Initial step: Set Your PIN
    expect(screen.getByText(/Set Your PIN/i)).toBeTruthy();

    for (const d of '1234') {
      await pressKey(screen, d);
    }

    // After 4 digits, should move to Confirm step
    await waitFor(() => expect(screen.getByText(/Confirm Your PIN/i)).toBeTruthy());

    for (const d of '1234') {
      await pressKey(screen, d);
    }

    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(usePinStore.getState().isPinEnabled).toBe(true);
  });

  it('shows a PINs-do-not-match error when confirm differs from first entry', async () => {
    const screen = render(
      <ThemeProvider>
        <SetPinScreen />
      </ThemeProvider>,
    );

    for (const d of '1234') {
      await pressKey(screen, d);
    }
    await waitFor(() => expect(screen.getByText(/Confirm Your PIN/i)).toBeTruthy());

    for (const d of '9999') {
      await pressKey(screen, d);
    }

    await waitFor(() =>
      expect(screen.getByText(/PINs do not match/i)).toBeTruthy(),
    );
    // Should go back to the enter step, without saving.
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(usePinStore.getState().isPinEnabled).toBe(false);
  });
});
