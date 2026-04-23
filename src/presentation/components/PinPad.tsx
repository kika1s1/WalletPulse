import React, {useCallback, useMemo, useRef} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {WalletPulseLogoMark} from '@presentation/components/WalletPulseLogo';

const DEFAULT_PIN_LENGTH = 4;
const KEYS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '',
  '0',
  'del',
] as const;
const KEY_SIZE = 76;

type Props = {
  title: string;
  subtitle?: string;
  pin: string;
  onPinChange: (pin: string) => void;
  error?: string | null;
  length?: 4 | 6;
  footerSlot?: React.ReactNode;
  /**
   * Optional node rendered in place of the empty bottom-left keypad cell
   * (row 4, column 1). Use this for a biometric unlock action so it lives
   * inside the keypad — matching the native Android / iOS lock-screen
   * pattern — instead of floating below the keypad where it can be clipped
   * by the gesture bar.
   */
  biometricSlot?: React.ReactNode;
};

function PinDot({filled}: {filled: boolean}) {
  const {colors} = useTheme();
  const scale = useSharedValue(filled ? 1 : 0.6);

  React.useEffect(() => {
    scale.value = withSpring(filled ? 1 : 0.6, {damping: 12, stiffness: 200});
  }, [filled, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return (
    <Animated.View
      style={[
        filled ? styles.dotFilled : styles.dotEmpty,
        animatedStyle,
        {
          backgroundColor: filled ? colors.primary : colors.textMuted + '55',
        },
      ]}
    />
  );
}

function PinKey({
  keyValue,
  onPress,
  onClear,
  canDelete,
  biometricSlot,
}: {
  keyValue: string;
  onPress: (key: string) => void;
  onClear: () => void;
  canDelete: boolean;
  biometricSlot?: React.ReactNode;
}) {
  if (keyValue === '') {
    return (
      <View style={styles.keyCell}>
        {biometricSlot ?? null}
      </View>
    );
  }

  if (keyValue === 'del') {
    return (
      <DeleteKey
        canDelete={canDelete}
        onClear={onClear}
        onPress={() => onPress('del')}
      />
    );
  }

  return <NumberKey keyValue={keyValue} onPress={onPress} />;
}

function NumberKey({
  keyValue,
  onPress,
}: {
  keyValue: string;
  onPress: (key: string) => void;
}) {
  const {colors, shadows} = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, {damping: 15, stiffness: 300});
    ReactNativeHapticFeedback.trigger(HapticFeedbackTypes.impactLight, {
      enableVibrateFallback: true,
    });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {damping: 15, stiffness: 300});
  }, [scale]);

  return (
    <Animated.View style={[styles.keyCell, animatedStyle]}>
      <Pressable
        accessibilityLabel={keyValue}
        accessibilityRole="button"
        onPress={() => onPress(keyValue)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({pressed}) => [
          styles.keyBtn,
          shadows.sm,
          {
            backgroundColor: pressed
              ? colors.primaryLight + '30'
              : colors.surfaceElevated,
            borderRadius: KEY_SIZE / 2,
          },
        ]}>
        <Text style={[styles.keyText, {color: colors.text}]}>{keyValue}</Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Secondary-weight delete key. Keeps the same solid-circle shape language
 * as the number keys so the keypad reads as a unified grid, but differs
 * subtly:
 *   - Disabled state: transparent surface (not a hollow ring) — so an
 *     empty PIN doesn't produce an "unrendered" looking key.
 *   - Enabled state: `borderLight` soft fill + no shadow — the key is
 *     present on the grid but clearly subordinate to the shadowed digits.
 *   - Pressed state tints toward `danger` — subconscious "this removes
 *     something" cue that number keys don't get.
 *   - Long-press clears the entire PIN (with `notificationWarning` haptic).
 */
function DeleteKey({
  canDelete,
  onPress,
  onClear,
}: {
  canDelete: boolean;
  onPress: () => void;
  onClear: () => void;
}) {
  const {colors} = useTheme();
  const scale = useSharedValue(1);
  const didLongPressRef = useRef(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = useCallback(() => {
    if (!canDelete) {
      return;
    }
    scale.value = withSpring(0.9, {damping: 15, stiffness: 300});
    ReactNativeHapticFeedback.trigger(HapticFeedbackTypes.impactMedium, {
      enableVibrateFallback: true,
    });
  }, [canDelete, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {damping: 15, stiffness: 300});
  }, [scale]);

  const handlePress = useCallback(() => {
    // Swallow the tap that follows a long-press so we don't delete an
    // extra character after clearing.
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }
    if (!canDelete) {
      return;
    }
    onPress();
  }, [canDelete, onPress]);

  const handleLongPress = useCallback(() => {
    if (!canDelete) {
      return;
    }
    didLongPressRef.current = true;
    ReactNativeHapticFeedback.trigger(HapticFeedbackTypes.notificationWarning, {
      enableVibrateFallback: true,
    });
    onClear();
  }, [canDelete, onClear]);

  const iconColor = canDelete ? colors.textSecondary : colors.textMuted;

  return (
    <Animated.View style={[styles.keyCell, animatedStyle]}>
      <Pressable
        accessibilityHint={
          canDelete
            ? 'Double tap to remove the last digit. Long press to clear all.'
            : 'No digits to delete'
        }
        accessibilityLabel="Delete last digit"
        accessibilityRole="button"
        accessibilityState={{disabled: !canDelete}}
        android_ripple={{
          borderless: true,
          color: colors.dangerLight,
          radius: KEY_SIZE / 2,
        }}
        delayLongPress={450}
        disabled={!canDelete}
        onLongPress={handleLongPress}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({pressed}) => [
          styles.keyBtn,
          {
            backgroundColor: !canDelete
              ? 'transparent'
              : pressed
                ? colors.dangerLight
                : colors.borderLight,
            borderRadius: KEY_SIZE / 2,
          },
        ]}>
        <AppIcon color={iconColor} name="backspace-outline" size={26} />
      </Pressable>
    </Animated.View>
  );
}

export function PinPad({
  title,
  subtitle,
  pin,
  onPinChange,
  error,
  length = DEFAULT_PIN_LENGTH,
  footerSlot,
  biometricSlot,
}: Props) {
  const {colors, spacing} = useTheme();
  const insets = useSafeAreaInsets();
  const shakeX = useSharedValue(0);

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(12, {duration: 50}),
      withTiming(-12, {duration: 50}),
      withTiming(8, {duration: 50}),
      withTiming(-8, {duration: 50}),
      withTiming(0, {duration: 50}),
    );
    ReactNativeHapticFeedback.trigger(HapticFeedbackTypes.notificationError, {
      enableVibrateFallback: true,
    });
  }, [shakeX]);

  const dotsAnimStyle = useAnimatedStyle(() => ({
    transform: [{translateX: shakeX.value}],
  }));

  const handleKey = useCallback(
    (key: string) => {
      if (key === 'del') {
        onPinChange(pin.slice(0, -1));
        return;
      }
      if (key === '') {
        return;
      }
      if (pin.length >= length) {
        return;
      }
      onPinChange(pin + key);
    },
    [onPinChange, pin, length],
  );

  const handleClear = useCallback(() => {
    onPinChange('');
  }, [onPinChange]);

  React.useEffect(() => {
    if (error) {
      triggerShake();
    }
  }, [error, triggerShake]);

  const gradientColors = useMemo(
    () => [colors.primary + '0F', colors.background, colors.background],
    [colors],
  );

  return (
    <LinearGradient
      colors={gradientColors}
      style={[
        styles.container,
        {
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom + 16, 32),
        },
      ]}>
      <View style={styles.topSection}>
        <WalletPulseLogoMark size={56} />
        <View style={{height: spacing.sm}} />
        <Text style={[styles.title, {color: colors.text}]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
            {subtitle}
          </Text>
        ) : null}

        <Animated.View style={[styles.dotsRow, dotsAnimStyle]}>
          {Array.from({length}).map((_, i) => (
            <PinDot key={i} filled={i < pin.length} />
          ))}
        </Animated.View>

        {error ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[styles.errorPill, {backgroundColor: colors.dangerLight}]}>
            <Text style={[styles.errorText, {color: colors.danger}]}>
              {error}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.errorPlaceholder} />
        )}
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.keypad}>
          {KEYS.map((key, idx) => (
            <PinKey
              key={idx}
              biometricSlot={key === '' ? biometricSlot : undefined}
              canDelete={pin.length > 0}
              keyValue={key}
              onClear={handleClear}
              onPress={handleKey}
            />
          ))}
        </View>

        {footerSlot}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: fontWeight.bold,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  dotFilled: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  dotEmpty: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  errorPill: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  errorText: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  errorPlaceholder: {
    height: 36,
    marginTop: 16,
  },
  bottomSection: {
    alignItems: 'center',
    gap: 16,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    maxWidth: KEY_SIZE * 3 + 14 * 2,
    alignSelf: 'center',
  },
  keyCell: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBtn: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 24,
    fontWeight: fontWeight.semibold,
  },
});
