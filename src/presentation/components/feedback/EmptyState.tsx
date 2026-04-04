import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useTheme} from '@shared/theme';

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({title, message, actionLabel, onAction}: Props) {
  const {colors, spacing, radius} = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.icon]}>📭</Text>
      <Text style={[styles.title, {color: colors.text}]}>{title}</Text>
      <Text style={[styles.message, {color: colors.textSecondary}]}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[
            styles.button,
            {backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl},
          ]}
          onPress={onAction}
          activeOpacity={0.8}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
