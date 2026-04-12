import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@shared/theme';

export type ProBadgeProps = {
  tier: 'pro' | 'business';
  size?: 'small' | 'medium';
};

export const ProBadge = React.memo(function ProBadge({
  tier,
  size = 'small',
}: ProBadgeProps) {
  const {colors, radius} = useTheme();

  const label = tier === 'business' ? 'BUSINESS' : 'PRO';
  const isSmall = size === 'small';

  return (
    <View
      accessible
      accessibilityLabel={`${label} badge`}
      accessibilityRole="text"
      style={[
        styles.badge,
        {
          backgroundColor: colors.primary,
          borderRadius: radius.xs,
          paddingHorizontal: isSmall ? 5 : 8,
          paddingVertical: isSmall ? 1 : 2,
        },
      ]}>
      <Text
        style={[
          styles.label,
          {fontSize: isSmall ? 9 : 11},
        ]}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
