import React, {useCallback, useMemo} from 'react';
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
        styles.dot,
        animatedStyle,
        {
          backgroundColor: filled ? colors.primary : 'transparent',
          borderColor: filled ? colors.primary : colors.border,
        },
      ]}
    />
  );
}

function PinKey({
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

  if (keyValue === '') {
    return <View style={styles.keyCell} />;
  }

  const isDel = keyValue === 'del';

  return (
    <Animated.View style={[styles.keyCell, animatedStyle]}>
      <Pressable
        accessibilityLabel={isDel ? 'Delete' : keyValue}
        accessibilityRole="button"
        onPress={() => onPress(keyValue)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({pressed}) => [
          styles.keyBtn,
          isDel ? {} : shadows.sm,
          {
            backgroundColor: pressed
              ? colors.primaryLight + '30'
              : isDel
                ? 'transparent'
                : colors.surfaceElevated,
            borderRadius: KEY_SIZE / 2,
          },
        ]}>
        {isDel ? (
          <AppIcon name="backspace-outline" size={26} color={colors.text} />
        ) : (
          <Text style={[styles.keyText, {color: colors.text}]}>{keyValue}</Text>
        )}
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
          paddingTop: insets.top + 40,
          paddingBottom: Math.max(insets.bottom, 24),
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
            <PinKey key={idx} keyValue={key} onPress={handleKey} />
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
    gap: 8,
  },
  title: {
    fontSize: 28,
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
    gap: 20,
    marginTop: 28,
  },
  dot: {
    width: 18,
    height: 18,
    borderWidth: 2,
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
