import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {ProBadge} from './ProBadge';

export type UpgradeInsightCardProps = {
  title: string;
  description: string;
  ctaText?: string;
  onPress: () => void;
  tier?: 'pro' | 'business';
  icon?: string;
  testID?: string;
};

export const UpgradeInsightCard = React.memo(function UpgradeInsightCard({
  title,
  description,
  ctaText = 'See Plans',
  onPress,
  tier = 'pro',
  icon = 'star-outline',
  testID,
}: UpgradeInsightCardProps) {
  const {colors, radius, shadows, isDark} = useTheme();

  const bgColor = isDark ? `${colors.primary}18` : `${colors.primary}0C`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${ctaText}`}
      onPress={onPress}
      testID={testID ?? 'upgrade-insight-card'}
      style={({pressed}) => [
        styles.card,
        {
          backgroundColor: bgColor,
          borderColor: `${colors.primary}33`,
          borderRadius: radius.lg,
        },
        shadows.sm,
        pressed && styles.pressed,
      ]}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.accentBar, {backgroundColor: colors.primary}]}
      />
      <View style={styles.inner}>
        <AppIcon name={icon} size={22} color={colors.primary} />
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text
              numberOfLines={2}
              style={[styles.title, {color: colors.text, flex: 1}]}>
              {title}
            </Text>
            <ProBadge tier={tier} size="small" />
          </View>
          <Text
            numberOfLines={2}
            style={[styles.message, {color: colors.textSecondary}]}>
            {description}
          </Text>
          <Text style={[styles.cta, {color: colors.primary}]}>
            {ctaText} →
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  pressed: {
    opacity: 0.92,
  },
  accentBar: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingLeft: 4 + 12,
    paddingRight: 12,
    paddingVertical: 14,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  message: {
    fontSize: 13,
    marginTop: 4,
  },
  cta: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    marginTop: 6,
  },
});
