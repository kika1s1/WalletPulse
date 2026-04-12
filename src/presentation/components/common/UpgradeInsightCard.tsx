import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInUp} from 'react-native-reanimated';
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
  ctaText = 'See Plans \u2192',
  onPress,
  tier = 'pro',
  icon = 'crown-outline',
  testID,
}: UpgradeInsightCardProps) {
  const {colors, radius, spacing, isDark} = useTheme();

  const iconBg = isDark ? `${colors.primary}25` : `${colors.primary}14`;

  return (
    <Animated.View entering={FadeInUp.duration(300).springify()}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${ctaText}`}
        onPress={onPress}
        testID={testID ?? 'upgrade-insight-card'}
        style={({pressed}) => [
          styles.card,
          {
            backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
            borderColor: isDark ? colors.border : colors.borderLight,
            borderRadius: radius.lg,
          },
          pressed && styles.pressed,
        ]}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.accentBar,
            {
              backgroundColor: colors.primary,
              borderTopLeftRadius: radius.lg,
              borderBottomLeftRadius: radius.lg,
            },
          ]}
        />

        <View style={[styles.inner, {padding: spacing.base}]}>
          <View style={[styles.iconCircle, {backgroundColor: iconBg}]}>
            <AppIcon name={icon} size={20} color={colors.primary} />
          </View>

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
              numberOfLines={3}
              style={[styles.message, {color: colors.textSecondary}]}>
              {description}
            </Text>

            <Text style={[styles.ctaText, {color: colors.primary}]}>
              {ctaText}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
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
    transform: [{scale: 0.985}],
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
    paddingLeft: 4 + 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
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
    fontSize: 15,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    marginTop: 8,
  },
});
