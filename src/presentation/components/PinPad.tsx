import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {AppIcon} from '@presentation/components/common/AppIcon';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

type Props = {
  title: string;
  subtitle?: string;
  pin: string;
  onPinChange: (pin: string) => void;
  error?: string | null;
  shake?: boolean;
};

export function PinPad({title, subtitle, pin, onPinChange, error}: Props) {
  const {colors, radius, spacing} = useTheme();
  const shakeX = useSharedValue(0);

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(12, {duration: 50}),
      withTiming(-12, {duration: 50}),
      withTiming(8, {duration: 50}),
      withTiming(-8, {duration: 50}),
      withTiming(0, {duration: 50}),
    );
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
      if (key === '') return;
      if (pin.length >= PIN_LENGTH) return;
      onPinChange(pin + key);
    },
    [onPinChange, pin],
  );

  React.useEffect(() => {
    if (error) triggerShake();
  }, [error, triggerShake]);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.topSection}>
        <AppIcon name="lock-outline" size={40} color={colors.primary} />
        <Text style={[styles.title, {color: colors.text}]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, {color: colors.textSecondary}]}>{subtitle}</Text>
        ) : null}

        <Animated.View style={[styles.dotsRow, dotsAnimStyle]}>
          {Array.from({length: PIN_LENGTH}).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < pin.length ? colors.primary : 'transparent',
                  borderColor: i < pin.length ? colors.primary : colors.border,
                  borderRadius: 999,
                },
              ]}
            />
          ))}
        </Animated.View>

        {error ? (
          <Text style={[styles.errorText, {color: colors.danger}]}>{error}</Text>
        ) : (
          <View style={styles.errorPlaceholder} />
        )}
      </View>

      <View style={styles.keypad}>
        {KEYS.map((key, idx) => {
          if (key === '') {
            return <View key={idx} style={styles.keyCell} />;
          }
          const isDel = key === 'del';
          return (
            <Pressable
              key={idx}
              accessibilityLabel={isDel ? 'Delete' : key}
              accessibilityRole="button"
              onPress={() => handleKey(key)}
              style={({pressed}) => [
                styles.keyCell,
                styles.keyBtn,
                {
                  backgroundColor: pressed
                    ? colors.primaryLight + '30'
                    : colors.surfaceElevated,
                  borderRadius: radius.lg,
                },
              ]}>
              {isDel ? (
                <AppIcon name="backspace-outline" size={24} color={colors.textSecondary} />
              ) : (
                <Text style={[styles.keyText, {color: colors.text}]}>{key}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  dot: {
    width: 16,
    height: 16,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
    marginTop: 12,
    textAlign: 'center',
  },
  errorPlaceholder: {
    height: 20,
    marginTop: 12,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    maxWidth: 300,
    alignSelf: 'center',
  },
  keyCell: {
    width: 80,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBtn: {
    borderWidth: 0,
  },
  keyText: {
    fontSize: 28,
    fontWeight: fontWeight.semibold,
  },
});
