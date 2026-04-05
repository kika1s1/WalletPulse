import React, {useMemo} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ColorValue,
} from 'react-native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {AppIcon} from '@presentation/components/common/AppIcon';

export type InsightType =
  | 'spending_change'
  | 'low_balance'
  | 'bills_due'
  | 'subscription_cost'
  | 'goal_progress'
  | 'unusual_transaction';

export type InsightCardProps = {
  type: InsightType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'alert';
  onPress?: () => void;
  onDismiss?: () => void;
};

const TYPE_ICON: Record<InsightType, string> = {
  spending_change: 'chart-bar',
  low_balance: 'alert-circle-outline',
  bills_due: 'calendar-clock',
  subscription_cost: 'sync-circle',
  goal_progress: 'target',
  unusual_transaction: 'alert-outline',
};

function hexWithAlpha(hex: string, alphaHex: string): string {
  if (hex.length === 7 && hex.startsWith('#')) {
    return `${hex}${alphaHex}`;
  }
  return hex;
}

export function InsightCard({
  type,
  title,
  message,
  severity,
  onPress,
  onDismiss,
}: InsightCardProps) {
  const {colors, radius, shadows, isDark} = useTheme();

  const accentColor = useMemo((): ColorValue => {
    switch (severity) {
      case 'warning':
        return colors.warning;
      case 'alert':
        return colors.danger;
      default:
        return colors.primary;
    }
  }, [colors.danger, colors.primary, colors.warning, severity]);

  const tintBackground = useMemo((): ColorValue => {
    switch (severity) {
      case 'warning':
        return colors.warningLight;
      case 'alert':
        return colors.dangerLight;
      default:
        return hexWithAlpha(colors.primary, isDark ? '22' : '14');
    }
  }, [colors.dangerLight, colors.primary, colors.warningLight, isDark, severity]);

  const content = (
    <View style={styles.fill}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.accentBar, {backgroundColor: accentColor}]}
      />
      <View style={styles.inner}>
        <AppIcon name={TYPE_ICON[type]} size={22} color={accentColor as string} />
        <View style={styles.textBlock}>
          <Text
            numberOfLines={2}
            style={[styles.title, {color: colors.text}]}>
            {title}
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.message, {color: colors.textSecondary}]}>
            {message}
          </Text>
        </View>
        {onDismiss ? (
          <TouchableOpacity
            accessibilityLabel="Dismiss insight"
            accessibilityRole="button"
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            onPress={onDismiss}
            style={styles.dismissBtn}>
            <Text style={[styles.dismissIcon, {color: colors.textSecondary}]}>×</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.dismissPlaceholder} />
        )}
      </View>
    </View>
  );

  const cardStyle = [
    styles.card,
    {
      backgroundColor: tintBackground,
      borderColor: colors.borderLight,
      borderRadius: radius.lg,
    },
    shadows.sm,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({pressed}) => [cardStyle, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  fill: {
    position: 'relative',
    width: '100%',
  },
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
  emoji: {
    fontSize: 22,
    lineHeight: 26,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  message: {
    fontSize: 13,
    marginTop: 4,
  },
  dismissBtn: {
    marginLeft: 4,
    marginTop: -4,
    padding: 4,
  },
  dismissIcon: {
    fontSize: 22,
    fontWeight: fontWeight.medium,
    lineHeight: 22,
  },
  dismissPlaceholder: {
    width: 30,
  },
});
