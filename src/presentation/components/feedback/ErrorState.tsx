import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useTheme} from '@shared/theme';

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({message, onRetry}: Props) {
  const {colors, radius} = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, {backgroundColor: colors.dangerLight, borderRadius: radius.lg}]}>
        <Text style={styles.icon}>⚠️</Text>
      </View>
      <Text style={[styles.title, {color: colors.text}]}>Something went wrong</Text>
      <Text style={[styles.message, {color: colors.textSecondary}]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.button, {backgroundColor: colors.danger, borderRadius: radius.md}]}
          onPress={onRetry}
          activeOpacity={0.8}>
          <Text style={styles.buttonText}>Try Again</Text>
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
  iconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
