import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {navigateToPaywall} from '@presentation/navigation/paywall-navigation';

export type TrialBannerProps = {
  daysRemaining: number;
  totalTrialDays?: number;
  onDismiss?: () => void;
  testID?: string;
};

function bannerColor(days: number, colors: any): string {
  if (days <= 1) {
    return colors.danger;
  }
  if (days <= 3) {
    return colors.warning;
  }
  return colors.primary;
}

export const TrialBanner = React.memo(function TrialBanner({
  daysRemaining,
  totalTrialDays = 14,
  onDismiss,
  testID,
}: TrialBannerProps) {
  const {colors, radius, spacing} = useTheme();

  const accent = bannerColor(daysRemaining, colors);
  const progress = Math.max(
    0,
    Math.min(1, 1 - daysRemaining / totalTrialDays),
  );

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      testID={testID ?? 'trial-banner'}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${daysRemaining} days left in your Pro trial. Tap to upgrade.`}
        onPress={() => navigateToPaywall('trial_banner')}
        style={[
          styles.banner,
          {
            backgroundColor: `${accent}14`,
            borderColor: `${accent}33`,
            borderRadius: radius.md,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
          },
        ]}
      >
        <View style={styles.row}>
          <Icon name="clock-outline" size={18} color={accent} />
          <Text style={[styles.text, {color: accent, flex: 1}]}>
            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left in your Pro trial
          </Text>
          {onDismiss && (
            <Pressable
              accessibilityLabel="Dismiss trial banner"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onDismiss}
            >
              <Icon name="close" size={16} color={accent} />
            </Pressable>
          )}
        </View>

        <View style={[styles.progressTrack, {backgroundColor: `${accent}22`, borderRadius: 2}]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: accent,
                borderRadius: 2,
                width: `${Math.round(progress * 100)}%` as any,
              },
            ]}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  progressTrack: {
    height: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
  },
});
