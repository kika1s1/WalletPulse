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
  ctaText = 'See Plans',
  onPress,
  tier = 'pro',
  icon = 'star-outline',
  testID,
}: UpgradeInsightCardProps) {
  const {colors, radius, shadows, spacing, isDark} = useTheme();

  const bgColor = isDark ? `${colors.primary}1F` : `${colors.primary}12`;
  const iconBg = isDark ? `${colors.primary}30` : `${colors.primary}1A`;
  const ctaBg = isDark ? `${colors.primary}28` : `${colors.primary}18`;

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
            backgroundColor: bgColor,
            borderColor: `${colors.primary}28`,
            borderRadius: radius.lg,
          },
          shadows.md,
          pressed && styles.pressed,
        ]}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.accentBar,
            {backgroundColor: colors.primary, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg},
          ]}
        />

        <View style={[styles.inner, {paddingHorizontal: spacing.base, paddingVertical: spacing.base}]}>
          <View style={[styles.iconCircle, {backgroundColor: iconBg, borderRadius: radius.full}]}>
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

            <View
              style={[
                styles.ctaPill,
                {backgroundColor: ctaBg, borderRadius: radius.sm},
              ]}>
              <Text style={[styles.ctaText, {color: colors.primary}]}>
                {ctaText}
              </Text>
              <AppIcon name="arrow-right" size={14} color={colors.primary} />
            </View>
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
    opacity: 0.88,
    transform: [{scale: 0.985}],
  },
  accentBar: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 5,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingLeft: 5 + 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
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
    fontWeight: fontWeight.bold,
    lineHeight: 20,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
});
