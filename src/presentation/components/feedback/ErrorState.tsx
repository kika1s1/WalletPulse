import React from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import Animated, {FadeIn, BounceIn} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';
import {AppIcon} from '@presentation/components/common/AppIcon';

type Props = {
  message: string;
  title?: string;
  onRetry?: () => void;
};

export function ErrorState({message, title, onRetry}: Props) {
  const {colors, radius} = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <Animated.View entering={BounceIn.delay(100).duration(400)}>
        <View style={[styles.iconContainer, {backgroundColor: colors.dangerLight, borderRadius: radius.full}]}>
          <AppIcon name="alert-circle-outline" size={32} color={colors.danger} />
        </View>
      </Animated.View>
      <Text style={[styles.title, {color: colors.text}]}>{title ?? 'Something went wrong'}</Text>
      <Text style={[styles.message, {color: colors.textSecondary}]}>{message}</Text>
      {onRetry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          style={({pressed}) => [
            styles.button,
            {
              backgroundColor: colors.danger,
              borderRadius: radius.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={onRetry}>
          <Text style={[styles.buttonText, {color: colors.onPrimary}]}>Try Again</Text>
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
  iconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
