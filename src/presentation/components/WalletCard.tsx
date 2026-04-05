import React, {useCallback, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmount} from '@shared/utils/format-currency';
import {AppIcon, resolveIconName} from '@presentation/components/common/AppIcon';

export type WalletCardProps = {
  id: string;
  name: string;
  balance: number;
  currency: string;
  icon: string;
  color: string;
  isActive: boolean;
  onPress?: (id: string) => void;
  compact?: boolean;
  testID?: string;
};

const PRESS_SPRING = {damping: 22, stiffness: 360};
const PRESS_SCALE = 0.97;

function hexWithAlpha(hex: string, alpha: string): string {
  const clean = hex.replace(/^#/, '');
  if (clean.length === 6) {
    return `#${clean}${alpha}`;
  }
  return hex;
}

export function WalletCard({
  id,
  name,
  balance,
  currency,
  icon,
  color,
  isActive,
  onPress,
  compact = false,
  testID,
}: WalletCardProps) {
  const {colors, radius, shadows, spacing, typography} = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(PRESS_SCALE, PRESS_SPRING);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_SPRING);
  }, [scale]);

  const handlePress = useCallback(() => {
    onPress?.(id);
  }, [id, onPress]);

  const balanceLabel = useMemo(
    () => formatAmount(balance, currency),
    [balance, currency],
  );

  const isNegative = balance < 0;
  const balanceColor = isNegative ? colors.danger : colors.text;
  const tintBg = hexWithAlpha(color, '1A');
  const opacityStyle = isActive ? undefined : styles.inactive;

  if (compact) {
    return (
      <Animated.View style={animatedStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name} wallet, balance ${balanceLabel}`}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.compactCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderLight,
              borderRadius: radius.lg,
            },
            shadows.sm,
            opacityStyle,
          ]}
          testID={testID}>
          <View style={[styles.iconCircle, {backgroundColor: tintBg}]}>
            <AppIcon name={resolveIconName(icon)} size={16} color={color} />
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.compactName,
              {color: colors.text, fontSize: typography.footnote.fontSize},
            ]}>
            {name}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.compactBalance,
              {
                color: balanceColor,
                fontSize: typography.callout.fontSize,
                fontWeight: fontWeight.semibold,
              },
            ]}>
            {balanceLabel}
          </Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} wallet, balance ${balanceLabel}, ${isActive ? 'active' : 'inactive'}`}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.borderLight,
            borderRadius: radius.xl,
            paddingVertical: spacing.base,
            paddingHorizontal: spacing.base,
          },
          shadows.sm,
          opacityStyle,
        ]}
        testID={testID}>
        <View style={styles.topRow}>
          <View style={[styles.iconCircleLg, {backgroundColor: tintBg}]}>
            <AppIcon name={resolveIconName(icon)} size={22} color={color} />
          </View>
          <View style={styles.nameBlock}>
            <Text
              numberOfLines={1}
              style={[
                styles.walletName,
                {color: colors.text, fontWeight: fontWeight.semibold},
              ]}>
              {name}
            </Text>
            <Text
              style={[styles.currencyLabel, {color: colors.textSecondary}]}>
              {currency}
            </Text>
          </View>
          {!isActive && (
            <View
              style={[
                styles.inactiveBadge,
                {
                  backgroundColor: colors.warningLight,
                  borderRadius: radius.sm,
                },
              ]}>
              <Text
                style={[styles.inactiveBadgeText, {color: colors.warning}]}>
                Inactive
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.balanceText,
            {
              color: balanceColor,
              marginTop: spacing.sm,
            },
          ]}
          numberOfLines={1}>
          {balanceLabel}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  compactCard: {
    borderWidth: 1,
    padding: 14,
    width: 150,
    alignItems: 'center',
    gap: 8,
  },
  inactive: {
    opacity: 0.6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleLg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  iconTextLg: {
    fontSize: 20,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  walletName: {
    fontSize: 16,
    lineHeight: 20,
  },
  currencyLabel: {
    fontSize: 13,
    lineHeight: 16,
    marginTop: 2,
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  compactName: {
    textAlign: 'center',
  },
  compactBalance: {
    textAlign: 'center',
  },
});
