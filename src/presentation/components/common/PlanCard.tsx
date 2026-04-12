import React, {useCallback} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from '@shared/theme';
import {ProBadge} from './ProBadge';

export type PlanCardProps = {
  tierLabel: string;
  price: string;
  periodLabel: string;
  features: string[];
  isRecommended?: boolean;
  isCurrentPlan?: boolean;
  onSelect: () => void;
  disabled?: boolean;
  loading?: boolean;
  savingsLabel?: string | null;
  testID?: string;
};

const PRESS_SCALE = 0.975;

export const PlanCard = React.memo(function PlanCard({
  tierLabel,
  price,
  periodLabel,
  features,
  isRecommended = false,
  isCurrentPlan = false,
  onSelect,
  disabled = false,
  loading = false,
  savingsLabel,
  testID,
}: PlanCardProps) {
  const {colors, spacing, radius, typography: typo} = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled || loading) {
      return;
    }
    scale.value = withSpring(PRESS_SCALE, {damping: 15, stiffness: 300});
  }, [disabled, loading, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {damping: 15, stiffness: 300});
  }, [scale]);

  const borderColor = isRecommended ? colors.primary : colors.borderLight;
  const borderWidth = isRecommended ? 2 : 1;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${tierLabel} plan, ${price} ${periodLabel}`}
        accessibilityState={{selected: isCurrentPlan, disabled}}
        disabled={disabled || loading}
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID ?? `plan-card-${tierLabel.toLowerCase()}`}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor,
            borderWidth,
            borderRadius: radius.lg,
            padding: spacing.base,
            opacity: disabled ? 0.5 : 1,
          },
        ]}>
        {isRecommended && (
          <View
            style={[
              styles.recommendedBadge,
              {
                backgroundColor: colors.primary,
                borderTopLeftRadius: radius.lg - 2,
                borderTopRightRadius: radius.lg - 2,
              },
            ]}>
            <Text style={styles.recommendedText}>RECOMMENDED</Text>
          </View>
        )}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[typo.headline, {color: colors.text}]}>
              {tierLabel}
            </Text>
            {isCurrentPlan && (
              <ProBadge tier="pro" size="small" />
            )}
          </View>
          {savingsLabel && (
            <View
              style={[
                styles.savingsBadge,
                {backgroundColor: colors.successLight, borderRadius: radius.xs},
              ]}>
              <Text
                style={[
                  styles.savingsText,
                  {color: colors.success},
                ]}>
                {savingsLabel}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.priceRow, {marginTop: spacing.sm}]}>
          <Text style={[typo.title2, {color: colors.text}]}>{price}</Text>
          <Text
            style={[
              typo.footnote,
              {color: colors.textSecondary, marginLeft: 4},
            ]}>
            {periodLabel}
          </Text>
        </View>

        <View style={[styles.features, {marginTop: spacing.md}]}>
          {features.map((feat) => (
            <View key={feat} style={styles.featureRow}>
              <Icon
                name="check-circle"
                size={16}
                color={colors.success}
              />
              <Text
                style={[
                  typo.footnote,
                  {color: colors.textSecondary, flex: 1, marginLeft: spacing.sm},
                ]}
                numberOfLines={2}>
                {feat}
              </Text>
            </View>
          ))}
        </View>

        {isCurrentPlan ? (
          <View
            style={[
              styles.ctaContainer,
              {
                marginTop: spacing.md,
                backgroundColor: colors.surfaceElevated,
                borderRadius: radius.sm,
              },
            ]}>
            <Text
              style={[
                typo.footnote,
                {color: colors.textSecondary, textAlign: 'center', fontWeight: '600'},
              ]}>
              Current Plan
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.ctaContainer,
              {
                marginTop: spacing.md,
                backgroundColor: isRecommended
                  ? colors.primary
                  : colors.surfaceElevated,
                borderRadius: radius.sm,
              },
            ]}>
            <Text
              style={[
                typo.footnote,
                {
                  color: isRecommended ? '#FFFFFF' : colors.text,
                  textAlign: 'center',
                  fontWeight: '600',
                },
              ]}>
              {loading ? 'Processing...' : 'Select Plan'}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    alignItems: 'center',
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  features: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
});
