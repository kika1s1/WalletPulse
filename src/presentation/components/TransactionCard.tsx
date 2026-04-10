import React, {useCallback, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatRelativeDate} from '@shared/utils/date-helpers';
import {formatAmount} from '@shared/utils/format-currency';
import {parseWalletTransferMeta} from '@domain/value-objects/WalletTransferNotes';
import {SwipeableRow, type SwipeAction} from './common/SwipeableRow';
import {AppIcon, resolveIconName} from './common/AppIcon';

const PRESS_SPRING = {damping: 22, stiffness: 360};
const PRESS_SCALE = 0.988;

export type TransactionCardProps = {
  id: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  description: string;
  merchant: string;
  transactionDate: number;
  source: string;
  notes?: string;
  convertedLabel?: string;
  onPress?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  hideAmounts?: boolean;
  testID?: string;
};

function formatSignedAmount(
  type: 'income' | 'expense' | 'transfer',
  amountCents: number,
  currency: string,
  notes?: string,
): string {
  const abs = Math.abs(amountCents);
  const core = formatAmount(abs, currency).replace(/^[+-]/u, '').trim();
  if (type === 'income') {
    return `+${core}`;
  }
  if (type === 'expense') {
    return `-${core}`;
  }
  const meta = notes ? parseWalletTransferMeta(notes) : null;
  if (meta?.leg === 'destination') {
    return `+${core}`;
  }
  return `-${core}`;
}

function formatSourceBadge(source: string): string {
  return source
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function hexToRgba15(hex: string): string {
  const normalized = hex.replace(/^#/u, '');
  if (normalized.length === 6) {
    return `#${normalized}26`;
  }
  if (normalized.length === 8) {
    return `#${normalized.slice(0, 6)}26`;
  }
  return hex;
}

export const TransactionCard = React.memo(function TransactionCard({
  id,
  amount,
  currency,
  type,
  categoryName,
  categoryIcon,
  categoryColor,
  description,
  merchant,
  transactionDate,
  source,
  notes,
  convertedLabel,
  onPress,
  onEdit,
  onDelete,
  hideAmounts = false,
  testID,
}: TransactionCardProps) {
  const {colors, spacing, radius, typography} = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = useCallback(() => {
    if (!onPress) {
      return;
    }
    scale.value = withSpring(PRESS_SCALE, PRESS_SPRING);
  }, [onPress, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_SPRING);
  }, [scale]);

  const handlePress = useCallback(() => {
    onPress?.(id);
  }, [id, onPress]);

  const rightActions = useMemo((): SwipeAction[] => {
    const actions: SwipeAction[] = [];
    if (onEdit) {
      actions.push({
        label: 'Edit',
        color: colors.primary,
        onPress: () => onEdit(id),
      });
    }
    if (onDelete) {
      actions.push({
        label: 'Delete',
        color: colors.danger,
        onPress: () => onDelete(id),
      });
    }
    return actions;
  }, [colors.danger, colors.primary, id, onDelete, onEdit]);

  const titleText = description.trim() || merchant.trim() || 'Transaction';
  const subtitleText = `${categoryName} · ${formatRelativeDate(transactionDate)}`;
  const signedAmount = hideAmounts ? '••••' : formatSignedAmount(type, amount, currency, notes);
  const amountColor =
    type === 'income'
      ? colors.income
      : type === 'expense'
        ? colors.expense
        : colors.transfer;

  const iconBackground = hexToRgba15(categoryColor);

  const body = (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        disabled={!onPress}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.row,
          {
            backgroundColor: colors.card,
            borderRadius: radius.md,
            borderColor: colors.borderLight,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.base,
          },
        ]}
        testID={testID ? `${testID}-pressable` : undefined}>
        <View style={[styles.categoryIcon, {backgroundColor: iconBackground}]}>
          <AppIcon name={resolveIconName(categoryIcon)} size={20} color={categoryColor} />
        </View>

        <View style={styles.middle}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: typography.body.fontSize,
                fontWeight: fontWeight.medium,
              },
            ]}>
            {titleText}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
                fontSize: typography.footnote.fontSize,
                fontWeight: typography.footnote.fontWeight,
              },
            ]}>
            {subtitleText}
          </Text>
        </View>

        <View style={styles.right}>
          <Text
            numberOfLines={1}
            style={[
              styles.amount,
              {
                color: amountColor,
                fontSize: typography.callout.fontSize,
                fontWeight: fontWeight.semibold,
              },
            ]}>
            {signedAmount}
          </Text>
          {convertedLabel ? (
            <Text
              numberOfLines={1}
              style={[
                styles.sourceBadge,
                {
                  color: colors.textTertiary,
                  fontSize: typography.caption.fontSize,
                  fontWeight: typography.caption.fontWeight,
                },
              ]}>
              {convertedLabel}
            </Text>
          ) : source !== 'manual' ? (
            <Text
              numberOfLines={1}
              style={[
                styles.sourceBadge,
                {
                  color: colors.textTertiary,
                  fontSize: typography.caption.fontSize,
                  fontWeight: typography.caption.fontWeight,
                },
              ]}>
              {formatSourceBadge(source)}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <SwipeableRow
      rightActions={rightActions.length > 0 ? rightActions : undefined}
      testID={testID}>
      {body}
    </SwipeableRow>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconText: {
    fontSize: 18,
    textAlign: 'center',
  },
  middle: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    lineHeight: 20,
  },
  subtitle: {
    lineHeight: 18,
  },
  right: {
    alignItems: 'flex-end',
    maxWidth: '42%',
    gap: 2,
  },
  amount: {
    textAlign: 'right',
    lineHeight: 22,
  },
  sourceBadge: {
    textAlign: 'right',
    lineHeight: 13,
  },
});
