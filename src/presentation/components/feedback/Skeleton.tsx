import React, {useEffect} from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';

type Props = {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({width, height, borderRadius = 8, style}: Props) {
  const {colors} = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, {duration: 1200}), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.4, 1]),
  }));

  return (
    <View style={[{width: width as number, height, borderRadius}, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {backgroundColor: colors.skeleton, borderRadius},
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shimmer: {
    flex: 1,
  },
});
