import React, {useEffect, useMemo} from 'react';
import {LayoutChangeEvent, StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';

const FILL_TIMING_MS = 380;

export type ProgressBarProps = {
  progress: number;
  color?: string;
  backgroundColor?: string;
  height?: number;
  showLabel?: boolean;
  animated?: boolean;
  testID?: string;
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) {
    return 0;
  }
  return Math.min(1, Math.max(0, n));
}

export function ProgressBar({
  progress,
  color,
  backgroundColor,
  height = 8,
  showLabel = false,
  animated = true,
  testID,
}: ProgressBarProps) {
  const {colors, typography} = useTheme();
  const trackWidth = useSharedValue(0);
  const p = useSharedValue(clamp01(progress));

  const fillColor = useMemo(() => {
    if (color) {
      return color;
    }
    const v = clamp01(progress);
    if (v >= 0.8) {
      return colors.danger;
    }
    if (v >= 0.5) {
      return colors.warning;
    }
    return colors.primary;
  }, [color, colors.danger, colors.primary, colors.warning, progress]);

  useEffect(() => {
    const next = clamp01(progress);
    if (animated) {
      p.value = withTiming(next, {duration: FILL_TIMING_MS});
    } else {
      p.value = next;
    }
  }, [animated, p, progress]);

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidth.value = e.nativeEvent.layout.width;
  };

  const fillStyle = useAnimatedStyle(() => {
    const w = trackWidth.value * p.value;
    return {width: w > 0 ? w : 0};
  });

  const pct = Math.round(clamp01(progress) * 100);
  const trackBg = backgroundColor ?? colors.borderLight;
  const cornerRadius = height / 2;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={showLabel ? `Progress, ${pct} percent` : undefined}
      accessibilityValue={{min: 0, max: 100, now: pct}}
      testID={testID}>
      {showLabel ? (
        <View style={styles.labelRow}>
          <Text style={[typography.caption, styles.labelText, {color: colors.textSecondary}]}>
            {`${pct}%`}
          </Text>
        </View>
      ) : null}
      <View
        onLayout={onLayout}
        style={[
          styles.track,
          {
            height,
            backgroundColor: trackBg,
            borderRadius: cornerRadius,
          },
        ]}>
        <Animated.View
          style={[
            styles.fill,
            {
              height,
              backgroundColor: fillColor,
              borderRadius: cornerRadius,
            },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  labelText: {
    textAlign: 'right',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
