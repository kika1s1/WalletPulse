import React, {useEffect, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';

const DEFAULT_DURATION_MS = 3000;

export type ToastProps = {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  duration?: number;
};

export function Toast({
  visible,
  message,
  type = 'info',
  actionLabel,
  onAction,
  onDismiss,
  duration = DEFAULT_DURATION_MS,
}: ToastProps) {
  const {colors, radius, isDark} = useTheme();
  const translateY = useSharedValue(140);
  const opacity = useSharedValue(0);

  const accent = useMemo(() => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.danger;
      case 'warning':
        return colors.warning;
      default:
        return colors.primary;
    }
  }, [colors.danger, colors.primary, colors.success, colors.warning, type]);

  const surfaceBg = isDark ? colors.surfaceElevated : '#1A1D1F';

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {duration: 260});
      opacity.value = withTiming(1, {duration: 220});
      const timer = setTimeout(() => {
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
    translateY.value = withTiming(120, {duration: 220});
    opacity.value = withTiming(0, {duration: 180});
  }, [duration, message, onDismiss, opacity, translateY, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{translateY: translateY.value}],
  }));

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: surfaceBg,
            borderRadius: radius.lg,
          },
          animatedStyle,
        ]}>
        <Text style={styles.message}>{message}</Text>
        {actionLabel ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={onAction}
            style={styles.actionHit}>
            <Text style={[styles.action, {color: accent}]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: 'center',
    bottom: 80,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 50,
  },
  pill: {
    alignItems: 'center',
    flexDirection: 'row',
    maxWidth: '92%',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  message: {
    color: '#FFFFFF',
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  actionHit: {
    marginLeft: 12,
  },
  action: {
    fontSize: 14,
    fontWeight: '700',
  },
});
