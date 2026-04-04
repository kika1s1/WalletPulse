import React, {useEffect} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';

const TRACK_W = 50;
const TRACK_H = 28;
const THUMB_SIZE = 24;
const THUMB_INSET = (TRACK_H - THUMB_SIZE) / 2;
const THUMB_TRAVEL = TRACK_W - THUMB_SIZE - THUMB_INSET * 2;
const TIMING_MS = 220;

export type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  testID?: string;
};

const THUMB_WHITE = '#FFFFFF';

export function Toggle({
  value,
  onValueChange,
  label,
  disabled = false,
  testID,
}: ToggleProps) {
  const {colors, typography} = useTheme();
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(value ? 1 : 0, {duration: TIMING_MS});
  }, [value, on]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [colors.border, colors.primary]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{translateX: on.value * THUMB_TRAVEL}],
  }));

  const handlePress = () => {
    if (disabled) {
      return;
    }
    onValueChange(!value);
  };

  const a11yLabel = label ? `${label}. ${value ? 'On' : 'Off'}` : `Toggle. ${value ? 'On' : 'Off'}`;

  return (
    <View
      style={[styles.row, disabled && styles.disabled]}
      testID={testID ? `${testID}-container` : undefined}>
      {label ? (
        <Text
          style={[typography.body, styles.label, {color: colors.text}]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={a11yLabel}
        accessibilityHint={disabled ? undefined : 'Double tap to change'}
        accessibilityState={{checked: value, disabled}}
        disabled={disabled}
        hitSlop={8}
        onPress={handlePress}
        testID={testID}>
        <Animated.View style={[styles.track, trackStyle]}>
          <Animated.View
            style={[
              styles.thumb,
              {
                top: THUMB_INSET,
                left: THUMB_INSET,
                backgroundColor: THUMB_WHITE,
                shadowColor: '#000000',
              },
              thumbStyle,
            ]}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 44,
  },
  label: {
    flex: 1,
    marginRight: 12,
  },
  disabled: {
    opacity: 0.45,
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: 14,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.5,
    elevation: 3,
  },
});
