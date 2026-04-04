import React, {useCallback} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback, {HapticFeedbackTypes} from 'react-native-haptic-feedback';
import {useTheme} from '@shared/theme';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  testID?: string;
};

const PRESS_SCALE = 0.97;
const PRESS_TIMING_MS = 140;

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  testID,
}: ButtonProps) {
  const {colors, radius} = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const triggerHaptic = useCallback(() => {
    ReactNativeHapticFeedback.trigger(HapticFeedbackTypes.impactLight, {
      enableVibrateFallback: true,
    });
  }, []);

  const handlePressIn = useCallback(() => {
    if (disabled || loading) {
      return;
    }
    scale.value = withTiming(PRESS_SCALE, {duration: PRESS_TIMING_MS});
    triggerHaptic();
  }, [disabled, loading, scale, triggerHaptic]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, {duration: PRESS_TIMING_MS});
  }, [scale]);

  const isBusy = disabled || loading;

  const sizeTokens =
    size === 'sm'
      ? {height: 36, fontSize: 13, padH: 12, borderR: radius.sm, indicator: 'small' as const}
      : size === 'lg'
        ? {height: 52, fontSize: 17, padH: 24, borderR: radius.lg, indicator: 'small' as const}
        : {height: 44, fontSize: 15, padH: 16, borderR: radius.md, indicator: 'small' as const};

  const touchSlop =
    size === 'sm'
      ? {top: 4, bottom: 4, left: 4, right: 4}
      : {top: 0, bottom: 0, left: 0, right: 0};

  const labelColor =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'secondary'
        ? colors.text
        : colors.primary;

  const spinnerColor = variant === 'primary' ? '#FFFFFF' : colors.primary;

  const variantBackground = (pressed: boolean) => {
    switch (variant) {
      case 'primary':
        return pressed ? colors.primaryDark : colors.primary;
      case 'secondary':
        return pressed ? colors.borderLight : colors.surfaceElevated;
      case 'outline':
      case 'ghost':
        return pressed ? `${colors.primary}1F` : 'transparent';
      default:
        return colors.primary;
    }
  };

  const variantBorder = () => {
    if (variant === 'outline') {
      return {borderWidth: 1, borderColor: colors.primary};
    }
    return {borderWidth: 0, borderColor: 'transparent'};
  };

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{disabled: isBusy, busy: loading}}
        disabled={isBusy}
        hitSlop={touchSlop}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({pressed}) => [
          styles.pressable,
          fullWidth && styles.fullWidth,
          {
            height: sizeTokens.height,
            minWidth: 44,
            paddingHorizontal: sizeTokens.padH,
            borderRadius: sizeTokens.borderR,
            backgroundColor: variantBackground(pressed),
            opacity: isBusy ? 0.5 : 1,
          },
          variantBorder(),
        ]}
        testID={testID}>
        <View style={styles.contentRow}>
          {loading ? (
            <ActivityIndicator color={spinnerColor} size={sizeTokens.indicator} />
          ) : (
            <>
              {icon && iconPosition === 'left' ? <View style={styles.iconWrap}>{icon}</View> : null}
              <Text
                style={[
                  styles.label,
                  {
                    color: labelColor,
                    fontSize: sizeTokens.fontSize,
                  },
                ]}
                numberOfLines={1}>
                {title}
              </Text>
              {icon && iconPosition === 'right' ? <View style={styles.iconWrap}>{icon}</View> : null}
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
