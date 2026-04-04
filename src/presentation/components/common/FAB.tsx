import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text, type ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';

const SIZE = 56;
const PRESS_TIMING_MS = 110;
const SCALE_PRESSED = 0.9;
const ON_PRIMARY = '#FFFFFF';

export type FABProps = {
  onPress: () => void;
  icon?: React.ReactNode;
  label?: string;
  style?: ViewStyle;
  testID?: string;
};

export function FAB({onPress, icon, label, style, testID}: FABProps) {
  const {colors, shadows, typography} = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(SCALE_PRESSED, {duration: PRESS_TIMING_MS});
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, {duration: PRESS_TIMING_MS});
  }, [scale]);

  const extended = Boolean(label);
  const a11yLabel = label ?? 'Add';

  return (
    <Animated.View
      style={[
        styles.anchor,
        shadows.lg,
        extended ? styles.extended : styles.circle,
        {
          backgroundColor: colors.primary,
          minHeight: SIZE,
        },
        style,
      ]}
      testID={testID ? `${testID}-wrapper` : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="Double tap to activate"
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={4}
        style={({pressed}) => [
          styles.pressable,
          extended ? styles.pressableExtended : styles.pressableCircle,
          {opacity: pressed ? 0.92 : 1},
        ]}
        testID={testID}>
        <Animated.View style={[styles.inner, animatedStyle]}>
          {icon ?? (
            <Text style={[styles.plus, {color: ON_PRIMARY}]} accessibilityElementsHidden>
              +
            </Text>
          )}
          {label ? (
            <Text
              style={[typography.callout, styles.label, {color: ON_PRIMARY}]}
              numberOfLines={1}>
              {label}
            </Text>
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 20,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  extended: {
    borderRadius: SIZE / 2,
    paddingHorizontal: 4,
    alignSelf: 'flex-end',
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressableCircle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  pressableExtended: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 20,
    minHeight: SIZE,
    gap: 10,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
  },
});
