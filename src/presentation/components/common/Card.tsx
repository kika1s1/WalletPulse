import React, {useCallback} from 'react';
import {StyleSheet, TouchableOpacity, View, type ViewStyle} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';

export type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevated?: boolean;
  testID?: string;
};

const PRESS_SCALE = 0.985;
const TIMING = {duration: 120};

export const Card = React.memo(function Card({
  children,
  onPress,
  style,
  padding = 'md',
  elevated = false,
  testID,
}: CardProps) {
  const {colors, radius, shadows, spacing} = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = useCallback(() => {
    if (!onPress) {
      return;
    }
    scale.value = withTiming(PRESS_SCALE, TIMING);
  }, [onPress, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, TIMING);
  }, [scale]);

  const paddingValue =
    padding === 'none'
      ? 0
      : padding === 'sm'
        ? spacing.sm
        : padding === 'lg'
          ? spacing.xl
          : spacing.base;

  const cardStyles = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.borderLight,
      borderRadius: radius.lg,
      padding: paddingValue,
    },
    elevated ? shadows.md : null,
    style,
  ];

  if (onPress) {
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{}}
          activeOpacity={0.7}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={cardStyles}
          testID={testID}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View accessibilityRole="none" style={cardStyles} testID={testID}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
});
