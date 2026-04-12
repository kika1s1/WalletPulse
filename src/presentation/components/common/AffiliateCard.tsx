import React, {useCallback} from 'react';
import {Linking, Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {AffiliatePartner} from '@shared/constants/affiliate-links';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';

export type AffiliateCardProps = {
  partner: AffiliatePartner;
  context: string;
  onDismiss: () => void;
  onLearnMore?: () => void;
  testID?: string;
};

export const AffiliateCard = React.memo(function AffiliateCard({
  partner,
  context,
  onDismiss,
  onLearnMore,
  testID,
}: AffiliateCardProps) {
  const {colors, radius, spacing, typography: typo} = useTheme();

  const handleLearnMore = useCallback(() => {
    if (onLearnMore) {
      onLearnMore();
    }
    Linking.openURL(partner.referralUrl).catch(() => {});
  }, [onLearnMore, partner.referralUrl]);

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      testID={testID ?? 'affiliate-card'}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.borderLight,
            borderRadius: radius.lg,
            padding: spacing.base,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.label, {color: colors.textTertiary}]}>
            Partner suggestion
          </Text>
          <TouchableOpacity
            accessibilityLabel="Dismiss suggestion"
            accessibilityRole="button"
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            onPress={onDismiss}
          >
            <Icon name="close" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View
            style={[
              styles.iconCircle,
              {backgroundColor: `${colors.primary}14`},
            ]}
          >
            <Icon name={partner.icon} size={22} color={colors.primary} />
          </View>
          <View style={styles.textBlock}>
            <Text style={[styles.name, {color: colors.text}]} numberOfLines={1}>
              {partner.name}
            </Text>
            <Text
              style={[typo.caption, {color: colors.textSecondary}]}
              numberOfLines={2}
            >
              {context}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Learn more about ${partner.name}`}
          onPress={handleLearnMore}
          style={({pressed}) => [
            styles.cta,
            {
              backgroundColor: `${colors.primary}0F`,
              borderRadius: radius.sm,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.ctaText, {color: colors.primary}]}>
            Learn More
          </Text>
          <Icon name="open-in-new" size={14} color={colors.primary} />
        </Pressable>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
});
