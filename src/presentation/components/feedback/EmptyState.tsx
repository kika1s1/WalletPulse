import React from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import Animated, {FadeIn, FadeInUp} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';
import {AppIcon} from '@presentation/components/common/AppIcon';

type Props = {
  title: string;
  message: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({title, message, icon, actionLabel, onAction}: Props) {
  const {colors, spacing, radius} = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <Animated.View entering={FadeInUp.delay(50).duration(350)}>
        <View style={[styles.iconWrap, {backgroundColor: colors.primary + '0C', borderRadius: radius.full}]}>
          <AppIcon name={icon ?? 'inbox-outline'} size={40} color={colors.primary + '80'} />
        </View>
      </Animated.View>
      <Text style={[styles.title, {color: colors.text}]}>{title}</Text>
      <Text style={[styles.message, {color: colors.textSecondary}]}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({pressed}) => [
            styles.button,
            {
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              paddingHorizontal: spacing.xl,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={onAction}>
          <Text style={[styles.buttonText, {color: colors.onPrimary}]}>{actionLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
